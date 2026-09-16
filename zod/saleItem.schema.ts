import { z } from "zod";
import { UuidSchema } from "./general.schema";

export const GetSaleItemSchema = z.object({
    id: UuidSchema,
    saleId: UuidSchema,
    productId: UuidSchema,

    productName: z.string().optional(),

    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative(),

    discountAmount: z.number().nonnegative(),
    taxAmount: z.number().nonnegative(),

    lineSubtotal: z.number().nonnegative(),
    totalAmount: z.number().nonnegative(),

    // Calculated from the product's average cost
    // at the time of the sale.
    unitCost: z.number().nonnegative(),
    totalCost: z.number().nonnegative(),

    product: z.object({
        name: z.string()
    }),

    createdAt: z.instanceof(Temporal.Instant),
    updatedAt: z.instanceof(Temporal.Instant),
});

export type GetSaleItem = z.infer<typeof GetSaleItemSchema>;

export const CreateSaleItemSchema = z.object({
    productId: UuidSchema,

    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative(),

    discountAmount: z.number().nonnegative().default(0),
    taxAmount: z.number().nonnegative().default(0),
});

export type CreateSaleItemInput = z.infer<
    typeof CreateSaleItemSchema
>;