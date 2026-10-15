import {
    createSaleService,
    getSaleByIdService,
    getSalesService,
} from "../services/sale.services";
import { AppError } from "../errors/base.error";
import { db } from "../prisma/db";
import type { CreateSaleInput } from "../zod/sale.schema";
import { describe, expect, it } from "vitest";

describe("sales tests", () => {
    const storeId = "8dacefdb-2c06-41e8-a845-a6a9c2cba418";
    const userId = "52b45375-ce27-4859-8839-d991d3634330";
    const productId = "0e0fb388-7879-4171-8716-3e9cb0577d8f";

    const getProduct = async () => {
        const product = await db.orm.public.Product
            .where({
                id: productId,
                storeId,
            })
            .first();

        expect(product, "Test product must exist").not.toBeNull();

        return product!;
    };

    it(
        "should get all sales",
        { tags: ["get", "all", "sales"] },
        async () => {
            const allSales = await getSalesService(storeId);

            expect(allSales).not.toBeInstanceOf(Error);
            expect(Array.isArray(allSales)).toBe(true);
        },
    );

    it(
        "should get a sale by its ID when one exists",
        { tags: ["get", "sale"] },
        async () => {
            const allSales = await getSalesService(storeId);

            expect(Array.isArray(allSales)).toBe(true);

            if (!Array.isArray(allSales) || allSales.length === 0) {
                return;
            }

            const sale = await getSaleByIdService(
                storeId,
                allSales[0].id,
            );

            expect(sale).not.toBeInstanceOf(Error);

            if (sale instanceof Error) {
                return;
            }

            expect(sale.id).toBe(allSales[0].id);
            expect(sale.storeId).toBe(storeId);
            expect(Array.isArray(sale.items)).toBe(true);
        },
    );

    it(
        "should create a sale and decrease product stock",
        { tags: ["create", "sale", "inventory"] },
        async () => {
            const productBefore = await getProduct();

            expect(productBefore.stockQuantity).toBeGreaterThanOrEqual(1);

            const quantity = 1;

            const sale: CreateSaleInput = {
                discountAmount: 0,
                taxAmount: 0,
                amountPaid: 10.5,
                items: [
                    {
                        productId,
                        quantity,
                        unitPrice: 10.5,
                        discountAmount: 0,
                        taxAmount: 0,
                    },
                ],
            };

            const createdSale = await createSaleService(
                userId,
                storeId,
                sale,
            );

            expect(createdSale).not.toBeInstanceOf(Error);

            if (createdSale instanceof Error) {
                return;
            }

            expect(createdSale.storeId).toBe(storeId);
            expect(createdSale.createdById).toBe(userId);

            const productAfter = await getProduct();

            expect(productAfter.stockQuantity).toBe(
                productBefore.stockQuantity - quantity,
            );
        },
    );

    it(
        "should reject a sale that exceeds available stock without changing inventory",
        { tags: ["create", "sale", "inventory", "rollback"] },
        async () => {
            const productBefore = await getProduct();

            const sale: CreateSaleInput = {
                discountAmount: 0,
                taxAmount: 0,
                amountPaid: 0,
                items: [
                    {
                        productId,
                        quantity: productBefore.stockQuantity + 1,
                        unitPrice: 1,
                        discountAmount: 0,
                        taxAmount: 0,
                    },
                ],
            };

            const result = await createSaleService(
                userId,
                storeId,
                sale,
            );

            expect(result).toBeInstanceOf(AppError);

            const productAfter = await getProduct();

            expect(productAfter.stockQuantity).toBe(
                productBefore.stockQuantity,
            );
        },
    );
});