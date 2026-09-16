import { describe, it } from "vitest";
import { getAllStoresService } from "@/services/store.services";

// import "temporal-polyfill/full/global";

describe("store testing", () => {
    it("should get all stores", {tags: ["get", "all", "stores"]}, async () => {
        const allStores = await getAllStoresService();
        console.log("all stores: ", allStores)
    })

    // it("should get the first store", {tags: ["get", "store"]}, async () => {
    //     const currentStore = await getCurrentStore();
    //     console.log("current store (the first store): ", currentStore)
    // })

    // it("should create new store", {tags: ["create", "store"]}, async () => {
    //     const store: CreateStoreInput = {
    //         name: "new store",
    //         description: "this is a new store",
    //         phone: "213 523 234 234",
    //         email: "ahmed@email.com",
    //         address: "that-st",
    //         currency: "USD",
    //         timezone: "UTC",
    //     }

    //     const createdStore = await createStore(store);
    //     console.log("created store: ", createdStore);
    // })
})