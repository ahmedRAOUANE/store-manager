import { describe, it, expect } from "vitest";
import {
    createStoreService,
    activateStoreService,
} from "../services/store.services";
import {
    getSingleProductService,
} from "../services/product.services";
import { createSupplierService } from "../services/supplier.services";
import { createSaleService } from "../services/sale.services";
import { createPurchaseService } from "../services/purchase.services";
import { models } from "../prisma/db";
import { AppError } from "../errors/base.error";
import type { CreateStoreInput } from "../zod/store.schema";
import type { CreateSaleInput } from "../zod/sale.schema";
import type { CreatePurchaseInput } from "../zod/purchase.schema";
import type { CreatePurchaseItemInput } from "../zod/purchaseItem.schema";

/**
 * Shared owner for test stores. Same ID used across other integration
 * test files. Assumed to be a real user row in the dev DB.
 */
const ownerId = "52b45375-ce27-4859-8839-d991d3634330";

const createActiveStore = async () => {
    const storeData: CreateStoreInput = {
        name: `Concurrency test store ${crypto.randomUUID()}`,
        description: null,
        phone: null,
        email: null,
        address: null,
        currency: "DZ",
        timezone: "UTC",
    };

    const store = await createStoreService(ownerId, storeData);
    if (store instanceof AppError) throw store;

    const activated = await activateStoreService(store.id);
    if (activated instanceof AppError) throw activated;

    return store;
};

const countLowStockNotifications = async (storeId: string) => {
    const notifications = await models.Notification
        .where({
            recipientId: ownerId,
            storeId,
            type: "PRODUCT_LOW_STOCK",
        })
        .all();

    return notifications.length;
};

const buildSaleInput = (
    productId: string,
    quantity: number,
    unitPrice = 10,
): CreateSaleInput => ({
    discountAmount: 0,
    taxAmount: 0,
    amountPaid: 0,
    items: [
        {
            productId,
            quantity,
            unitPrice,
            discountAmount: 0,
            taxAmount: 0,
        },
    ],
});

describe("inventory concurrency", () => {
    it(
        "should serialize concurrent sales and detect low-stock crossing exactly once",
        { tags: ["inventory", "concurrency", "sale", "notification"] },
        async () => {
            const store = await createActiveStore();

            /*
             * Stock progression under any serial order of the 5 sales:
             *   10 → 8 → 6 → 4 → 2 → 0
             *
             * Crossing rule: before > M and after <= M (M = 3).
             *   (10→8): 10>3 true,  8<=3 false  → no crossing
             *   (8→6):   8>3 true,  6<=3 false  → no crossing
             *   (6→4):   6>3 true,  4<=3 false  → no crossing
             *   (4→2):   4>3 true,  2<=3 true   → CROSSING (exactly one)
             *   (2→0):   2>3 false              → no crossing
             *
             * So: exactly 1 notification, regardless of which sale ran when.
             */
            const product = await models.Product.create({
                storeId: store.id,
                name: `Concurrency sale product ${crypto.randomUUID()}`,
                stockQuantity: 10,
                minimumStock: 3,
                averageCost: 4,
                sellingPrice: 10,
            });

            const quantityPerSale = 2;
            const saleCount = 5;
            const expectedFinalStock =
                10 - quantityPerSale * saleCount; // 0

            const saleInput = buildSaleInput(product.id, quantityPerSale);

            // Fire all five in parallel. Postgres row locks on the
            // product force serialization regardless of client order.
            const results = await Promise.all(
                Array.from({ length: saleCount }, () =>
                    createSaleService(ownerId, store.id, saleInput),
                ),
            );

            const successes = results.filter(
                (r: unknown) => !(r instanceof AppError),
            );
            const failures = results.filter(
                (r: unknown) => r instanceof AppError,
            );

            // Every sale should succeed — there is enough stock.
            expect(failures).toHaveLength(0);
            expect(successes).toHaveLength(saleCount);

            const productAfter = await getSingleProductService(
                store.id,
                product.id,
            );
            if (productAfter instanceof AppError) throw productAfter;

            // If the FOR UPDATE lock were missing, one of these would
            // be true: final stock > 0 (lost update), final stock < 0
            // (over-decrement), or multiple notifications (each sale
            // independently saw the pre-crossing state).
            expect(productAfter.stockQuantity).toBe(expectedFinalStock);

            const saleRows = await models.Sale
                .where({ storeId: store.id })
                .all();
            expect(saleRows).toHaveLength(saleCount);

            const notificationCount = await countLowStockNotifications(
                store.id,
            );
            expect(notificationCount).toBe(1);
        },
    );

    it(
        "should prevent overselling when concurrent sales exceed available stock",
        { tags: ["inventory", "concurrency", "sale", "rollback"] },
        async () => {
            const store = await createActiveStore();

            /*
             * Stock: 3, min: 1. Five concurrent 1-unit sales.
             *
             * Exactly 3 should succeed (stock goes 3→2→1→0) and
             * 2 should fail with "Insufficient stock". If the lock
             * were missing, all 5 could read "stock=3" and succeed,
             * driving stock negative.
             *
             * Crossings: 3→2 (2<=1 false), 2→1 (2>1 true, 1<=1 true
             * — CROSSING), 1→0 (1>1 false). One notification.
             */
            const product = await models.Product.create({
                storeId: store.id,
                name: `Oversell test product ${crypto.randomUUID()}`,
                stockQuantity: 3,
                minimumStock: 1,
                averageCost: 4,
                sellingPrice: 10,
            });

            const saleCount = 5;
            const saleInput = buildSaleInput(product.id, 1);

            const results = await Promise.all(
                Array.from({ length: saleCount }, () =>
                    createSaleService(ownerId, store.id, saleInput),
                ),
            );

            const successes = results.filter(
                (r: unknown) => !(r instanceof AppError),
            );
            const failures = results.filter(
                (r: unknown) => r instanceof AppError,
            );

            expect(successes).toHaveLength(3);
            expect(failures).toHaveLength(2);

            const productAfter = await getSingleProductService(
                store.id,
                product.id,
            );
            if (productAfter instanceof AppError) throw productAfter;

            expect(productAfter.stockQuantity).toBe(0);

            const saleRows = await models.Sale
                .where({ storeId: store.id })
                .all();
            expect(saleRows).toHaveLength(3);

            // Crossing detected exactly once despite 5 concurrent
            // transactions and 2 rollbacks in the mix.
            const notificationCount = await countLowStockNotifications(
                store.id,
            );
            expect(notificationCount).toBe(1);
        },
    );

    it(
        "should serialize concurrent purchases and increment stock correctly",
        { tags: ["inventory", "concurrency", "purchase"] },
        async () => {
            const store = await createActiveStore();

            const supplier = await createSupplierService({
                storeId: store.id,
                name: `Concurrency supplier ${crypto.randomUUID()}`,
            });
            if (supplier instanceof AppError) throw supplier;

            /*
             * Stock: 5, min: 3. Five concurrent 3-unit purchases.
             *
             * Final stock must be 5 + 5*3 = 20. If the lock were
             * missing, some increments would be lost — final would be
             * less than 20.
             *
             * Purchases only increase stock, so no low-stock crossing
             * should fire at any point.
             */
            const product = await models.Product.create({
                storeId: store.id,
                name: `Purchase concurrency product ${crypto.randomUUID()}`,
                stockQuantity: 5,
                minimumStock: 3,
                averageCost: 4,
                sellingPrice: 10,
            });

            const quantityPerPurchase = 3;
            const purchaseCount = 5;
            const expectedFinalStock =
                5 + quantityPerPurchase * purchaseCount; // 20

            const purchaseInput: CreatePurchaseInput = {
                supplierId: supplier.id,
                discountAmount: 0,
                taxAmount: 0,
                shippingCost: 0,
                otherCost: 0,
                amountPaid: 0,
                notes: "concurrency test",
            };

            const purchaseItems: CreatePurchaseItemInput[] = [
                {
                    productId: product.id,
                    quantity: quantityPerPurchase,
                    unitCost: 4,
                    discountAmount: 0,
                    taxAmount: 0,
                    totalAmount: quantityPerPurchase * 4,
                    lineSubtotal: quantityPerPurchase * 4,
                    batchNumber: null,
                },
            ];

            const results = await Promise.all(
                Array.from({ length: purchaseCount }, () =>
                    createPurchaseService(
                        store.id,
                        purchaseInput,
                        purchaseItems,
                    ),
                ),
            );

            const successes = results.filter(
                (r: unknown) => !(r instanceof AppError),
            );

            expect(successes).toHaveLength(purchaseCount);

            const productAfter = await getSingleProductService(
                store.id,
                product.id,
            );
            if (productAfter instanceof AppError) throw productAfter;

            expect(productAfter.stockQuantity).toBe(expectedFinalStock);

            // Purchases only increase stock, so the crossing rule
            // never fires.
            const notificationCount = await countLowStockNotifications(
                store.id,
            );
            expect(notificationCount).toBe(0);
        },
    );
});