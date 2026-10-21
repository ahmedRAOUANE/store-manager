/* eslint-disable import/no-anonymous-default-export */
import { z } from "zod";

const logChangedPayload = z.object({
    productName: z.string(),
    field: z.string(),
});

export default {
    notifications: {
        LOG_CHANGED: {
            payloadSchema: logChangedPayload,
            presentation: {
                titleKey: "ext.product-audit.LOG_CHANGED.title",
                bodyKey: "ext.product-audit.LOG_CHANGED.body",
            },
            recipients: {
                scope: "store",
                roles: ["OWNER", "MANAGER"],
                excludeActor: true,
            },
        },
    },
    hooks: {
        "product.created": async (ctx, payload) => {
            await ctx.extensions.db.insert("audit_log", {
                productId: payload.id,
                action: "created",
                actorId: ctx.user.id,
            });
            ctx.log.info(`Audited product.created: ${payload.name}`);
        },
        "product.updated": async (ctx, payload) => {
            await ctx.extensions.db.insert("audit_log", {
                productId: payload.id,
                action: "updated",
                actorId: ctx.user.id,
            });

            // Only notify when the selling price changed. Other field
            // changes are audited silently — this is a price alert, not
            // a general "any change" feed.
            if (payload.changes && payload.changes.sellingPrice) {
                await ctx.notifications.publish("LOG_CHANGED", {
                    productName: payload.name,
                    field: "sellingPrice",
                });
            }
        },
    },
};