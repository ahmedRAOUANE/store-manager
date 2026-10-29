import { createHash } from "node:crypto";

import {
    createPipeline,
    maxSize,
    type PipelineFile,
} from "media-pipeline";

import { AppError } from "@/errors/base.error";
import { DatabaseError } from "@/errors/db.error";
import { ValidationError } from "@/errors/validation.error";
import { db, models } from "@/prisma/db";
import { ManifestSchema, type Manifest } from "@store-manager/extensions";
import { R2ArtifactStore, R2StorageError } from "@/lib/storage/r2Storage";
import { inspectZip } from "@/utils/zip-extract";

/**
 * Hard cap on submitted artifact size. Matches Vercel's Hobby plan
 * function-body limit — the store cannot receive larger payloads over
 * the wire. `inspectZip` and the pipeline's `maxSize` validator both
 * enforce limits again; this is the outermost guard, cheap enough to
 * run first.
 */
const MAX_ARTIFACT_BYTES = 4.5 * 1024 * 1024;

export interface SubmitExtensionInput {
    readonly buffer: Buffer;
    readonly filename: string;
    readonly submittedById: string;
}

export interface SubmissionResult {
    readonly versionId: string;
    readonly extensionId: string;
    readonly version: string;
    readonly artifactUrl: string;
    readonly artifactChecksum: string;
}

/**
 * Ingest a store submission.
 *
 * Flow (per C1 plan):
 *   1. Size guard — reject before any expensive work
 *   2. Zip inspection — parse entries, reject unsafe names
 *   3. Manifest extraction — read + validate against ManifestSchema
 *   4. Duplicate check — reject if (extensionId, version) already exists
 *   5. R2 upload — via media-pipeline (validators + trace)
 *   6. DB write — Extension upsert + ExtensionVersion create
 *
 * Error model matches the codebase convention:
 *   - `ValidationError` / `AppError` returned for expected user errors
 *   - `R2StorageError` thrown for unexpected R2 failures
 *   - `DatabaseError` thrown for unexpected DB failures
 *
 * Orphaned R2 objects (R2 succeeds, DB fails) are acknowledged per
 * media-pipeline's integration guide §12 — cleanup job deferred.
 */
export async function submitExtensionService(
    input: SubmitExtensionInput,
    store: R2ArtifactStore,
): Promise<SubmissionResult | AppError> {
    // ── 1. Size guard ──────────────────────────────────────────────
    if (input.buffer.byteLength === 0) {
        return new ValidationError("artifact is empty");
    }
    if (input.buffer.byteLength > MAX_ARTIFACT_BYTES) {
        return new ValidationError(
            `artifact exceeds ${MAX_ARTIFACT_BYTES} bytes ` +
            `(received ${input.buffer.byteLength})`,
        );
    }

    // ── 2. Zip inspection ──────────────────────────────────────────
    let zip;
    try {
        zip = await inspectZip(input.buffer);
    } catch (err) {
        if (err instanceof ValidationError) return err;
        throw err;
    }

    let manifest: Manifest;
    try {
        // ── 3. Manifest extraction + validation ────────────────────
        let manifestBytes: Buffer;
        try {
            manifestBytes = await zip.readFile("manifest.json");
        } catch (err) {
            if (err instanceof ValidationError) {
                return new ValidationError(
                    "artifact is missing manifest.json at the root",
                );
            }
            throw err;
        }

        let parsedJson: unknown;
        try {
            parsedJson = JSON.parse(manifestBytes.toString("utf-8"));
        } catch {
            return new ValidationError(
                "manifest.json is not valid JSON",
            );
        }

        const parsedManifest = ManifestSchema.safeParse(parsedJson);
        if (!parsedManifest.success) {
            return new ValidationError(
                `invalid manifest: ${parsedManifest.error.message}`,
            );
        }
        manifest = parsedManifest.data;
    } finally {
        // The zip handle must be released regardless of outcome.
        zip.close();
    }

    // ── 4. Checksum ────────────────────────────────────────────────
    const checksum =
        "sha256:" +
        createHash("sha256").update(input.buffer).digest("hex");

    // ── 5. Duplicate check (bandwidth optimization) ────────────────
    // The unique constraint on ExtensionVersion catches the race at
    // write time; this pre-check avoids wasting R2 bandwidth on a
    // duplicate that will fail anyway.
    const existing = await models.ExtensionVersion
        .where({
            extensionId: manifest.id,
            version: manifest.version,
        })
        .first();
    if (existing) {
        return new AppError(
            `version ${manifest.version} of "${manifest.id}" already exists`,
        );
    }

    // ── 6. R2 upload via media-pipeline ────────────────────────────
    const key = `${manifest.id}/${manifest.version}.zip`;
    const pipeline = createPipeline({
        storage: store,
        validators: [maxSize(MAX_ARTIFACT_BYTES)],
    });

    const pipelineFile: PipelineFile = {
        buffer: input.buffer,
        filename: key,
        mimeType: "application/zip",
        size: input.buffer.byteLength,
    };

    let pipelineResult;
    try {
        pipelineResult = await pipeline.process(pipelineFile);
    } catch (err) {
        if (err instanceof R2StorageError) {
            console.error(
                "services/storeIngestion.services.ts > submitExtensionService > R2 upload failed:",
                err,
            );
            throw err;
        }
        // media-pipeline errors (VALIDATION_ERROR, PROCESSOR_ERROR,
        // PLUGIN_ERROR) all surface here. Translate to our
        // ValidationError for user-facing behavior.
        return new ValidationError(
            `artifact pipeline rejected the file: ${(err as Error).message}`,
        );
    }

    // ── 7. DB write ────────────────────────────────────────────────
    try {
        const createdVersion = await db.transaction(async (tx) => {
            // Upsert Extension (catalog entry).
            const existingExt = await tx.orm.public.Extension
                .where({ id: manifest.id })
                .first();

            if (!existingExt) {
                await tx.orm.public.Extension.create({
                    id: manifest.id,
                    name: manifest.name,
                    description: manifest.description ?? null,
                    authorName: manifest.author.name,
                });
            }

            // Serialize the manifest for JSON storage — normalizes
            // any Zod-specific shape and guarantees a plain value.
            // const manifestForDb = JSON.parse(
            //     JSON.stringify(manifest),
            // ) as Record<string, unknown>;

            return await tx.orm.public.ExtensionVersion.create({
                extensionId: manifest.id,
                version: manifest.version,
                // manifest: JSON.stringify(manifestForDb),
                manifest: manifest,
                // Placeholder until C6 wires the loader for R2.
                // Per media-pipeline guide §4.1, `url` is opaque —
                // persist as a string, never parse.
                artifactPath: pipelineResult.url,
                artifactUrl: pipelineResult.url,
                artifactChecksum: checksum,
                status: "pending",
                submittedById: input.submittedById,
            });
        });

        return {
            versionId: createdVersion.id,
            extensionId: manifest.id,
            version: manifest.version,
            artifactUrl: pipelineResult.url,
            artifactChecksum: checksum,
        };
    } catch (err) {
        // Orphan R2 object — accepted per media-pipeline guide §12.
        // A cleanup job will sweep these once the store is live.
        console.error(
            "services/storeIngestion.services.ts > submitExtensionService > DB write failed (R2 orphan left at " +
            `${key}):`,
            err,
        );

        if (err instanceof AppError) throw err;
        throw new DatabaseError(
            "unable to record extension submission",
            err as Record<string, unknown>,
        );
    }
}