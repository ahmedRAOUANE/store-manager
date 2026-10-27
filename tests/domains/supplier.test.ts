import { describe, it, expect } from "vitest";
import {
    createSupplierService,
    deleteAllSuppliersService,
    deleteSupplierService,
    getAllSuppliersService,
    getSupplierByIdService,
    updateSupplierService,
} from "../services/supplier.services";
import { createStoreService } from "../services/store.services";
import { AppError } from "../errors/base.error";
import type { CreateStoreInput } from "../zod/store.schema";

/**
 * Shared owner for test stores. Same ID used across other integration
 * test files (`store.test.ts`, `membership.test.ts`) — it must exist in
 * the dev DB. Not created here; assumed to be a real user row.
 */
const ownerId = "52b45375-ce27-4859-8839-d991d3634330";

/**
 * Creates a fresh store for a single test. Isolated per test so the
 * destructive `deleteAllSuppliersService` case never touches data
 * created by other tests. Matches the `createLifecycleTestStore`
 * pattern in `store.test.ts`.
 */
const createTestStore = async () => {
    const storeData: CreateStoreInput = {
        name: `Supplier test store ${crypto.randomUUID()}`,
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

describe("supplier service tests", () => {
    it(
        "should create a supplier",
        { tags: ["create", "supplier"] },
        async () => {
            const store = await createTestStore();
            const supplierName = `Test supplier ${crypto.randomUUID()}`;

            const created = await createSupplierService({
                storeId: store.id,
                name: supplierName,
            });

            expect(created).not.toBeInstanceOf(AppError);
            if (created instanceof AppError) return;

            expect(created.id).toBeDefined();
            expect(created.name).toBe(supplierName);
            expect(created.storeId).toBe(store.id);
        },
    );

    it(
        "should get single supplier by its id",
        { tags: ["get", "supplier"] },
        async () => {
            const store = await createTestStore();
            const supplierName = `Test supplier ${crypto.randomUUID()}`;

            const created = await createSupplierService({
                storeId: store.id,
                name: supplierName,
            });
            if (created instanceof AppError) throw created;

            const fetched = await getSupplierByIdService(
                created.id,
                store.id,
            );

            expect(fetched).not.toBeInstanceOf(AppError);
            if (fetched instanceof AppError) return;

            expect(fetched.id).toBe(created.id);
            expect(fetched.name).toBe(supplierName);
            expect(fetched.storeId).toBe(store.id);
        },
    );

    it(
        "should get all suppliers from the db",
        { tags: ["get", "all", "suppliers"] },
        async () => {
            const store = await createTestStore();
            const name1 = `Supplier A ${crypto.randomUUID()}`;
            const name2 = `Supplier B ${crypto.randomUUID()}`;

            await createSupplierService({ storeId: store.id, name: name1 });
            await createSupplierService({ storeId: store.id, name: name2 });

            const result = await getAllSuppliersService(store.id);

            expect(result).not.toBeInstanceOf(AppError);
            if (result instanceof AppError) return;

            expect(Array.isArray(result)).toBe(true);

            const names = result.map((s: { name: string }) => s.name);
            expect(names).toContain(name1);
            expect(names).toContain(name2);
        },
    );

    it(
        "should update a supplier",
        { tags: ["update", "supplier"] },
        async () => {
            const store = await createTestStore();

            const created = await createSupplierService({
                storeId: store.id,
                name: `Test supplier ${crypto.randomUUID()}`,
            });
            if (created instanceof AppError) throw created;

            const updated = await updateSupplierService({
                id: created.id,
                storeId: store.id,
                name: "Updated name",
                phone: "112233",
                email: "supplier@email.com",
                notes: "updated note",
            });

            expect(updated).not.toBeInstanceOf(AppError);

            const fetched = await getSupplierByIdService(
                created.id,
                store.id,
            );
            if (fetched instanceof AppError) throw fetched;

            expect(fetched.name).toBe("Updated name");
            expect(fetched.phone).toBe("112233");
            expect(fetched.email).toBe("supplier@email.com");
            expect(fetched.notes).toBe("updated note");
        },
    );

    it(
        "should delete Supplier by its id",
        { tags: ["delete", "supplier"] },
        async () => {
            const store = await createTestStore();

            const created = await createSupplierService({
                storeId: store.id,
                name: `Test supplier ${crypto.randomUUID()}`,
            });
            if (created instanceof AppError) throw created;

            await deleteSupplierService(created.id, store.id);

            const fetched = await getSupplierByIdService(
                created.id,
                store.id,
            );

            // The supplier should no longer be retrievable.
            // `getSupplierByIdService` returns `ValidationError` (an
            // `AppError`) when the row is missing, because the schema
            // can't parse `null`. So `instanceof AppError` is the
            // correct assertion for "not found" here.
            expect(fetched).toBeInstanceOf(AppError);
        },
    );

    it(
        "should delete all suppliers from the bd",
        { tags: ["delete", "all", "suppliers"] },
        async () => {
            const store = await createTestStore();

            await createSupplierService({
                storeId: store.id,
                name: `X ${crypto.randomUUID()}`,
            });
            await createSupplierService({
                storeId: store.id,
                name: `Y ${crypto.randomUUID()}`,
            });

            const before = await getAllSuppliersService(store.id);
            if (before instanceof AppError) throw before;
            expect(before.length).toBeGreaterThanOrEqual(2);

            await deleteAllSuppliersService(store.id);

            const after = await getAllSuppliersService(store.id);
            if (after instanceof AppError) throw after;

            // This assertion catches the flagged issue: `deleteAllSuppliersService`
            // currently uses `.delete()` instead of `.deleteAll()`. If `.delete()`
            // only removes one matching row, this test will fail — and that's
            // the correct outcome, because it means the production service has
            // the same bug.
            expect(after.length).toBe(0);
        },
    );
});