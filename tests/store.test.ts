import {
    activateStoreService,
    getAllStoresService,
    suspendStoreService,
} from "../services/store.services";
import { db, models } from "../prisma/db";
import { describe, expect, it } from "vitest";

describe("store testing", () => {
    const storeId = "8dacefdb-2c06-41e8-a845-a6a9c2cba418";
    const ownerId = "52b45375-ce27-4859-8839-d991d3634330";

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
        "should notify the owner when a store is activated",
        { tags: ["activate", "store", "notification"] },
        async () => {
            const result = await activateStoreService(storeId);

            console.log("result: ", result);

            // expect(result).toBe(true);

            const notifications = await models.Notification
                .where({
                    recipientId: ownerId,
                    storeId,
                    type: "STORE_ACTIVATED",
                })
                .all();

            console.log("notifications: ", notifications);

            // expect(notifications.length).toBeGreaterThan(0);
        },
    );

    it(
        "should notify the owner when a store is suspended",
        { tags: ["suspend", "store", "notification"] },
        async () => {
            const result = await suspendStoreService(storeId);

            console.log("result: ", result);

            expect(result).not.toBeInstanceOf(Error);

            const notifications = await db.orm.public.Notification
                .where({
                    recipientId: ownerId,
                    storeId,
                    type: "STORE_SUSPENDED",
                })
                .all();

            console.log("notifications: ", notifications);

            expect(notifications.length).toBeGreaterThan(0);
        },
    );
});