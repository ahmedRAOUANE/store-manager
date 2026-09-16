export type CalculateSaleItemSubtotalInput = {
    quantity: number;
    unitPrice: number;
};

export const calculateSaleItemSubtotal = ({
    quantity,
    unitPrice,
}: CalculateSaleItemSubtotalInput) => {
    return quantity * unitPrice;
};

export type CalculateSaleItemTotalInput = {
    lineSubtotal: number;
    discountAmount: number;
    taxAmount: number;
};

export const calculateSaleItemTotal = ({
    lineSubtotal,
    discountAmount,
    taxAmount,
}: CalculateSaleItemTotalInput) => {
    return lineSubtotal - discountAmount + taxAmount;
};

export type CalculateSaleItemTotalCostInput = {
    quantity: number;
    unitCost: number;
};

export const calculateSaleItemTotalCost = ({
    quantity,
    unitCost,
}: CalculateSaleItemTotalCostInput) => {
    return quantity * unitCost;
};

export const calculateSaleSubtotal = (
    lineSubtotals: number[]
) => {
    return lineSubtotals.reduce(
        (total, subtotal) => total + subtotal,
        0
    );
};

export type CalculateSaleTotalInput = {
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
};

export const calculateSaleTotal = ({
    subtotal,
    discountAmount,
    taxAmount,
}: CalculateSaleTotalInput) => {
    return subtotal - discountAmount + taxAmount;
};

export type CalculateSaleAmountDueInput = {
    totalAmount: number;
    amountPaid: number;
};

export const calculateSaleAmountDue = ({
    totalAmount,
    amountPaid,
}: CalculateSaleAmountDueInput) => {
    return totalAmount - amountPaid;
};

export type CalculateSaleInput = {
    lineSubtotals: number[];
    discountAmount: number;
    taxAmount: number;
    amountPaid: number;
};

export const calculateSale = ({
    lineSubtotals,
    discountAmount,
    taxAmount,
    amountPaid,
}: CalculateSaleInput) => {
    const subtotal = calculateSaleSubtotal(lineSubtotals);

    const totalAmount = calculateSaleTotal({
        subtotal,
        discountAmount,
        taxAmount,
    });

    const amountDue = calculateSaleAmountDue({
        totalAmount,
        amountPaid,
    });

    return {
        subtotal,
        totalAmount,
        amountDue,
    };
};