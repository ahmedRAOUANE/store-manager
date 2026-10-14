
export interface StockSnapshot {
    stockQuantity: number;
    minimumStock: number;
}

/**
 * A low-stock notification is due only when stock actually decreases
 * from above the threshold to at-or-below it.
 *
 * This function is intentionally pure: it does not access the database
 * and does not create notifications.
 */
export function crossedIntoLowStock(
    before: StockSnapshot,
    after: StockSnapshot,
): boolean {
    return (
        Number.isFinite(before.stockQuantity) &&
        Number.isFinite(before.minimumStock) &&
        Number.isFinite(after.stockQuantity) &&
        Number.isFinite(after.minimumStock) &&
        before.stockQuantity >= 0 &&
        after.stockQuantity >= 0 &&
        before.minimumStock >= 0 &&
        after.minimumStock >= 0 &&
        after.stockQuantity < before.stockQuantity &&
        before.stockQuantity > before.minimumStock &&
        after.stockQuantity <= after.minimumStock
    );
}
