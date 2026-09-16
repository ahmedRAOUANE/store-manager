import { AverageCostTermsInput, PurchaseAmountDueTermsInput, PurchaseItemSubtotalTermsInput, PurchaseItemTotalTermsInput, PurchaseSubtotalTermsInput, PurchaseTotalTermsInput } from "@/zod/calculations.schema";
import { CreatePurchaseInput } from "@/zod/purchase.schema";
import { CreatePurchaseItemInput } from "@/zod/purchaseItem.schema";

export const calculateProductNewAverageCost = ({
    existingStock,
    existingAverageCost,
    purchasedQuantity,
    purchasedUnitCost,
}: AverageCostTermsInput) => {
    const newStock = existingStock + purchasedQuantity;

    if (newStock === 0) {
        return 0;
    }

    return (
        (existingStock * existingAverageCost) +
        (purchasedQuantity * purchasedUnitCost)
    ) / newStock;
};

export const calculatePurchaseItemSubtotal = ({
    quantity,
    unitCost,
}: PurchaseItemSubtotalTermsInput) => {
    return quantity * unitCost;
};

export const calculatePurchaseItemTotal = ({
    lineSubtotal,
    discountAmount,
    taxAmount,
}: PurchaseItemTotalTermsInput) => {
    return lineSubtotal - discountAmount + taxAmount;
};

export const calculatePurchaseSubtotal = ({
    lineSubtotals,
}: PurchaseSubtotalTermsInput) => {
    return lineSubtotals.reduce(
        (subtotal, lineSubtotal) => subtotal + lineSubtotal,
        0
    );
};

export const calculatePurchaseTotal = ({
    lineTotals,
    discountAmount,
    taxAmount,
    shippingCost,
    otherCost,
}: PurchaseTotalTermsInput) => {
    const itemsTotal = lineTotals.reduce(
        (total, lineTotal) => total + lineTotal,
        0
    );

    return (
        itemsTotal
        - discountAmount
        + taxAmount
        + shippingCost
        + otherCost
    );
};

export const calculatePurchaseAmountDue = ({
    totalAmount,
    amountPaid,
}: PurchaseAmountDueTermsInput) => {
    return totalAmount - amountPaid;
};

export const calculatePurchase = (
    purchase: CreatePurchaseInput,
    items: CreatePurchaseItemInput[],
) => {
    const calculatedPurchaseItems = items.map((item) => {
        const lineSubtotal = calculatePurchaseItemSubtotal({
            quantity: item.quantity,
            unitCost: item.unitCost,
        });

        const totalAmount = calculatePurchaseItemTotal({
            lineSubtotal,
            discountAmount: item.discountAmount,
            taxAmount: item.taxAmount,
        });

        return {
            ...item,
            lineSubtotal,
            totalAmount,
        };
    });

    const subtotal = calculatePurchaseSubtotal({
        lineSubtotals: calculatedPurchaseItems.map(
            (item) => item.lineSubtotal
        ),
    });

    const totalAmount = calculatePurchaseTotal({
        lineTotals: calculatedPurchaseItems.map(
            (item) => item.totalAmount
        ),
        discountAmount: purchase.discountAmount,
        taxAmount: purchase.taxAmount,
        shippingCost: purchase.shippingCost,
        otherCost: purchase.otherCost,
    });

    const amountDue = calculatePurchaseAmountDue({
        totalAmount,
        amountPaid: purchase.amountPaid,
    });

    return {
        calculatedPurchaseItems,
        subtotal,
        totalAmount,
        amountDue,
    };
};
