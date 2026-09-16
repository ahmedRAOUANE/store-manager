import { z } from "zod";
import { UuidSchema } from "./general.schema";
import { GetPurchaseItemSchema } from "./purchaseItem.schema";

const GetPurchaseSupplierSchema = z.object({
id: UuidSchema,
name: z.string(),
});

export const GetPurchaseSchema = z.object({
    id: UuidSchema,
    storeId: UuidSchema,
    createdById: UuidSchema.nullable(), //! this for bipassing the error, will be removed later

    supplierId: UuidSchema,
    supplier: GetPurchaseSupplierSchema.nullable().optional(),

    invoiceNumber: z.string().optional(),

    purchaseDate: z.instanceof(Temporal.Instant),

    subtotal: z.number().default(0),
    discountAmount: z.number().default(0),
    taxAmount: z.number().default(0),
    shippingCost: z.number().default(0),
    otherCost: z.number().default(0),
    totalAmount: z.number().default(0),

    amountPaid: z.number().default(0),
    amountDue: z.number().default(0),

    notes: z.string().optional().nullable(),

    createdAt: z.instanceof(Temporal.Instant),
    updatedAt: z.instanceof(Temporal.Instant),

    items: GetPurchaseItemSchema.array().optional(),
})

export type GetPurchase = z.infer<typeof GetPurchaseSchema>;

export const CreatePurchaseSchema = z.object({
    storeId: UuidSchema,
    supplierId: UuidSchema,

    discountAmount: z.number().default(0),
    taxAmount: z.number().default(0),
    shippingCost: z.number().default(0),
    otherCost: z.number().default(0),

    amountPaid: z.number().default(0),

    notes: z.string().optional(),
})

export type CreatePurchaseInput = z.infer<typeof CreatePurchaseSchema>

export const UpdatePurchaseSchema = CreatePurchaseSchema.extend({
    id: UuidSchema.readonly(),
}).omit({
    supplierId: true,
}).partial()

export type UpdatePurchaseInput = z.infer<typeof UpdatePurchaseSchema>