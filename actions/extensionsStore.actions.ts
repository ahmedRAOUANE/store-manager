"use server";

import { withGlobalRole } from "@/access/wrappers";
import { AppError } from "@/errors/base.error";
import { extractZipFileFromFormData } from "@/lib/storage/form-data";
import { getR2ArtifactStore } from "@/lib/storage/r2Client";
import {
    submitExtensionService,
} from "@/services/storeIngestion.services";

export type SubmitExtensionResult =
    | {
        ok: true;
        versionId: string;
        extensionId: string;
        version: string;
    }
    | { ok: false; message: string };

/**
 * Server Action for store submissions. Admin-only.
 *
 * Flow:
 *   1. `withGlobalRole(["ADMIN"], ...)` — auth gate. Non-admins
 *      throw `AuthorizationError` before the handler runs.
 *   2. `extractZipFileFromFormData` — cheap validation, then read
 *      the buffer.
 *   3. `submitExtensionService` — full ingestion (manifest
 *      validation, R2 upload, DB write).
 *
 * Return shape matches the codebase convention: `{ ok: true } | {
 * ok: false, message }` for user-facing outcomes. Infrastructure
 * errors (`R2StorageError`, `DatabaseError`) propagate as throws —
 * the client catches them as unexpected failures, distinct from
 * validation rejections.
 *
 * The R2 store is constructed lazily by `getR2ArtifactStore()`,
 * which reads env vars on first use. A missing credential throws
 * with a message pointing at `.env.example` — surfaced to the
 * client as a 500, not a validation error.
 */
export const submitExtension = withGlobalRole(
    ["ADMIN"],
    async (user, formData: FormData): Promise<SubmitExtensionResult> => {
        const extracted = await extractZipFileFromFormData(formData);
        if (!extracted.ok) {
            return { ok: false, message: extracted.message };
        }

        // `_user` is the admin's row. Its `.id` is the `submittedById`
        // for the audit trail. The underscore prefix was for the auth
        // wrapper's signature; we now use it, so rename:

        // The R2 store construction can throw on missing env vars.
        // That's intentional — it's a config error, not a user error.
        const store = getR2ArtifactStore();

        console.info(
            `[store] admin ${user.id} submitted ${extracted.filename} ` +
            `(${extracted.buffer.byteLength.toLocaleString()} bytes)`,
        );
        const result = await submitExtensionService(
            {
                buffer: extracted.buffer,
                filename: extracted.filename,
                submittedById: user.id,
            },
            store,
        );

        if (result instanceof AppError) {
            return { ok: false, message: result.message };
        }

        return {
            ok: true,
            versionId: result.versionId,
            extensionId: result.extensionId,
            version: result.version,
        };
    },
);