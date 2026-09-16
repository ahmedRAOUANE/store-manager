import { z } from "zod";
import { UuidSchema } from "./general.schema";

export const CreateProductInputSchema = z.object({
    name: z.string().nonempty(),
    barcode: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    unit: z.string().optional(),

    minimumStock: z.number().nonnegative().optional(),
    sellingPrice: z.number().nonnegative().optional(),
    isActive: z.boolean().optional(),
});

export type CreateProductInput = z.infer<
    typeof CreateProductInputSchema
>;

export const UpdateProductInputSchema =
    CreateProductInputSchema.partial();

export type UpdateProductInput = z.infer<
    typeof UpdateProductInputSchema
>;

export const UpdateProductCalculatedFieldsSchema = z.object({
    stockQuantity: z.number().nonnegative(), 
    averageCost: z.number().nonnegative()
})

export type UpdateProductCalculatedFieldsInput = z.infer<
    typeof UpdateProductCalculatedFieldsSchema
>;

export const GetProductSchema = z.object({
    id: UuidSchema,
    storeId: UuidSchema,

    name: z.string(),
    sku: z.string(),

    barcode: z.string().nullable(),
    description: z.string().nullable(),

    unit: z.string(),

    stockQuantity: z.number().nonnegative(),
    minimumStock: z.number().nonnegative(),
    averageCost: z.number().nonnegative(),
    sellingPrice: z.number().nonnegative(),

    isActive: z.boolean(),

    createdAt: z.instanceof(Temporal.Instant),
    updatedAt: z.instanceof(Temporal.Instant),
});

export type GetProduct = z.infer<typeof GetProductSchema>;

export const GetForSaleProductsSchema = z.object({
    id: UuidSchema,

    name: z.string(),
    sku: z.string(),

    barcode: z.string().nullable().optional(),

    unit: z.string(),

    stockQuantity: z.number().nonnegative(),
    sellingPrice: z.number().nonnegative(),

    isActive: z.boolean(),
});

export type GetForSaleProducts = z.infer<typeof GetForSaleProductsSchema>;