import type { HookHandler } from "@store-manager/extensions";

/**
 * Audits `product.created` events.
 *
 * Behavior matches the hand-crafted fixture's `product.created`
 * handler exactly:
 *
 *   1. Insert a row into the extension's `audit_log` table with
 *      `action: "created"` and the triggering user as `actorId`.
 *   2. Log an info-level message via `ctx.log.info`.
 *
 * The handler is typed as `HookHandler<"product.created">`, which
 * narrows `payload` to the shape of the `product.created` hook
 * payload — editor autocomplete works on `payload.id`,
 * `payload.name`, `payload.sku`, etc. without any casts.
 */
const handler: HookHandler<"product.created"> = async (ctx, payload) => {
    await ctx.extensions.db.insert("audit_log", {
        productId: payload.id,
        action: "created",
        actorId: ctx.user.id,
    });
    ctx.log.info(`Audited product.created: ${payload.name}`);
};

export default handler;