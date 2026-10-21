import { pathToFileURL } from "node:url";
import { join } from "node:path";

import { models } from "@/prisma/db";

import { ManifestSchema } from "./manifest";
import {
    // HOOK_NAMES,
    type ExtensionScope,
    type HookHandler,
    type HookName,
    type LoadedExtension,
} from "./types";
import {
    buildCapabilitySet,
    isExtensionExportedDefault,
    versionSatisfies,
    RUNNER_LIBRARY_VERSION,
} from "./validation";

type LoadResult =
    | { success: true; extension: LoadedExtension }
    | { success: false; error: string };

/**
 * Load every active install. Failures are isolated per-install: one
 * broken extension cannot prevent the rest from loading. Broken installs
 * are marked `status = "error"` with `errorReason` set, so a management
 * UI (Phase D) can surface the diagnostic.
 */
export async function loadAllInstalled(): Promise<LoadedExtension[]> {
    const installs = await models.ExtensionInstall
        .where({ status: "active" })
        .all();

    const loaded: LoadedExtension[] = [];

    for (const install of installs) {
        const result = await loadOne(install.id);
        if (result.success) {
            loaded.push(result.extension);
        } else {
            console.error(
                `[extensions] failed to load install ${install.id} ` +
                `(${install.extensionId}): ${result.error}`,
            );
            try {
                await models.ExtensionInstall
                    .where({ id: install.id })
                    .update({
                        status: "error",
                        errorReason: result.error,
                    });
            } catch (updateError) {
                console.error(
                    `[extensions] failed to mark install ${install.id} as error:`,
                    updateError,
                );
            }
        }
    }

    return loaded;
}

export async function loadOne(installId: string): Promise<LoadResult> {
    try {
        // ── 1. Fetch install + version ─────────────────────────────
        const install = await models.ExtensionInstall
            .where({ id: installId })
            .first();
        if (!install) {
            return { success: false, error: "install row not found" };
        }

        const version = await models.ExtensionVersion
            .where({ id: install.versionId })
            .first();
        if (!version) {
            return { success: false, error: "version row not found" };
        }

        // ── 2. Validate manifest ───────────────────────────────────
        const manifestResult = ManifestSchema.safeParse(version.manifest);
        if (!manifestResult.success) {
            return {
                success: false,
                error: `invalid manifest: ${manifestResult.error.message}`,
            };
        }
        const manifest = manifestResult.data;

        // ── 3. Scope match ─────────────────────────────────────────
        if (install.scope !== manifest.scope) {
            return {
                success: false,
                error:
                    `scope mismatch — install.scope="${install.scope}" ` +
                    `but manifest.scope="${manifest.scope}"`,
            };
        }

        // ── 4. Library version compatibility ───────────────────────
        if (
            !versionSatisfies(
                RUNNER_LIBRARY_VERSION,
                manifest.libraryVersion,
            )
        ) {
            return {
                success: false,
                error:
                    `library version incompatible — ` +
                    `runner=${RUNNER_LIBRARY_VERSION}, ` +
                    `extension requires ${manifest.libraryVersion}`,
            };
        }

        // ── 5. Import the artifact ─────────────────────────────────
        const indexPath = join(version.artifactPath, "index.js");
        // const fileUrl = pathToFileURL(indexPath).href;
        const fileUrl = pathToFileURL(indexPath).href + `?v=${version.artifactChecksum}`;

        let importedModule: { default?: unknown };
        try {
            importedModule = (await import(
                /* webpackIgnore: true */
                /* turbopackIgnore: true */
                fileUrl
            )) as { default?: unknown };
        } catch (err) {
            return {
                success: false,
                error: `failed to import "${indexPath}": ${err instanceof Error ? err.message : String(err)
                    }`,
            };
        }

        // ── 6. Structural validation of the exported default ───────
        if (!isExtensionExportedDefault(importedModule.default)) {
            return {
                success: false,
                error:
                    "exported default does not match ExtensionExportedDefault shape",
            };
        }
        const exported = importedModule.default;

        // ── 7. Notification cross-check with manifest ──────────────
        const notificationDefinitions: LoadedExtension["notificationDefinitions"] =
            [];
        for (const [eventName, def] of Object.entries(
            exported.notifications,
        )) {
            if (!manifest.notifications[eventName]) {
                return {
                    success: false,
                    error:
                        `notification "${eventName}" exported but not ` +
                        `declared in manifest.notifications`,
                };
            }
            notificationDefinitions.push({ eventName, definition: def });
        }
        for (const declared of Object.keys(manifest.notifications)) {
            if (!exported.notifications[declared]) {
                return {
                    success: false,
                    error:
                        `notification "${declared}" declared in manifest ` +
                        `but not exported`,
                };
            }
        }

        // ── 8. Build handlers map ──────────────────────────────────
        const handlers = new Map<HookName, HookHandler>();
        for (const [hookName, handler] of Object.entries(exported.hooks)) {
            handlers.set(hookName as HookName, handler as HookHandler);
        }

        // ── 9. Cross-check hook subscriptions ──────────────────────
        // Every declared hook must have a handler; every handler must be
        // declared. HOOK_NAMES validation already happened in
        // isExtensionExportedDefault, so both sides are known-good sets.
        for (const declaredHook of manifest.hooks) {
            if (!handlers.has(declaredHook)) {
                return {
                    success: false,
                    error:
                        `hook "${declaredHook}" declared in manifest ` +
                        `but no handler exported`,
                };
            }
        }

        return {
            success: true,
            extension: {
                installId: install.id,
                extensionId: install.extensionId,
                version: version.version,
                scope: install.scope as ExtensionScope,
                scopeId: install.scopeId,
                manifest,
                capabilities: buildCapabilitySet(manifest),
                handlers,
                notificationDefinitions,
                quotaMaxRows: install.quotaMaxRows,
                quotaMaxBytes: install.quotaMaxBytes,
            },
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}