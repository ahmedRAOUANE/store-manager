import { z } from "zod";
import { UuidSchema } from "./general.schema";
import { StoreRole } from "./membership.schema";

export const StoreStatus = z.enum({
    PENDING: "PENDING",
    ACTIVE: "ACTIVE",
    SUSPENDED: "SUSPENDED"
});

export const MembershipStatus = z.enum({
    PENDING: "PENDING",
    ACTIVE: "ACTIVE",
    REJECTED: "REJECTED",
    INVALIDATED: "INVALIDATED",
});

export const GetStoreSchema = z.object({
    id: UuidSchema,

    name: z.string(),

    description: z.string().nullable(),

    phone: z.string().nullable(),

    email: z.string().nullable(),

    address: z.string().nullable(),

    currency: z.string(),

    timezone: z.string(),

    status: StoreStatus,

    memberships: z.object({ status: MembershipStatus, role: StoreRole}).array().optional(),

    createdAt: z.instanceof(Temporal.Instant),

    updatedAt: z.instanceof(Temporal.Instant),
});

export type GetStore = z.infer<
    typeof GetStoreSchema
>;

export const CreateStoreSchema = GetStoreSchema.omit({
    memberships: true,
    id: true,
    status: true,
    createdAt: true,
    updatedAt: true,
})

export type CreateStoreInput = z.infer<
    typeof CreateStoreSchema
>;

export const UpdateStoreSchema = CreateStoreSchema.partial()

export type UpdateStoreInput = z.infer<
    typeof UpdateStoreSchema
>;

