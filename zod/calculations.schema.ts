import { z } from "zod";

export const AverageCostTermsSchema = z.object({
    existingStock: z.number().nonnegative(),
    existingAverageCost: z.number().nonnegative(),
    purchasedQuantity: z.number().nonnegative(),
    purchasedUnitCost: z.number().nonnegative(),
})

export type AverageCostTermsInput = z.infer<typeof AverageCostTermsSchema>

export const PurchaseItemSubtotalTermsSchema = z.object({
    quantity: z.number().nonnegative(),
    unitCost: z.number().nonnegative(),
});

export type PurchaseItemSubtotalTermsInput = z.infer<
    typeof PurchaseItemSubtotalTermsSchema
>;

export const PurchaseItemTotalTermsSchema = z.object({
    lineSubtotal: z.number().nonnegative(),
    discountAmount: z.number().nonnegative(),
    taxAmount: z.number().nonnegative(),
});

export type PurchaseItemTotalTermsInput = z.infer<
    typeof PurchaseItemTotalTermsSchema
>;

export const PurchaseSubtotalTermsSchema = z.object({
    lineSubtotals: z.array(z.number().nonnegative()),
});

export type PurchaseSubtotalTermsInput = z.infer<
    typeof PurchaseSubtotalTermsSchema
>;

export const PurchaseTotalTermsSchema = z.object({
    lineTotals: z.array(z.number().nonnegative()),
    discountAmount: z.number().nonnegative(),
    taxAmount: z.number().nonnegative(),
    shippingCost: z.number().nonnegative(),
    otherCost: z.number().nonnegative(),
});

export type PurchaseTotalTermsInput = z.infer<
    typeof PurchaseTotalTermsSchema
>;

export const PurchaseAmountDueTermsSchema = z.object({
    totalAmount: z.number().nonnegative(),
    amountPaid: z.number().nonnegative(),
});

export type PurchaseAmountDueTermsInput = z.infer<
    typeof PurchaseAmountDueTermsSchema
>;