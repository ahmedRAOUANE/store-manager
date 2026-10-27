import type { HookHandler } from "@store-manager/extensions";

/**
 * Audits `product.updated` events and fires a notification when the
 * selling price changes.
 *
 * Behavior matches the hand-crafted fixture's `product.updated`
 * handler exactly:
 *
 *   1. Always insert an `action: "updated"` row into `audit_log`.
 *   2. If `payload.changes.sellingPrice` is present, publish the
 *      `LOG_CHANGED` notification with `productName` and `field`.
 *
 * The `changes` object is keyed by field name (`sellingPrice`,
 * `name`, `description`, `barcode`, `unit`, `minimumStock`,
 * `isActive`) and each entry has `{ previous, next }`. The check
 * `payload.changes.sellingPrice` is truthy when the field was among
 * the changed fields — the runner's `computeProductChanges` already
 * skips no-op updates before emitting the hook, so we don't need to
 * inspect `previous`/`next` here.
 */
const handler: HookHandler<"product.updated"> = async (ctx, payload) => {
    await ctx.extensions.db.insert("audit_log", {
        productId: payload.id,
        action: "updated",
        actorId: ctx.user.id,
    });

    if (payload.changes && payload.changes.sellingPrice) {
        await ctx.notifications.publish("LOG_CHANGED", {
            productName: payload.name,
            field: "sellingPrice",
        });
    }
};

export default handler;