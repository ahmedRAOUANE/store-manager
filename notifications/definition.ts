/* eslint-disable @typescript-eslint/no-explicit-any */
import type { z } from "zod";
import type { TransactionClient } from "@/prisma/db";

/**
 * Translation keys for a notification. Both keys must resolve under the
 * `notifications` namespace in every locale.
 */
export interface NotificationPresentation {
    readonly titleKey: string;
    readonly bodyKey: string;
}

/**
 * Trusted, server-resolved context for a publish call.
 *
 * - `storeId` is the tenant boundary. Null only for events with no store
 *   scope (none exist today, but the field stays nullable so future
 *   user- or platform-scoped events don't require a contract change).
 * - `affectedUserId` is the target of a user-scoped event (e.g. the member
 *   whose role changed). Never sourced from request input.
 */
export interface NotificationPublishContext {
    readonly storeId: string | null;
    readonly affectedUserId?: string;
}

/**
 * `z.ZodType<any, any>` (rather than `z.ZodType`) is required so that
 * `satisfies Record<string, NotificationDefinition>` in the registry
 * accepts definitions with specific payload schemas. In Zod v4,
 * `z.ZodType` defaults to `ZodType<unknown, unknown>`, which makes
 * `resolveRecipients` contravariant and rejects the `satisfies` check.
 */

/**
 * A single notification event contract.
 *
 * `type` is the stable identifier persisted in `Notification.type`.
 * `payloadSchema` validates the payload at the trusted publishing boundary.
 * `presentation` maps the type to its translation keys.
 * `resolveRecipients` is the single source of truth for who receives it.
 */
export interface NotificationDefinition<
    TType extends string = string,
    TPayloadSchema extends z.ZodType<any, any> = z.ZodType<any, any>,
> {
    readonly type: TType;
    readonly payloadSchema: TPayloadSchema;
    readonly presentation: NotificationPresentation;
    readonly resolveRecipients: (
        tx: TransactionClient,
        ctx: NotificationPublishContext,
        payload: z.infer<TPayloadSchema>,
    ) => Promise<readonly string[]>;
}

/**
 * Identity helper that preserves literal `type` inference so the registry
 * stays strongly typed. Without this, `type: "STORE_ACTIVATED"` widens to
 * `string` when the definition is passed around.
 */
export const defineNotification = <
    TType extends string,
    TPayloadSchema extends z.ZodType<any, any>,
>(
    def: NotificationDefinition<TType, TPayloadSchema>,
): NotificationDefinition<TType, TPayloadSchema> => def;

/**
 * Guard for resolvers that only make sense with a store context.
 * Throws rather than silently returning `[]` so a misconfigured publish
 * fails the surrounding transaction.
 */
export const requireStoreId = (
    ctx: NotificationPublishContext,
): string => {
    if (!ctx.storeId) {
        throw new Error("Notification event requires a store context");
    }
    return ctx.storeId;
};

/**
 * Guard for user-scoped resolvers. Throws if `affectedUserId` is missing.
 */
export const requireAffectedUserId = (
    ctx: NotificationPublishContext,
): string => {
    if (!ctx.affectedUserId) {
        throw new Error("Notification event requires an affected user");
    }
    return ctx.affectedUserId;
};

/**
 * Derives the translation keys for a notification type.
 *
 * Convention:
 *   notifications.<TYPE>.title
 *   notifications.<TYPE>.body
 *
 * Both keys must exist in every locale's message file. The parameter is
 * typed as `string` rather than a closed union so future extension
 * definitions can share the same convention without modifying core.
 */
export const derivePresentation = (
    type: string,
): NotificationPresentation => ({
    titleKey: `notifications.${type}.title`,
    bodyKey: `notifications.${type}.body`,
});