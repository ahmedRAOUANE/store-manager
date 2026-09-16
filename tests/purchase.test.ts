import { describe, it } from "vitest";

// // // // // // import "temporal-polyfill/full/global";
import { createPurchase, deleteAllPurchases, deletePurchase, getPurchaseById, updatePurchase } from "@/actions/purchase.actions";
import { CreatePurchaseInput, UpdatePurchaseInput } from "@/zod/purchase.schema";
import { CreatePurchaseItemInput } from "@/zod/purchaseItem.schema";
import { getAllPurchasesService } from "@/services/purchase.services";

// the server actions now are protected
// these tests are dedicated to test the services only
describe("supplier tests", () => {
    const storeId = "8dacefdb-2c06-41e8-a845-a6a9c2cba418"; //! this must be changed to an actual store id > run  `pnpm test:run --tags-filter="get and store"` to finc it 

    it("should get all Purchases from the db", { tags: ["get", "all", "purchases"] }, async () => {
        const purchases = await getAllPurchasesService(storeId);
        console.log("Purchases: ", JSON.stringify(purchases, null, 2));
    })

    it("should get single purchase by its id", { tags: ["get", "purchase"] }, async () => {
        const purchaseId = "35a29f22-bb7f-4676-b841-23a14fba0186"; //! this must change
        const purchase = await getPurchaseById(purchaseId, storeId);
        console.log("purchase: ", purchase)
    })

    it("should create a purchase", { tags: ["create", "purchase"] }, async () => {
        // const currentStore = await getCurrentStore();
        // if (!currentStore || currentStore instanceof AppError)
        //     return console.log("the store fetching went through an error: ", currentStore)

        const purchase: CreatePurchaseInput = {
            storeId: storeId,
            supplierId: "dadadd54-aa20-44b5-96aa-805fdcf48fed",
            discountAmount: 12.5,
            taxAmount: 12.5,
            shippingCost: 12.5,
            otherCost: 12.5,
            amountPaid: 12.5,
            notes: "this to test the effect on the products inventory",
        }

        const purchaseItems: CreatePurchaseItemInput[] = [
            {
                discountAmount: 12.5,
                taxAmount: 12.5,
                totalAmount: 10,
                lineSubtotal: 0,
                productId: "0e0fb388-7879-4171-8716-3e9cb0577d8f", // this is correct product id - should succeed //! this must be UUID
                quantity: 9,
                unitCost: 10,
                batchNumber: "123.4",
            },
            {
                discountAmount: 0,
                taxAmount: 0,
                totalAmount: 10,
                lineSubtotal: 0,
                
                productId: "b46af9d1-0d14-4d60-b349-9e30d3cd211c", // this is invalid product id - should fail //! this must be UUID
                quantity: 2,
                unitCost: 10,
                batchNumber: "123.4",
            },
        ]

        const createdpurchase = await createPurchase(purchase, purchaseItems);
        console.log("created purchase: ", JSON.stringify(createdpurchase, null, 2));
    })

    it("should update a purchase", { tags: ["update", "purchase"] }, async () => {
        const Purchase: UpdatePurchaseInput = {
            id: "9fa27398-894e-4ecd-ad90-e074d037bcd7", //! this also must be changed
            notes: "this is an updated Purchase"
        }

        const updatedPurchase = await updatePurchase(Purchase);
        console.log("updated Purchase: ", updatedPurchase);
    })

    it("should delete all Purchases from the bd", { tags: ["delete", "all", "purchases"] }, async () => {
        const deletedPurchases = await deleteAllPurchases(storeId);
        console.log("deleted Purchases: ", deletedPurchases);
    })

    it("should delete Purchase by its id", { tags: ["delete", "purchase"] }, async () => {
        const purhcaseId = "6d639c53-a839-49e0-aba0-3047d1dcb05f"; //! and this
        const deletedPurchase = await deletePurchase(purhcaseId, storeId);
        console.log("deleted Purchase: ", deletedPurchase);
    })
})