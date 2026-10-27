import {
    createSaleService,
    getSaleByIdService,
    getSalesService,
} from "../../services/sale.services";
import { AppError } from "../../errors/base.error";
import { db, models } from "../../prisma/db";
import type { CreateSaleInput } from "../../zod/sale.schema";
import { describe, expect, it } from "vitest";
import { CreateStoreInput } from "../../zod/store.schema";
import { activateStoreService, createStoreService } from "../../services/store.services";

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

    it(
        "creates a low-stock notification when a sale crosses the threshold",
        { tags: ["create", "sale", "inventory", "notification"] },
        async () => {
            const storeData: CreateStoreInput = {
                name: `Low - stock test store ${crypto.randomUUID()}`,
                description: null,
                phone: null,
                email: null,
                address: null,
                currency: "DZ",
                timezone: "UTC",
            };

            const store = await createStoreService(userId, storeData);

            expect(store).not.toBeInstanceOf(Error);

            if (store instanceof Error) {
                throw store;
            }

            const activationResult = await activateStoreService(store.id);
            // `activateStoreService` now returns the updated store row
            // (not `true`). See services/store.services.ts.
            expect(activationResult).not.toBeInstanceOf(AppError);

            // Stock goes from 5 to 2, reaching the minimum-stock threshold.
            const product = await models.Product.create({
                storeId: store.id,
                name: `Low - stock test product ${crypto.randomUUID()}`,
                stockQuantity: 5,
                minimumStock: 2,
                averageCost: 4,
                sellingPrice: 10,
            });

            const sale: CreateSaleInput = {
                discountAmount: 0,
                taxAmount: 0,
                amountPaid: 0,
                items: [
                    {
                        productId: product.id,
                        quantity: 3,
                        unitPrice: 10,
                        discountAmount: 0,
                        taxAmount: 0,
                    },
                ],
            };

            const createdSale = await createSaleService(
                userId,
                store.id,
                sale,
            );

            expect(createdSale).not.toBeInstanceOf(Error);

            if (createdSale instanceof Error) {
                throw createdSale;
            }

            const productAfter = await models.Product
                .where({
                    id: product.id,
                    storeId: store.id,
                })
                .first();

            expect(productAfter?.stockQuantity).toBe(2);

            const notifications = await models.Notification
                .where({
                    recipientId: userId,
                    storeId: store.id,
                    type: "PRODUCT_LOW_STOCK",
                })
                .all();

            expect(notifications).toHaveLength(1);
            expect(notifications[0].payload).toEqual({
                productId: product.id,
                productName: product.name,
                stockQuantity: 2,
                minimumStock: 2,
            });
        },
    );

    it(
        "rolls back a low-stock notification when the sale fails after inventory mutation",
        { tags: ["create", "sale", "inventory", "notification", "rollback"] },
        async () => {
            const storeData: CreateStoreInput = {
                name: `Notification rollback store ${crypto.randomUUID()}`,
                description: null,
                phone: null,
                email: null,
                address: null,
                currency: "DZ",
                timezone: "UTC",
            };

            const store = await createStoreService(userId, storeData);

            if (store instanceof Error) {
                throw store;
            }

            await activateStoreService(store.id);

            const product = await models.Product.create({
                storeId: store.id,
                name: `Notification rollback product ${crypto.randomUUID()}`,
                stockQuantity: 5,
                minimumStock: 2,
                averageCost: 4,
                sellingPrice: 10,
            });

            const sale: CreateSaleInput = {
                discountAmount: 0,
                taxAmount: 0,
                amountPaid: 100,
                items: [
                    {
                        productId: product.id,
                        quantity: 3,
                        unitPrice: 10,
                        discountAmount: 0,
                        taxAmount: 0,
                    },
                ],
            };

            const result = await createSaleService(userId, store.id, sale);

            expect(result).toBeInstanceOf(Error);

            const productAfter = await models.Product
                .where({
                    id: product.id,
                    storeId: store.id,
                })
                .first();

            expect(productAfter?.stockQuantity).toBe(5);

            const notifications = await models.Notification
                .where({
                    recipientId: userId,
                    storeId: store.id,
                    type: "PRODUCT_LOW_STOCK",
                })
                .all();

            expect(notifications).toHaveLength(0);
        },
    );
});