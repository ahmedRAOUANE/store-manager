import {
    activateStoreService,
    createStoreService,
    getAllStoresService,
    suspendStoreService,
} from "../services/store.services";
import { models } from "../prisma/db";
import { describe, expect, it } from "vitest";
import type { CreateStoreInput } from "../zod/store.schema";

describe("store testing", () => {
    // const storeId = "8dacefdb-2c06-41e8-a845-a6a9c2cba418";
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

            // console.log("stores: ", allStores);
        },
    );

    it(
        "activates a store and notifies its owner exactly once",
        { tags: ["activate", "store", "notification"] },
        async () => {
            const store = await createLifecycleTestStore();

            const result = await activateStoreService(store.id);

            expect(result).toBe(true);

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
            expect(activationResult).toBe(true);

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
});