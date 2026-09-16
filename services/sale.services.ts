import { db, models } from "@/prisma/db";
import { CreateSaleInput, GetSaleSchema, GetsaleWithItemsSchema, UpdateSaleInput } from "@/zod/sale.schema";
import { getSingleProductService, updateProductCalculatedFieldsService } from "./product.services";
import { AppError } from "@/errors/base.error";
import { calculateSale, calculateSaleAmountDue, calculateSaleItemSubtotal, calculateSaleItemTotal, calculateSaleItemTotalCost } from "@/calculations/sales";
import { DatabaseError } from "@/errors/db.error";
import { ValidationError } from "@/errors/validation.error";
import { isUuid } from "@/utils/uuid";

// this is for store management to get the sales
export const getSalesService = async (storeId: string) => {
    if (!isUuid(storeId)) {
        return new ValidationError("invalid store id provided")
    }

    try {
        const dbSales = await db.orm.public.Sale
            .where({
                storeId,
            })
            .all();

        const parsedSales = GetSaleSchema.array().safeParse(dbSales);
        if (!parsedSales.success) {
            return new ValidationError("invalid sales provided from the db")
        }

        return parsedSales.data;
    } catch (error) {
        console.log(
            "services/sale.services.ts > getSalesService > ",
            error
        );

        throw new DatabaseError(
            "unable to get sales",
            error as Record<string, unknown>
        );
    }
};

// this is for staff to get their own sales
export const getSalesWithIdService = async (storeId: string, userId: string) => {
    if (!isUuid(storeId)) {
        return new ValidationError("invalid store id provided")
    }

    try {
        const dbSales = await db.orm.public.Sale
            .where({
                storeId,
                createdById: userId
            })
            .all();

        const parsedSales = GetSaleSchema.array().safeParse(dbSales);
        if (!parsedSales.success) {
            return new ValidationError("invalid sales provided from the db")
        }

        return parsedSales.data;
    } catch (error) {
        console.log(
            "services/sale.services.ts > getSalesService > ",
            error
        );

        throw new DatabaseError(
            "unable to get sales",
            error as Record<string, unknown>
        );
    }
};

export const getSaleByIdService = async (
    storeId: string,
    saleId: string
) => {
    if (!isUuid(storeId)) {
        return new ValidationError("invalid store id provided")
    }

    if (!isUuid(saleId)) {
        return new ValidationError("invalid sale id provided")
    }

    try {
        const dbSale = await models.Sale
            .where({
                id: saleId,
                storeId,
            })
            .include('items', (items) => {
                return items.include('product', (product) => {
                    return product.select('name')
                })
            })
            .include('createdBy', (createdBy) => {
                return createdBy.select('firstName')
            })
            .first();

        if (!dbSale) {
            throw new AppError("Sale not found");
        }

        const parsedSale = GetsaleWithItemsSchema.safeParse(dbSale);
        if (!parsedSale.success) {
            return new ValidationError("invalid sale provided from the db")
        }

        return parsedSale.data;
    } catch (error) {
        console.log(
            "services/sale.services.ts > getSaleByIdService > ",
            error
        );

        if (error instanceof AppError) {
            return error;
        }

        throw new DatabaseError(
            "unable to get sale",
            error as Record<string, unknown>
        );
    }
};

export const createSaleService = async (
    userId: string,
    storeId: string,
    sale: CreateSaleInput
) => {
    if (!isUuid(storeId)) {
        return new ValidationError("invalid store id provided")
    }

    if (!isUuid(userId)) {
        return new ValidationError("invalid user id provided")
    }

    try {
        const result = await db.transaction(async (transaction) => {
            const saleItemsData: {
                productId: string,
                quantity: number,
                unitPrice: number,
                discountAmount: number,
                taxAmount: number,
                lineSubtotal: number,
                totalAmount: number,
                unitCost: number,
                totalCost: number,
            }[] = [];
            const lineSubtotals: number[] = [];

            for (const item of sale.items) {
                const product = await getSingleProductService(
                    storeId,
                    item.productId,
                    transaction
                );

                if (product instanceof AppError) {
                    throw product;
                }

                // The sale cannot exceed the available stock.
                if (product.stockQuantity < item.quantity) {
                    throw new AppError(
                        `Insufficient stock for product: ${product.name}`
                    );
                }

                // Capture the product's current average cost.
                const unitCost = product.averageCost;

                const lineSubtotal =
                    calculateSaleItemSubtotal({
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                    });

                const totalAmount =
                    calculateSaleItemTotal({
                        lineSubtotal,
                        discountAmount: item.discountAmount,
                        taxAmount: item.taxAmount,
                    });

                const totalCost =
                    calculateSaleItemTotalCost({
                        quantity: item.quantity,
                        unitCost,
                    });

                lineSubtotals.push(lineSubtotal);

                // Decrease inventory.
                const updatedProduct =
                    await updateProductCalculatedFieldsService(
                        storeId,
                        product.id,
                        {
                            stockQuantity:
                                product.stockQuantity -
                                item.quantity,
                            averageCost:
                                product.averageCost,
                        },
                        transaction
                    );

                if (updatedProduct instanceof AppError) {
                    throw updatedProduct;
                }

                saleItemsData.push({
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    discountAmount: item.discountAmount,
                    taxAmount: item.taxAmount,
                    lineSubtotal,
                    totalAmount,
                    unitCost,
                    totalCost,
                });
            }

            const {
                subtotal,
                totalAmount,
                amountDue,
            } = calculateSale({
                lineSubtotals,
                discountAmount: sale.discountAmount,
                taxAmount: sale.taxAmount,
                amountPaid: sale.amountPaid,
            });

            if (sale.amountPaid > totalAmount) {
                throw new AppError(
                    "Amount paid cannot be greater than the sale total"
                );
            }

            const createdSale = await transaction.orm.public.Sale.create({
                storeId,
                createdById: userId,

                subtotal,
                discountAmount: sale.discountAmount,
                taxAmount: sale.taxAmount,
                totalAmount,

                amountPaid: sale.amountPaid,
                amountDue,

                notes: sale.notes ?? null,

                items: (items) => items.create(saleItemsData),
            });

            return createdSale;
        });

        return result;
    } catch (error) {
        console.log(
            "services/sale.services.ts > createSaleService > ",
            error
        );

        if (error instanceof AppError) {
            return error;
        }

        throw new DatabaseError(
            "unable to create sale",
            error as Record<string, unknown>
        );
    }
};

export const updateSaleService = async (
    storeId: string,
    saleId: string,
    sale: UpdateSaleInput
) => {
    if (!isUuid(storeId)) {
        return new ValidationError("invalid store id provided")
    }

    if (!isUuid(saleId)) {
        return new ValidationError("invalid sale id provided")
    }

    try {
        const existingSale = await db.orm.public.Sale
            .where({
                id: saleId,
                storeId,
            })
            .first();

        if (!existingSale) {
            throw new AppError("Sale not found");
        }

        if (
            sale.amountPaid !== undefined &&
            sale.amountPaid > existingSale.totalAmount
        ) {
            throw new AppError(
                "Amount paid cannot be greater than the sale total"
            );
        }

        const amountPaid =
            sale.amountPaid ?? existingSale.amountPaid;

        const amountDue =
            calculateSaleAmountDue({
                totalAmount: existingSale.totalAmount,
                amountPaid,
            });

        return await db.orm.public.Sale
            .where({
                id: saleId,
                storeId,
            })
            .update({
                ...(sale.amountPaid !== undefined && {
                    amountPaid: sale.amountPaid,
                }),

                ...(sale.notes !== undefined && {
                    notes: sale.notes,
                }),

                amountDue,
            });
    } catch (error) {
        console.log(
            "services/sale.services.ts > updateSaleService > ",
            error
        );

        if (error instanceof AppError) {
            return error;
        }

        throw new DatabaseError(
            "unable to update sale",
            error as Record<string, unknown>
        );
    }
};