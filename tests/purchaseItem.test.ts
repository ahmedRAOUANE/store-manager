import { AppError } from "@/errors/base.error";
import { describe, it } from "vitest";
import { getCurrentStore } from "@/actions/storeManagement.actions";
import { createPurchaseItem, deleteAllPurchaseItems, deletePurchaseItem, getAllPurchaseItems, getPurchaseItemById, updatePurchaseItem } from "@/actions/purchaseItem.actions";
import { CreatePurchaseItemInputWithRequiredPurchaseId, UpdatePurchaseItemInput } from "@/zod/purchaseItem.schema";

// import "temporal-polyfill/full/global";

//TODO: Do not forget to change the id's, 

describe("supplier tests", () => {
    it("should get all PurchasesItem from the db", {tags: ["get", "all", "purchaseItems"]}, async () => {
        const purchaseId = "7e654297-c18a-4705-94b4-ceed9aa5d00e"; //! this must change
        const purchasesItem = await getAllPurchaseItems(purchaseId);
        console.log("PurchasesItem: ", purchasesItem);
    })

    it("should get single purchaseItem by its id", {tags: ["get", "purchaseItem"]}, async () => {
        const purchaseItemId = "7e654297-c18a-4705-94b4-ceed9aa5d00e"; //! this must change
        const purchaseId = "7e654297-c18a-4705-94b4-ceed9aa5d00e"; //! this must change
        const purchaseItem = await getPurchaseItemById(purchaseItemId, purchaseId);
        console.log("purchaseItem: ", purchaseItem)
    })

    it("should create a purchaseItem", {tags: ["create", "purchaseItem"]}, async () => {
        const currentStore = await getCurrentStore();
        if (!currentStore || currentStore instanceof AppError)
            return console.log("the store fetching went through an error: ", currentStore)

        const purchaseItem: CreatePurchaseItemInputWithRequiredPurchaseId = {
            discountAmount: 12.5,
            taxAmount: 12.5,
            totalAmount: 10,

            purchaseId: "974f5307-7ca5-45ed-ba01-31e28e9c639f", //! this must be UUID
            productId: "0e0fb388-7879-4171-8716-3e9cb0577d8f", //! this must be UUID
            quantity: 12,
            unitCost: 12.3,
            batchNumber: "123.4",
        } 
        
        const createdpurchaseItem = await createPurchaseItem(purchaseItem);
        console.log("created purchaseItem: ", createdpurchaseItem);
    })
    
    it("should update a purchaseItem", {tags: ["update", "purchaseItem"]}, async () => {
        const PurchaseItem: UpdatePurchaseItemInput = {
            id: "7e654297-c18a-4705-94b4-ceed9aa5d00e", //! this also must be changed
            purchaseId: "974f5307-7ca5-45ed-ba01-31e28e9c639f", //! this must be UUID
            discountAmount: 12.5,
            taxAmount: 12.5,
            totalAmount: 12.5,
            quantity: 12.5,
            unitCost: 12.5,
            batchNumber: "123.4",
        } 

        const updatedPurchaseItem = await updatePurchaseItem(PurchaseItem);
        console.log("updated PurchaseItem: ", updatedPurchaseItem);
    })

    it("should delete all PurchaseItemsItem from the bd", {tags: ["delete", "all", "purchaseItems"]}, async () => {
        const purhcaseId = "9d2d1623-1297-448e-9d24-4a0355c8272b"; //! and this
        const deletedPurchaseItems = await deleteAllPurchaseItems(purhcaseId);
        console.log("deleted PurchaseItemsItem: ", deletedPurchaseItems);
    })

    it("should delete PurchaseItem by its id", {tags: ["delete", "purchaseItem"]}, async () => {
        const purhcaseItemId = "9d2d1623-1297-448e-9d24-4a0355c8272b"; //! and this
        const purhcaseId = "9d2d1623-1297-448e-9d24-4a0355c8272b"; //! and this
        const deletedPurchaseItem = await deletePurchaseItem(purhcaseItemId, purhcaseId);
        console.log("deleted PurchaseItem: ", deletedPurchaseItem);
    })
})