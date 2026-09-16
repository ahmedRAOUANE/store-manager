/*
model StoreMembership {
  id Uuid @id @default(uuid())

  userId  Uuid
  storeId Uuid

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  store Store @relation(fields: [storeId], references: [id])

  role   StoreRole
  status MembershipStatus @default(PENDING)

  createdAt DateTime @default(now())
  updatedAt temporal.updatedAt()

  @@unique([userId, storeId])
  @@index([userId])
  @@index([storeId])
  @@index([storeId, status])
}
*/

import { z } from "zod";
import { UuidSchema } from "./general.schema";

export const StoreRole = z.enum({
    OWNER: "OWNER",
    MANAGER: "MANAGER",
    STAFF: "STAFF",
})

export const MembershipStatus = z.enum({
    PENDING: "PENDING",
    ACTIVE: "ACTIVE",
    REJECTED: "REJECTED",
    INVALIDATED: "INVALIDATED",
})

export const GetMemberShipSchema = z.object({
    id: UuidSchema,
    userId: UuidSchema,
    storeId: UuidSchema,

    role: StoreRole,
    status: MembershipStatus,

    createdAt: z.instanceof(Temporal.Instant),
    updatedAt: z.instanceof(Temporal.Instant),
});

export type GetMemberShip = z.infer<typeof GetMemberShipSchema>

export const CreateMembershipSchema = GetMemberShipSchema.omit({
    id: true,
    // storeId: true,
    // role: true,
    // status: true,
    createdAt: true,
    updatedAt: true,
}).extend({
    storeId: UuidSchema.optional()
})

export const GetMembershipWithUserSchema = GetMemberShipSchema.extend({
    user: z.object({
        firstName: z.string().nullable(),
        lastName: z.string().nullable(),
        email: z.string().nullable(),
        imageUrl: z.string().nullable(),
    }),
});

export type GetMembershipWithUser = z.infer<typeof GetMembershipWithUserSchema>;

export type CreateMembershipInput = z.infer<typeof CreateMembershipSchema>

export const UpdateMembershipSchema = CreateMembershipSchema.extend({
    id: UuidSchema.readonly(),
    userId: UuidSchema.readonly(),
    storeId: UuidSchema,
})

export type UpdateMembershipInput = z.infer<typeof UpdateMembershipSchema>;

export const RequestMembershipSchema = z.object({
    storeId: UuidSchema,
});

export type RequestMembershipInput = z.infer<
    typeof RequestMembershipSchema
>;
