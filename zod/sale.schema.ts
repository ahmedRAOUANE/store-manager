import { z } from "zod";
import { UuidSchema } from "./general.schema";
import { CreateSaleItemSchema, GetSaleItemSchema } from "./saleItem.schema";

export const GetSaleSchema = z.object({
    id: UuidSchema,
    storeId: UuidSchema,
    createdById: UuidSchema,

    invoiceNumber: z.string(),

    saleDate: z.instanceof(Temporal.Instant),

    subtotal: z.number().nonnegative(),
    discountAmount: z.number().nonnegative(),
    taxAmount: z.number().nonnegative(),
    totalAmount: z.number().nonnegative(),

    amountPaid: z.number().nonnegative(),
    amountDue: z.number().nonnegative(),

    notes: z.string().nullable(),

    createdAt: z.instanceof(Temporal.Instant),
    updatedAt: z.instanceof(Temporal.Instant),

});

export type GetSale = z.infer<typeof GetSaleSchema>;

export const GetsaleWithItemsSchema = GetSaleSchema.extend({
    createdBy: z.object({
        firstName: z.string(),
    }),
    items: GetSaleItemSchema.array(),
})

export type GetsaleWithItems = z.infer<typeof GetsaleWithItemsSchema>

export const CreateSaleSchema = z.object({
    discountAmount: z.number().nonnegative().default(0),
    taxAmount: z.number().nonnegative().default(0),

    amountPaid: z.number().nonnegative().default(0),
    notes: z.string().optional(),

    items: CreateSaleItemSchema
        .array()
        .min(1, "A sale must contain at least one item")
        .superRefine((items, ctx) => {
            const productIds = new Set<string>();

            items.forEach((item, index) => {
                if (productIds.has(item.productId)) {
                    ctx.addIssue({
                        code: "custom",
                        path: [index, "productId"],
                        message: "Product already exists in this sale",
                    });
                }

                productIds.add(item.productId);
            });
        }),
});

export type CreateSaleInput = z.infer<typeof CreateSaleSchema>;

export const UpdateSaleSchema = z.object({
    amountPaid: z.number().nonnegative().optional(),
    notes: z.string().nullable().optional(),
});

export type UpdateSaleInput = z.infer<typeof UpdateSaleSchema>;