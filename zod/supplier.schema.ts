import { z } from "zod";
import { UuidSchema } from "./general.schema";

export const GetSupplierSchema = z.object({
    id: UuidSchema,
    storeId: UuidSchema,

    name: z.string(),
    phone: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    taxNumber: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),

    createdAt: z.instanceof(Temporal.Instant),
    updatedAt: z.instanceof(Temporal.Instant),
});

export type GetSupplier = z.infer<typeof GetSupplierSchema>;

export const CreateSupplierSchema = z.object({
    storeId: UuidSchema,

    name: z.string(),
    phone: z.string().optional(),
    email: z.email().optional(),
    address: z.string().optional(),
    taxNumber: z.string().optional(),
    notes: z.string().optional(),
})

export type CreateSupplierInput = z.infer<typeof CreateSupplierSchema>

export const UpdateSupplierSchema = CreateSupplierSchema.extend({
    id: UuidSchema,
    storeId: UuidSchema.optional(),
})

export type UpdateSupplierInput = z.infer<typeof UpdateSupplierSchema>