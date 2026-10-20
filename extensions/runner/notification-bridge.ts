import {
    requireStoreId,
    type NotificationDefinition,
    type NotificationPublishContext,
} from "@/notifications/definition";
import type { TransactionClient } from "@/prisma/db";
import type { ExtensionNotificationDefinition } from "./types";

/**
 * Wrap an extension's declarative notification into a core-shaped
 * `NotificationDefinition`, ready for `publishNotificationInTransaction`
 * and for `registerExtensionNotification`.
 *
 * Recipient resolution:
 *
 *   - `scope: "store"` — queries ACTIVE StoreMembership rows for the
 *     context's store, filters by `roles` when provided, drops the
 *     triggering actor when `excludeActor === true`. `ctx.actorId`
 *     must be set by the runner; if absent and `excludeActor` is true,
 *     the filter is silently skipped (the actor may be a self-recipient).
 *     This is intentional — a misconfigured `publish` should not throw
 *     during recipient resolution and lose the notification entirely.
 *
 *   - `scope: "user"` — returns `[ctx.actorId]`. For a user-scoped
 *     extension the actor IS the install target; for a store-scoped
 *     extension this means "notify only the triggering user". A
 *     missing `actorId` throws — there is no meaningful default.
 *
 * The type string is always `ext.<extensionId>.<eventName>`.
 */
export const toCoreNotificationDefinition = (
    extensionId: string,
    eventName: string,
    ext: ExtensionNotificationDefinition,
): NotificationDefinition => {
    const type = `ext.${extensionId}.${eventName}`;

    return {
        type,
        payloadSchema: ext.payloadSchema,
        presentation: ext.presentation,
        resolveRecipients: async (
            tx: TransactionClient,
            ctx: NotificationPublishContext,
        ) => {
            if (ext.recipients.scope === "store") {
                const storeId = requireStoreId(ctx);

                const memberships = await tx.orm.public.StoreMembership
                    .where({ storeId, status: "ACTIVE" })
                    .all();

                const allowedRoles = ext.recipients.roles;
                const excludeActor = ext.recipients.excludeActor === true;
                const actorId = ctx.actorId;

                return memberships
                    .filter((m) => {
                        if (
                            allowedRoles &&
                            !allowedRoles.includes(
                                m.role as "OWNER" | "MANAGER" | "STAFF",
                            )
                        ) {
                            return false;
                        }
                        if (
                            excludeActor &&
                            actorId !== undefined &&
                            m.userId === actorId
                        ) {
                            return false;
                        }
                        return true;
                    })
                    .map((m) => m.userId);
            }

            // scope === "user": notify the actor only.
            if (!ctx.actorId) {
                throw new Error(
                    `Extension "${extensionId}" notification "${eventName}" with scope "user" requires ctx.actorId`,
                );
            }
            return [ctx.actorId];
        },
    };
};