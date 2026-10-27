import { defineTable } from "@store-manager/extensions";

/**
 * The `audit_log` table.
 *
 * The table name is derived from this file's basename (`audit_log`),
 * matching the manifest's `tables` map key when assembled by
 * `store-manager-ext build`.
 *
 * Columns match the hand-crafted fixture's `audit_log` table exactly.
 * System fields (`id`, `createdAt`, `updatedAt`) are provided by the
 * `ExtensionData` schema automatically — extensions don't declare them
 * in the manifest.
 */
export default defineTable({
    columns: {
        productId: "uuid",
        action: "text",
        actorId: "uuid",
    },
});