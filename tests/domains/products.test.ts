import { describe, it, expect } from "vitest";
import {
    createProductsService,
    deleteAllProductsService,
    deleteProductService,
    getProductsService,
    getSingleProductService,
    updateProductService,
} from "../services/product.services";
import { createStoreService } from "../services/store.services";
import { AppError } from "../errors/base.error";
import type { CreateStoreInput } from "../zod/store.schema";
import type {
    CreateProductInput,
    UpdateProductInput,
} from "../zod/product.schema";

/**
 * Shared owner for test stores. Same ID used across other integration
 * test files (`store.test.ts`, `membership.test.ts`, `supplier.test.ts`).
 * Assumed to be a real user row in the dev DB.
 */
const ownerId = "52b45375-ce27-4859-8839-d991d3634330";

const createTestStore = async () => {
    const storeData: CreateStoreInput = {
        name: `Product test store ${crypto.randomUUID()}`,
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

const createTestProduct = async (
    storeId: string,
    overrides: Partial<CreateProductInput> = {},
) => {
    const productData: CreateProductInput = {
        name: `Test product ${crypto.randomUUID()}`,
        description: "test description",
        unit: "piece",
        minimumStock: 5,
        sellingPrice: 10.5,
        ...overrides,
    };

    const created = await createProductsService(storeId, productData);
    if (created instanceof AppError) throw created;

    return created;
};

describe("product service tests", () => {
    it(
        "should create a product",
        { tags: ["create", "product"] },
        async () => {
            const store = await createTestStore();
            const name = `Test product ${crypto.randomUUID()}`;

            const created = await createProductsService(store.id, {
                name,
                description: "test description",
                unit: "piece",
                minimumStock: 5,
                sellingPrice: 10.5,
            });

            expect(created).not.toBeInstanceOf(AppError);
            if (created instanceof AppError) return;

            expect(created.id).toBeDefined();
            expect(created.name).toBe(name);
            expect(created.storeId).toBe(store.id);
            expect(created.sellingPrice).toBe(10.5);
            expect(created.minimumStock).toBe(5);
            expect(created.isActive).toBe(true);
        },
    );

    it(
        "should get single product by its id",
        { tags: ["get", "product"] },
        async () => {
            const store = await createTestStore();
            const product = await createTestProduct(store.id);

            const fetched = await getSingleProductService(
                store.id,
                product.id,
            );

            expect(fetched).not.toBeInstanceOf(AppError);
            if (fetched instanceof AppError) return;

            expect(fetched.id).toBe(product.id);
            expect(fetched.name).toBe(product.name);
            expect(fetched.storeId).toBe(store.id);
        },
    );

    it(
        "should get all products from the db",
        { tags: ["get", "all", "products"] },
        async () => {
            const store = await createTestStore();
            const name1 = `Product A ${crypto.randomUUID()}`;
            const name2 = `Product B ${crypto.randomUUID()}`;

            await createTestProduct(store.id, { name: name1 });
            await createTestProduct(store.id, { name: name2 });

            const result = await getProductsService(store.id);

            expect(result).not.toBeInstanceOf(AppError);
            if (result instanceof AppError) return;

            expect(Array.isArray(result)).toBe(true);

            const names = result.map((p: { name: string }) => p.name);
            expect(names).toContain(name1);
            expect(names).toContain(name2);
        },
    );

    it(
        "should update a product",
        { tags: ["update", "product"] },
        async () => {
            const store = await createTestStore();
            const product = await createTestProduct(store.id);

            /*
             * Payload matches the full field set the original test used.
             * `UpdateProductInput` schema not verified — if it turns out
             * to be partial, this still works; if it requires all fields,
             * this satisfies it.
             */
            const updatePayload: UpdateProductInput = {
                name: "Updated product name",
                description: "updated description",
                unit: "piece",
                minimumStock: 5,
                sellingPrice: 20.0,
                isActive: true,
            };

            const updated = await updateProductService(
                store.id,
                product.id,
                updatePayload,
            );

            expect(updated).not.toBeInstanceOf(AppError);

            const fetched = await getSingleProductService(
                store.id,
                product.id,
            );
            if (fetched instanceof AppError) throw fetched;

            expect(fetched.name).toBe("Updated product name");
            expect(fetched.sellingPrice).toBe(20.0);
            expect(fetched.description).toBe("updated description");
        },
    );

    it(
        "should delete product by its id",
        { tags: ["delete", "product"] },
        async () => {
            const store = await createTestStore();
            const product = await createTestProduct(store.id);

            // Note argument order: (storeId, productId), unlike supplier.
            await deleteProductService(store.id, product.id);

            const fetched = await getSingleProductService(
                store.id,
                product.id,
            );

            // Same pattern as supplier: `getSingleProductService` returns
            // `ValidationError` (an `AppError`) when the row is missing,
            // because the schema can't parse `null`.
            expect(fetched).toBeInstanceOf(AppError);
        },
    );

    it(
        "should delete all products from the db",
        { tags: ["delete", "all", "products"] },
        async () => {
            const store = await createTestStore();

            await createTestProduct(store.id);
            await createTestProduct(store.id);

            const before = await getProductsService(store.id);
            if (before instanceof AppError) throw before;
            expect(before.length).toBeGreaterThanOrEqual(2);

            await deleteAllProductsService(store.id);

            const after = await getProductsService(store.id);
            if (after instanceof AppError) throw after;

            // `deleteAllProductsService` already uses `.deleteAll()`
            // (unlike supplier before the fix), so this should pass.
            // If it fails, we've found another multi-row delete bug.
            expect(after.length).toBe(0);
        },
    );
});