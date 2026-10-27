import {
    activateStoreService,
    createStoreService,
    getAllStoresService,
    suspendStoreService,
} from "../../services/store.services";
import { models } from "../../prisma/db";
import { describe, expect, it } from "vitest";
import type { CreateStoreInput } from "../../zod/store.schema";
import { AppError } from "../../errors/base.error";

describe("store testing", () => {
    const ownerId = "52b45375-ce27-4859-8839-d991d3634330";

    const createLifecycleTestStore = async () => {
        const storeData: CreateStoreInput = {
            name: `Notification test store ${crypto.randomUUID()}`,
            description: null,
            phone: null,
            email: null,
            address: null,
            currency: "DZ",
            timezone: "UTC",
        };

        const store = await createStoreService(ownerId, storeData);

        expect(store).not.toBeInstanceOf(Error);

        if (store instanceof Error) {
            throw store;
        }

        return store;
    };

    it(
        "should get all stores",
        { tags: ["get", "all", "stores"] },
        async () => {
            const allStores = await getAllStoresService();

            expect(allStores).not.toBeInstanceOf(Error);
            expect(Array.isArray(allStores)).toBe(true);
        },
    );

    it(
        "activates a store and notifies its owner exactly once",
        { tags: ["activate", "store", "notification"] },
        async () => {
            const store = await createLifecycleTestStore();

            const result = await activateStoreService(store.id);

            expect(result).not.toBeInstanceOf(AppError);

            const updatedStore = await models.Store
                .where({ id: store.id })
                .first();

            expect(updatedStore?.status).toBe("ACTIVE");

            const ownerMembership = await models.StoreMembership
                .where({
                    storeId: store.id,
                    userId: ownerId,
                    role: "OWNER",
                })
                .first();

            expect(ownerMembership?.status).toBe("ACTIVE");

            const notifications = await models.Notification
                .where({
                    recipientId: ownerId,
                    storeId: store.id,
                    type: "STORE_ACTIVATED",
                })
                .all();

            expect(notifications).toHaveLength(1);
            expect(notifications[0].payload).toEqual({
                storeName: store.name,
            });
        },
    );

    it(
        "suspends a store and notifies its owner exactly once",
        { tags: ["suspend", "store", "notification"] },
        async () => {
            const store = await createLifecycleTestStore();

            // Put the store into the expected precondition.
            const activationResult = await activateStoreService(store.id);
            expect(activationResult).not.toBeInstanceOf(AppError);

            const result = await suspendStoreService(store.id);

            expect(result).not.toBeInstanceOf(Error);

            const updatedStore = await models.Store
                .where({ id: store.id })
                .first();

            expect(updatedStore?.status).toBe("SUSPENDED");

            const notifications = await models.Notification
                .where({
                    recipientId: ownerId,
                    storeId: store.id,
                    type: "STORE_SUSPENDED",
                })
                .all();

            expect(notifications).toHaveLength(1);
            expect(notifications[0].payload).toEqual({
                storeName: store.name,
            });
        },
    );

    it(
        "does not create a duplicate STORE_ACTIVATED notification when activation is retried",
        { tags: ["activate", "store", "notification"] },
        async () => {
            const store = await createLifecycleTestStore();

            // First activation succeeds.
            const first = await activateStoreService(store.id);
            expect(first).not.toBeInstanceOf(AppError);

            // Second activation is rejected â€” the store is already active.
            const second = await activateStoreService(store.id);
            expect(second).toBeInstanceOf(AppError);

            // Exactly one notification was created despite two attempts.
            const notifications = await models.Notification
                .where({
                    recipientId: ownerId,
                    storeId: store.id,
                    type: "STORE_ACTIVATED",
                })
                .all();

            expect(notifications).toHaveLength(1);
        },
    );

    it(
        "does not create a duplicate STORE_SUSPENDED notification when suspension is retried",
        { tags: ["suspend", "store", "notification"] },
        async () => {
            const store = await createLifecycleTestStore();

            // Activate first so suspension is valid.
            const activationResult = await activateStoreService(store.id);
            expect(activationResult).not.toBeInstanceOf(AppError);

            // First suspension succeeds.
            const first = await suspendStoreService(store.id);
            expect(first).not.toBeInstanceOf(AppError);

            // Second suspension is rejected â€” already suspended.
            const second = await suspendStoreService(store.id);
            expect(second).toBeInstanceOf(AppError);

            // Exactly one suspension notification.
            const notifications = await models.Notification
                .where({
                    recipientId: ownerId,
                    storeId: store.id,
                    type: "STORE_SUSPENDED",
                })
                .all();

            expect(notifications).toHaveLength(1);
        },
    );
});