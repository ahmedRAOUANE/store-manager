import type { GetProduct } from "@/zod/product.schema";

export type ProductChanges = Record<
    string,
    { previous: unknown; next: unknown }
>;

/**
 * Fields compared for the `product.updated` hook payload.
 *
 * Intentionally excludes:
 *   - `stockQuantity` and `averageCost` — these change via inventory
 *     mutations (`mutateProductInventoryInTransaction`), not product
 *     updates. Stock changes will get their own hook
 *     (`product.stock.changed`) if/when an extension needs it.
 *   - `id`, `storeId`, `sku`, `createdAt`, `updatedAt` — these are
 *     identity or system-managed, not user-editable content.
 *
 * Kept narrow on purpose: an extension subscribing to `product.updated`
 * is interested in "what did a user change?", not "what shifted in the
 * DB row?". Identity/system fields belong in the payload snapshot
 * (`id`, `sku`, `createdAt`), not in the diff.
 */
const COMPARABLE_FIELDS = [
    "name",
    "description",
    "barcode",
    "unit",
    "sellingPrice",
    "minimumStock",
    "isActive",
] as const satisfies ReadonlyArray<keyof GetProduct>;

/**
 * Compute the set of user-editable fields that changed between two
 * product snapshots. Returns an empty object when nothing changed —
 * callers should use `Object.keys(changes).length > 0` to decide
 * whether to emit `product.updated`.
 *
 * Strict equality (`!==`) is used per field. This is correct for the
 * primitives in `COMPARABLE_FIELDS` (string, number, boolean). If a
 * future field is an object or array, the comparison will produce
 * spurious "changes" on every call — revisit this function at that
 * time.
 */
export function computeProductChanges(
    before: GetProduct,
    after: GetProduct,
): ProductChanges {
    const changes: ProductChanges = {};

    for (const field of COMPARABLE_FIELDS) {
        if (before[field] !== after[field]) {
            changes[field] = {
                previous: before[field],
                next: after[field],
            };
        }
    }

    return changes;
}