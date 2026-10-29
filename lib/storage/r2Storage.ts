// SERVER-ONLY: this file imports `@aws-sdk/client-s3`, which requires
// Node APIs (crypto, stream). Never import it from a client component
// or an edge runtime route.
//
// Structural note: this adapter intentionally does NOT import from
// `media-pipeline`. The `Storage` contract is fixed at
// `{ save(file): Promise<PipelineResult> }`, and our class satisfies it
// structurally. When `media-pipeline` is installed, add:
//
//   declare module "media-pipeline" {
//       interface PipelineProviders { r2: "r2"; }
//   }
//
// and the adapter plugs into `createPipeline({ storage })` with zero
// changes to this file.

import {
    DeleteObjectCommand,
    GetObjectCommand,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";

import { AppError } from "@/errors/base.error";

/* ==========================================================================
 * Structural types — mirrors media-pipeline@1.7.0's contract
 * ========================================================================== */

/**
 * The file shape the pipeline hands to `save`.
 *
 * Matches `media-pipeline`'s `PipelineFile` exactly (see the library's
 * integration guide §2). Structural typing means this file's version
 * is assignable to the library's version, and vice versa, without
 * either side importing the other.
 */
export interface PipelineFile {
    readonly buffer: Buffer;
    readonly filename: string;
    readonly mimeType: string;
    readonly size: number;
}

/**
 * The result shape `save` must return.
 *
 * Matches `media-pipeline`'s `PipelineResult` from §4 of the guide.
 * `provider` is a string literal — `"r2"` — so it satisfies
 * `media-pipeline`'s `PipelineProvider` union *once that union is
 * augmented with `"r2"`* (see the header note). Without augmentation,
 * the union doesn't include `"r2"` and the assignment would fail — but
 * that only matters when we import `media-pipeline`'s types, which we
 * don't here.
 */
export interface PipelineResult {
    readonly url: string;
    readonly path: string;
    readonly size: number;
    readonly metadata: Record<string, unknown>;
    readonly meta: {
        readonly plugins: Array<{ name: string; version?: string }>;
        readonly trace: Array<{
            plugin: string;
            stage: "validator" | "processor" | "hook" | "storage";
            message: string;
            timestamp: number;
            duration?: number;
        }>;
    };
    readonly originalName: string;
    readonly storedName: string;
    readonly mimeType: string;
    readonly provider: "r2";
}

/**
 * The store interface the ingestion service depends on.
 *
 * `save` satisfies `media-pipeline`'s `Storage` structurally. `read`
 * and `delete` are our additions — the library explicitly refuses to
 * own them (see guide §5).
 */
export interface ArtifactStore {
    save(file: PipelineFile): Promise<PipelineResult>;
    read(key: string): Promise<Buffer>;
    delete(key: string): Promise<void>;
}

/* ==========================================================================
 * Errors
 * ========================================================================== */

/**
 * Wraps any S3 SDK failure so the caller has a stable error surface.
 *
 * Extends `AppError` to fit the codebase's error hierarchy. When the
 * ingestion service integrates with `media-pipeline`, its route
 * handler will branch on both `R2StorageError` and
 * `PipelineError` (media-pipeline's own hierarchy) — two `instanceof`
 * checks, no inheritance gymnastics.
 *
 * The alternative — throwing `media-pipeline`'s `StorageError` — would
 * require importing the library just for the error class. That's a
 * bigger coupling than the value it adds, so we ship our own and the
 * caller checks both.
 */
export class R2StorageError extends AppError {
    /**
     * Declared explicitly (rather than relying on `Error.cause` from
     * `es2022.error`) so `(err as R2StorageError).cause` typechecks in
     * every editor. `readonly` because cause is captured at construction
     * time and must not be reassigned afterward.
     */
    readonly cause?: Record<string, unknown>;

    constructor(message: string, cause?: Record<string, unknown>) {
        super(message, 500, "R2_STORAGE_ERROR");
        this.cause = cause;
    }
}

/* ==========================================================================
 * Adapter
 * ========================================================================== */

export interface R2ArtifactStoreConfig {
    /**
     * A pre-configured S3Client (or S3-compatible). Pass in — don't
     * create inside the class — so callers can share a client across
     * multiple stores, and so tests can pass a hand-crafted mock.
     */
    readonly client: S3Client;
    /** The R2 bucket name. */
    readonly bucket: string;
    /**
     * Optional public URL prefix used to build `PipelineResult.url`.
     * E.g. `"https://cdn.example.com/artifacts"` →
     * `"https://cdn.example.com/artifacts/<key>"`.
     *
     * If omitted, `url` defaults to `r2://<bucket>/<key>` — an opaque
     * identifier for internal use. Never parse `url` or `path` (see
     * the library's guide §4.1).
     */
    readonly publicUrlBase?: string;
}

/**
 * Cloudflare R2 artifact store. One class, two interfaces:
 *
 *   - `save(file)` — satisfies `media-pipeline`'s `Storage` contract.
 *   - `read(key)`, `delete(key)` — our own `ArtifactStore` additions.
 *
 * The adapter uses `file.filename` verbatim as the R2 object key. Key
 * derivation (e.g. `${extensionId}/${version}.zip`) is the caller's
 * job — via a `media-pipeline` processor once `media-pipeline` is
 * integrated, or via a service-level helper before that.
 */
export class R2ArtifactStore implements ArtifactStore {
    private readonly client: S3Client;
    private readonly bucket: string;
    private readonly publicUrlBase: string;

    constructor(config: R2ArtifactStoreConfig) {
        this.client = config.client;
        this.bucket = config.bucket;
        this.publicUrlBase =
            config.publicUrlBase ?? `r2://${config.bucket}`;
    }

    async save(file: PipelineFile): Promise<PipelineResult> {
        try {
            await this.client.send(
                new PutObjectCommand({
                    Bucket: this.bucket,
                    Key: file.filename,
                    Body: file.buffer,
                    ContentType: file.mimeType,
                    ContentLength: file.size,
                }),
            );
        } catch (err) {
            throw new R2StorageError(
                `Failed to save artifact "${file.filename}"`,
                {
                    backend: "r2",
                    bucket: this.bucket,
                    key: file.filename,
                    errorName: (err as Error)?.name,
                    errorMessage: (err as Error)?.message,
                },
            );
        }

        return {
            // `url` and `path` are opaque — see the library guide §4.1.
            // Never parse either; treat them as stable identifiers.
            url: `${this.publicUrlBase}/${file.filename}`,
            path: file.filename,
            size: file.size,
            metadata: {},
            // The pipeline's executor overwrites `meta` with the real
            // trace. We return an empty one for structural completeness;
            // it will be discarded when called via `media-pipeline`.
            meta: { plugins: [], trace: [] },
            // `originalName` is "filename at save time" per the guide
            // §4.2. If a processor renames `file.filename` before this
            // adapter runs, this reflects the mutated name — the
            // ingestion service is responsible for stashing the
            // original into `ctx.metadata` before any rename.
            originalName: file.filename,
            storedName: file.filename,
            mimeType: file.mimeType,
            provider: "r2",
        };
    }

    async read(key: string): Promise<Buffer> {
        try {
            const response = await this.client.send(
                new GetObjectCommand({
                    Bucket: this.bucket,
                    Key: key,
                }),
            );

            if (!response.Body) {
                throw new R2StorageError(
                    `R2 object "${key}" has no body`,
                    { backend: "r2", bucket: this.bucket, key },
                );
            }

            // In the Node.js runtime, Body is a Readable stream. We
            // type it as `AsyncIterable<Buffer | Uint8Array | string>`
            // because `NodeJS.ReadableStream` doesn't declare
            // `[Symbol.asyncIterator]` in @types/node — without the
            // explicit cast, `for await` falls back to a type that
            // tsc narrows to `string`, breaking the `Buffer.from`
            // call. The union also handles the SDK's "web" stream
            // variant (Uint8Array chunks) if it ever reaches us.
            const stream = response.Body as AsyncIterable<
                Buffer | Uint8Array | string
            >;
            const chunks: Buffer[] = [];
            for await (const chunk of stream) {
                if (Buffer.isBuffer(chunk)) {
                    chunks.push(chunk);
                } else if (typeof chunk === "string") {
                    chunks.push(Buffer.from(chunk, "utf-8"));
                } else {
                    chunks.push(Buffer.from(chunk));
                }
            }
            return Buffer.concat(chunks);
        } catch (err) {
            if (err instanceof R2StorageError) throw err;
            throw new R2StorageError(
                `Failed to read artifact "${key}"`,
                {
                    backend: "r2",
                    bucket: this.bucket,
                    key,
                    errorName: (err as Error)?.name,
                    errorMessage: (err as Error)?.message,
                },
            );
        }
    }

    async delete(key: string): Promise<void> {
        try {
            await this.client.send(
                new DeleteObjectCommand({
                    Bucket: this.bucket,
                    Key: key,
                }),
            );
        } catch (err) {
            throw new R2StorageError(
                `Failed to delete artifact "${key}"`,
                {
                    backend: "r2",
                    bucket: this.bucket,
                    key,
                    errorName: (err as Error)?.name,
                    errorMessage: (err as Error)?.message,
                },
            );
        }
    }
}