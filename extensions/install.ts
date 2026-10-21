import { createHash } from "node:crypto";
import { cpSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { db, models } from "@/prisma/db";
import { isUuid } from "@/utils/uuid";

import { ManifestSchema, type Manifest } from "./runner/manifest";
import { isExtensionExportedDefault } from "./runner/validation";

type InstallScope = "user" | "store" | "admin";

interface InstallOptions {
    /** Path to the fixture directory (contains manifest.json + index.js). */
    sourcePath: string;
    /** Must match manifest.scope. */
    scope: InstallScope;
    /** User ID for user/admin scope, store ID for store scope. */
    scopeId: string;
    /** User performing the install. Must satisfy manifest eligibility. */
    installedByUserId: string;
}

interface InstallResult {
    installId: string;
    artifactPath: string;
    artifactChecksum: string;
}

/**
 * Install an extension from a local fixture directory.
 *
 * Order of operations:
 *   1. Read + validate manifest
 *   2. Verify scope matches CLI arg
 *   3. Verify installer eligibility against the manifest
 *   4. Verify no duplicate install exists for (id, scope, scopeId)
 *   5. Copy fixture files to `extensions/installed/<id>/<version>/`
 *   6. Import the copied artifact and validate its exported shape
 *      (fail fast — if it doesn't load cleanly now, boot will fail too)
 *   7. Create Extension / ExtensionVersion / ExtensionInstall rows
 *      in a single transaction
 *
 * File copy is done before DB writes so that a shape-validation failure
 * leaves no orphaned rows. DB writes are transactional. The copy itself
 * is not — if the DB transaction fails, the copied directory remains on
 * disk. Next install of the same version overwrites it (idempotent), so
 * this is acceptable for a dev tool.
 *
 * Not idempotent by design: installing the same (id, scope, scopeId)
 * twice throws with a clear "already installed" message. Uninstall first
 * to reinstall. This is intentional — a duplicate install likely means
 * a script bug or a stale dev state, not a legitimate retry.
 */
export async function installExtension(
    options: InstallOptions,
): Promise<InstallResult> {
    const { sourcePath, scope, scopeId, installedByUserId } = options;

    // ── 1. Read + validate manifest ────────────────────────────────
    const absoluteSource = resolve(sourcePath);
    const manifestPath = join(absoluteSource, "manifest.json");
    const indexPath = join(absoluteSource, "index.js");

    let manifestRaw: string;
    try {
        manifestRaw = readFileSync(manifestPath, "utf-8");
        // Existence check — the actual import happens after copy.
        readFileSync(indexPath, { encoding: "utf-8", flag: "r" });
    } catch (error) {
        throw new Error(
            `Cannot read fixture at "${absoluteSource}": ${(error as Error).message}`,
        );
    }

    let manifestJson: unknown;
    try {
        manifestJson = JSON.parse(manifestRaw);
    } catch (error) {
        throw new Error(
            `manifest.json is not valid JSON: ${(error as Error).message}`,
        );
    }

    const manifestResult = ManifestSchema.safeParse(manifestJson);
    if (!manifestResult.success) {
        throw new Error(
            `manifest.json failed schema validation: ${manifestResult.error.message}`,
        );
    }
    const manifest = manifestResult.data;

    // ── 2. Scope match ─────────────────────────────────────────────
    if (scope !== manifest.scope) {
        throw new Error(
            `Scope mismatch: CLI arg is "${scope}" but manifest declares "${manifest.scope}"`,
        );
    }

    // ── 3. Eligibility ─────────────────────────────────────────────
    await assertEligible(manifest, scopeId, installedByUserId);

    // ── 4. Duplicate install ───────────────────────────────────────
    const existing = await models.ExtensionInstall
        .where({ extensionId: manifest.id, scope, scopeId })
        .first();
    if (existing) {
        throw new Error(
            `Extension "${manifest.id}" v${manifest.version} is already installed ` +
                `for ${scope} ${scopeId} (installId: ${existing.id}). ` +
                `Uninstall first if you want to reinstall.`,
        );
    }

    // ── 5. Copy artifact ──────────────────────────────────────────
    const artifactPath = resolve(
        "extensions",
        "installed",
        manifest.id,
        manifest.version,
    );

    mkdirSync(artifactPath, { recursive: true });
    cpSync(absoluteSource, artifactPath, {
        recursive: true,
        // node_modules: extensions resolve `zod` etc. from the app's
        // node_modules at import time, not their own. .git: no value
        // on the deployed artifact.
        filter: (src) => {
            const rel = src.slice(absoluteSource.length);
            return !rel.includes("node_modules") && !rel.includes(".git");
        },
    });

    // ── 6. Import the copied artifact ─────────────────────────────
    const installedIndexUrl = pathToFileURL(
        join(artifactPath, "index.js"),
    ).href;

    let importedModule: { default?: unknown };
    try {
        importedModule = (await import(installedIndexUrl)) as {
            default?: unknown;
        };
    } catch (error) {
        rmSync(artifactPath, { recursive: true, force: true });
        throw new Error(
            `Installed artifact failed to import: ${(error as Error).message}`,
        );
    }

    if (!isExtensionExportedDefault(importedModule.default)) {
        rmSync(artifactPath, { recursive: true, force: true });
        throw new Error(
            "Installed artifact does not export a valid ExtensionExportedDefault shape",
        );
    }

    // ── 7. Checksum ────────────────────────────────────────────────
    const indexBytes = readFileSync(join(artifactPath, "index.js"));
    const artifactChecksum = `sha256:${createHash("sha256")
        .update(indexBytes)
        .digest("hex")}`;

    // ── 8. DB rows ────────────────────────────────────────────────
    const installId = await db.transaction(async (tx) => {
        const existingExtension = await tx.orm.public.Extension
            .where({ id: manifest.id })
            .first();

        if (!existingExtension) {
            await tx.orm.public.Extension.create({
                id: manifest.id,
                name: manifest.name,
                description: manifest.description ?? null,
                authorName: manifest.author.name,
            });
        }

        let versionRow = await tx.orm.public.ExtensionVersion
            .where({
                extensionId: manifest.id,
                version: manifest.version,
            })
            .first();

        if (!versionRow) {
            versionRow = await tx.orm.public.ExtensionVersion.create({
                extensionId: manifest.id,
                version: manifest.version,
                manifest: manifestJson as never,
                artifactPath,
                artifactChecksum,
                status: "approved",
            });
        }

        const install = await tx.orm.public.ExtensionInstall.create({
            extensionId: manifest.id,
            versionId: versionRow.id,
            scope,
            scopeId,
            installedById: installedByUserId,
            status: "active",
        });

        return install.id;
    });

    return { installId, artifactPath, artifactChecksum };
}

/**
 * Remove an install. Cascades to `ExtensionData` and `ExtensionStorage`
 * via FK. Leaves `Extension` and `ExtensionVersion` untouched — those
 * are catalog entries and remain valid even when nobody's installed.
 *
 * Does NOT delete the on-disk artifact directory: another install of
 * the same version may still reference it. Manual cleanup:
 * `rm -rf extensions/installed/<id>`.
 *
 * Per the deferred quota decision, uninstall cascading data means a
 * reinstall starts with a fresh quota budget. That is intentional for
 * now; a future fix will preserve counters across uninstall.
 */
export async function uninstallExtension(installId: string): Promise<void> {
    if (!isUuid(installId)) {
        throw new Error(
            `--installId must be a UUID (got "${installId}")`,
        );
    }

    const install = await models.ExtensionInstall
        .where({ id: installId })
        .first();

    if (!install) {
        throw new Error(`Install "${installId}" not found`);
    }

    await models.ExtensionInstall.where({ id: installId }).delete();
}

// ──────────────────────────────────────────────────────────────────────
// Eligibility
// ──────────────────────────────────────────────────────────────────────

const GLOBAL_ROLE_RANK: Record<"USER" | "ADMIN", number> = {
    USER: 0,
    ADMIN: 1,
};

async function assertEligible(
    manifest: Manifest,
    scopeId: string,
    installedByUserId: string,
): Promise<void> {
    if (!isUuid(installedByUserId)) {
        throw new Error(
            `--installedBy must be a UUID (got "${installedByUserId}")`,
        );
    }

    const installer = await models.User
        .where({ id: installedByUserId })
        .first();
    if (!installer) {
        throw new Error(
            `Installer user "${installedByUserId}" not found`,
        );
    }

    const requiredGlobal = manifest.eligibility.minimumGlobalRole;
    if (
        GLOBAL_ROLE_RANK[installer.globalRole] <
        GLOBAL_ROLE_RANK[requiredGlobal]
    ) {
        throw new Error(
            `Installer global role "${installer.globalRole}" does not satisfy ` +
                `required "${requiredGlobal}"`,
        );
    }

    // ── user / admin scope ────────────────────────────────────────
    if (manifest.scope === "user" || manifest.scope === "admin") {
        if (scopeId !== installedByUserId) {
            throw new Error(
                `For ${manifest.scope}-scope installs, --scopeId must equal --installedBy`,
            );
        }
        if (
            manifest.scope === "admin" &&
            installer.globalRole !== "ADMIN"
        ) {
            throw new Error(
                "Admin-scope installs require the installer to be an ADMIN",
            );
        }
        return;
    }

    // ── store scope ───────────────────────────────────────────────
    if (!isUuid(scopeId)) {
        throw new Error(`--scopeId must be a UUID (got "${scopeId}")`);
    }

    const store = await models.Store.where({ id: scopeId }).first();
    if (!store) {
        throw new Error(`Store "${scopeId}" not found`);
    }
    if (store.status !== "ACTIVE") {
        throw new Error(
            `Store "${scopeId}" is not ACTIVE (status: ${store.status}). ` +
                `Store-scope extensions can only be installed for active stores.`,
        );
    }

    const membership = await models.StoreMembership
        .where({
            storeId: scopeId,
            userId: installedByUserId,
            status: "ACTIVE",
        })
        .first();
    if (!membership) {
        throw new Error(
            `Installer "${installedByUserId}" has no ACTIVE membership in store "${scopeId}"`,
        );
    }

    const requires = manifest.eligibility.requiresStoreRole;
    if (!requires.includes(membership.role)) {
        throw new Error(
            `Installer role "${membership.role}" is not in required set ` +
                `[${requires.join(", ")}]`,
        );
    }
}