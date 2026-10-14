
import { z } from "zod";
import { UuidSchema } from "./general.schema";
import { StoreRole } from "./membership.schema";

/**
 * Stable event identifiers persisted in the database.
 * These values are not translated.
 */
export const NotificationTypeSchema = z.enum({
    STORE_ACTIVATED: "STORE_ACTIVATED",
    STORE_SUSPENDED: "STORE_SUSPENDED",
    MEMBERSHIP_ACCEPTED: "MEMBERSHIP_ACCEPTED",
    MEMBERSHIP_REJECTED: "MEMBERSHIP_REJECTED",
    MEMBER_ROLE_CHANGED: "MEMBER_ROLE_CHANGED",
    MEMBERSHIP_INVALIDATED: "MEMBERSHIP_INVALIDATED",
    PRODUCT_LOW_STOCK: "PRODUCT_LOW_STOCK",
});

export type NotificationType = z.infer<
    typeof NotificationTypeSchema
>;

const StoreNamePayloadSchema = z.object({
    storeName: z.string().trim().min(1).max(200),
}).strict();

const MemberRoleChangedPayloadSchema = z.object({
    storeName: z.string().trim().min(1).max(200),
    previousRole: StoreRole,
    newRole: StoreRole,
}).strict().refine(
    (payload) => payload.previousRole !== payload.newRole,
    {
        message: "The previous and new roles must differ.",
        path: ["newRole"],
    },
);

const ProductLowStockPayloadSchema = z.object({
    productId: UuidSchema,
    productName: z.string().trim().min(1).max(200),
    stockQuantity: z.number().finite().nonnegative(),
    minimumStock: z.number().finite().nonnegative(),
}).strict();

export const NotificationEventSchema = z.discriminatedUnion(
    "type",
    [
        z.object({
            type: z.literal("STORE_ACTIVATED"),
            payload: StoreNamePayloadSchema,
        }).strict(),

        z.object({
            type: z.literal("STORE_SUSPENDED"),
            payload: StoreNamePayloadSchema,
        }).strict(),

        z.object({
            type: z.literal("MEMBERSHIP_ACCEPTED"),
            payload: StoreNamePayloadSchema,
        }).strict(),

        z.object({
            type: z.literal("MEMBERSHIP_REJECTED"),
            payload: StoreNamePayloadSchema,
        }).strict(),

        z.object({
            type: z.literal("MEMBER_ROLE_CHANGED"),
            payload: MemberRoleChangedPayloadSchema,
        }).strict(),

        z.object({
            type: z.literal("MEMBERSHIP_INVALIDATED"),
            payload: StoreNamePayloadSchema,
        }).strict(),

        z.object({
            type: z.literal("PRODUCT_LOW_STOCK"),
            payload: ProductLowStockPayloadSchema,
        }).strict(),
    ],
);

export type NotificationEvent = z.infer<
    typeof NotificationEventSchema
>;

export type NotificationPayload<
    T extends NotificationType,
> = Extract<NotificationEvent, { type: T }>["payload"];

/**
 * Use at trusted server-side boundaries before persistence.
 * Returns parsed data, including Zod's validation errors on failure.
 */
export const validateNotificationEvent = (
    input: unknown,
) => NotificationEventSchema.safeParse(input);
