import { describe, it, expect } from "vitest";
import {
    createPurchaseService,
    deleteAllPurchasesService,
    deletePurchaseService,
    getAllPurchasesService,
    getPurchaseByIdService,
    updatePurchaseService,
} from "../../services/purchase.services";
import { createSupplierService } from "../../services/supplier.services";
import {
    createProductsService,
    getSingleProductService,
} from "../../services/product.services";
import { createStoreService } from "../../services/store.services";
import { AppError } from "../../errors/base.error";
import { DatabaseError } from "../../errors/db.error";
import type { CreateStoreInput } from "../../zod/store.schema";
import type {
    CreatePurchaseInput,
    UpdatePurchaseInput,
} from "../../zod/purchase.schema";
import type { CreatePurchaseItemInput } from "../../zod/purchaseItem.schema";

/**
 * Shared owner for test stores. Same ID used across other integration
 * test files. Assumed to be a real user row in the dev DB.
 */
const ownerId = "52b45375-ce27-4859-8839-d991d3634330";

const createTestStore = async () => {
    const storeData: CreateStoreInput = {
        name: `Purchase test store ${crypto.randomUUID()}`,
        description: null,
        phone: null,
        email: null,
        address: null,
        currency: "DZ",
        timezone: "UTC",
    };

    const store = await createStoreService(ownerId, storeData);
    if (store instanceof AppError) throw store;

    return store;
};

const createPurchaseContext = async () => {
    const store = await createTestStore();

    const supplier = await createSupplierService({
        storeId: store.id,
        name: `Test supplier ${crypto.randomUUID()}`,
    });
    if (supplier instanceof AppError) throw supplier;

    const product = await createProductsService(store.id, {
        name: `Test product ${crypto.randomUUID()}`,
        description: "test description",
        unit: "piece",
        minimumStock: 5,
        sellingPrice: 15,
    });
    if (product instanceof AppError) throw product;

    return { store, supplier, product };
};

/**
 * Builds a `CreatePurchaseInput`. No `storeId` â€” that field lives on
 * the service signature now, not the payload.
 */
const buildPurchaseInput = (
    supplierId: string,
    overrides: Partial<CreatePurchaseInput> = {},
): CreatePurchaseInput => ({
    supplierId,
    discountAmount: 0,
    taxAmount: 0,
    shippingCost: 0,
    otherCost: 0,
    amountPaid: 0,
    notes: "test purchase",
    ...overrides,
});

const buildPurchaseItem = (
    productId: string,
    overrides: Partial<CreatePurchaseItemInput> = {},
): CreatePurchaseItemInput => ({
    productId,
    quantity: 5,
    unitCost: 10,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 50,
    lineSubtotal: 50,
    batchNumber: null,
    ...overrides,
});

describe("purchase service tests", () => {
    it(
        "should create a purchase",
        { tags: ["create", "purchase"] },
        async () => {
            const { store, supplier, product } =
                await createPurchaseContext();

            const purchase = buildPurchaseInput(supplier.id);
            const items = [
                buildPurchaseItem(product.id, {
                    quantity: 3,
                    unitCost: 10,
                }),
            ];

            const result = await createPurchaseService(
                store.id,
                purchase,
                items,
            );

            expect(result).not.toBeInstanceOf(AppError);
            if (result instanceof AppError) return;

            expect(result.created.id).toBeDefined();
            expect(result.created.invoiceNumber).toBeDefined();
            expect(result.created.storeId).toBe(store.id);
            expect(result.created.supplierId).toBe(supplier.id);
            expect(result.created.items).toHaveLength(1);

            const fetched = await getPurchaseByIdService(
                store.id,
                result.created.id,
            );
            expect(fetched).not.toBeInstanceOf(AppError);
            if (fetched instanceof AppError) return;

            expect(fetched.id).toBe(result.created.id);

            const productAfter = await getSingleProductService(
                store.id,
                product.id,
            );
            if (productAfter instanceof AppError) throw productAfter;

            expect(productAfter.stockQuantity).toBe(
                product.stockQuantity + 3,
            );
        },
    );

    it(
        "should get single purchase by its id",
        { tags: ["get", "purchase"] },
        async () => {
            const { store, supplier, product } =
                await createPurchaseContext();

            const purchase = buildPurchaseInput(supplier.id);
            const items = [buildPurchaseItem(product.id)];

            const result = await createPurchaseService(
                store.id,
                purchase,
                items,
            );

            expect(result).not.toBeInstanceOf(AppError);
            if (result instanceof AppError) return;

            const fetched = await getPurchaseByIdService(
                store.id,
                result.created.id,
            );

            expect(fetched).not.toBeInstanceOf(AppError);
            if (fetched instanceof AppError) return;

            expect(fetched.id).toBe(result.created.id);
            expect(fetched.storeId).toBe(store.id);
            expect(fetched.supplierId).toBe(supplier.id);
            expect(fetched.items).toHaveLength(1);
        },
    );

    it(
        "should get all purchases from the db",
        { tags: ["get", "all", "purchases"] },
        async () => {
            const { store, supplier, product } =
                await createPurchaseContext();

            const first = await createPurchaseService(
                store.id,
                buildPurchaseInput(supplier.id),
                [buildPurchaseItem(product.id)],
            );
            if (first instanceof AppError) throw first;

            const second = await createPurchaseService(
                store.id,
                buildPurchaseInput(supplier.id),
                [buildPurchaseItem(product.id)],
            );
            if (second instanceof AppError) throw second;

            const result = await getAllPurchasesService(store.id);

            expect(result).not.toBeInstanceOf(AppError);
            if (result instanceof AppError) return;

            expect(Array.isArray(result)).toBe(true);

            const ids = result.map((p: {id: string}) => p.id);
            expect(ids).toContain(first.created.id);
            expect(ids).toContain(second.created.id);
        },
    );

    it(
        "should update a purchase",
        { tags: ["update", "purchase"] },
        async () => {
            const { store, supplier, product } =
                await createPurchaseContext();

            const result = await createPurchaseService(
                store.id,
                buildPurchaseInput(supplier.id, {
                    notes: "original note",
                }),
                [buildPurchaseItem(product.id)],
            );
            if (result instanceof AppError) throw result;

            const updatePayload: UpdatePurchaseInput = {
                id: result.created.id,
                notes: "updated note",
            };

            const updated = await updatePurchaseService(
                store.id,
                updatePayload,
            );

            expect(updated).not.toBeInstanceOf(AppError);

            const fetched = await getPurchaseByIdService(
                store.id,
                result.created.id,
            );
            if (fetched instanceof AppError) throw fetched;

            expect(fetched.notes).toBe("updated note");
        },
    );

    it(
        "should delete purchase by its id",
        { tags: ["delete", "purchase"] },
        async () => {
            const { store, supplier, product } =
                await createPurchaseContext();

            const result = await createPurchaseService(
                store.id,
                buildPurchaseInput(supplier.id),
                [buildPurchaseItem(product.id)],
            );
            if (result instanceof AppError) throw result;

            await deletePurchaseService(
                store.id,
                result.created.id,
            );

            const fetched = await getPurchaseByIdService(
                store.id,
                result.created.id,
            );

            expect(fetched).toBeInstanceOf(AppError);
        },
    );

    it(
        "should delete all purchases from the db",
        { tags: ["delete", "all", "purchases"] },
        async () => {
            const { store, supplier, product } =
                await createPurchaseContext();

            await createPurchaseService(
                store.id,
                buildPurchaseInput(supplier.id),
                [buildPurchaseItem(product.id)],
            );
            await createPurchaseService(
                store.id,
                buildPurchaseInput(supplier.id),
                [buildPurchaseItem(product.id)],
            );

            const before = await getAllPurchasesService(store.id);
            if (before instanceof AppError) throw before;
            expect(before.length).toBeGreaterThanOrEqual(2);

            await deleteAllPurchasesService(store.id);

            const after = await getAllPurchasesService(store.id);
            if (after instanceof AppError) throw after;

            expect(after.length).toBe(0);
        },
    );

    it(
        "should roll back the whole transaction when one item is invalid",
        { tags: ["create", "purchase", "rollback"] },
        async () => {
            const { store, supplier, product } =
                await createPurchaseContext();

            const stockBefore = product.stockQuantity;

            const items = [
                buildPurchaseItem(product.id, {
                    quantity: 3,
                    unitCost: 10,
                }),
                buildPurchaseItem(crypto.randomUUID(), {
                    quantity: 2,
                    unitCost: 10,
                }),
            ];

            const purchase = buildPurchaseInput(supplier.id);

            await expect(
                createPurchaseService(store.id, purchase, items),
            ).rejects.toBeInstanceOf(DatabaseError);

            const productAfter = await getSingleProductService(
                store.id,
                product.id,
            );
            if (productAfter instanceof AppError) throw productAfter;

            expect(productAfter.stockQuantity).toBe(stockBefore);

            const purchasesAfter = await getAllPurchasesService(
                store.id,
            );
            if (purchasesAfter instanceof AppError) throw purchasesAfter;

            expect(purchasesAfter).toHaveLength(0);
        },
    );

    /**
     * Cross-store authorization test.
     *
     * The `storeId` passed to `createPurchaseService` is now trusted
     * (came from the URL-bound authorization wrapper). The items, by
     * contrast, still reference products the caller claims exist. If
     * a caller authorized for Store A passes a productId that actually
     * belongs to Store B, the inventory mutation path (`WHERE id = X
     * AND storeId = A`) finds no row and throws `"Product not found"`.
     *
     * The whole transaction rolls back. Store B's product must be
     * untouched â€” not debited, not notified, not modified.
     *
     * This test verifies the fix at the service boundary. It does not
     * verify the action-layer authorization (that requires mocking the
     * auth context), but it proves the service cannot be tricked into
     * mutating a foreign store's inventory.
     */
    it(
        "should reject a purchase whose product belongs to another store",
        { tags: ["create", "purchase"] },
        async () => {
            const storeA = await createTestStore();
            const storeB = await createTestStore();

            const supplierA = await createSupplierService({
                storeId: storeA.id,
                name: `Supplier A ${crypto.randomUUID()}`,
            });
            if (supplierA instanceof AppError) throw supplierA;

            const productB = await createProductsService(storeB.id, {
                name: `Product B ${crypto.randomUUID()}`,
                description: "belongs to store B",
                unit: "piece",
                minimumStock: 5,
                sellingPrice: 20,
            });
            if (productB instanceof AppError) throw productB;

            const stockBBefore = productB.stockQuantity;

            const purchase = buildPurchaseInput(supplierA.id);
            const items = [
                buildPurchaseItem(productB.id, {
                    quantity: 10,
                    unitCost: 15,
                }),
            ];

            // Attempting to add Store B's product to a Store A purchase.
            // The service filters inventory updates by storeId, so the
            // product lookup fails and the transaction aborts.
            await expect(
                createPurchaseService(storeA.id, purchase, items),
            ).rejects.toBeInstanceOf(DatabaseError);

            // Store B's product must be untouched.
            const productBAfter = await getSingleProductService(
                storeB.id,
                productB.id,
            );
            if (productBAfter instanceof AppError) throw productBAfter;

            expect(productBAfter.stockQuantity).toBe(stockBBefore);

            // No purchase should have been created in Store A either.
            const purchasesInA = await getAllPurchasesService(
                storeA.id,
            );
            if (purchasesInA instanceof AppError) throw purchasesInA;

            expect(purchasesInA).toHaveLength(0);
        },
    );
});