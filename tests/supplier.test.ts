import { createSupplier, deleteAllSuppliers, deleteSupplier, getAllSuppliers, getSupplierById, updateSupplier } from "@/actions/supplier.actions";
import { AppError } from "@/errors/base.error";
import { describe, it } from "vitest";

// import "temporal-polyfill/full/global";
import { CreateSupplierInput, UpdateSupplierInput } from "@/zod/supplier.schema";
import { getCurrentStore } from "@/actions/storeManagement.actions";

describe("supplier tests", () => {
    const storeId = "8dacefdb-2c06-41e8-a845-a6a9c2cba418"; //! this must be changed to an actual store id > run  `pnpm test:run --tags-filter="get and store"` to finc it 

    it("should get all Suppliers from the db", {tags: ["get", "all", "suppliers"]}, async () => {
        const prods = await getAllSuppliers(storeId);
        console.log("Suppliers: ", prods);
    })

    it("should get single supplier by its id", {tags: ["get", "supplier"]}, async () => {
        const supplierId = "9fa27398-894e-4ecd-ad90-e074d037bcd7";
        const supplier = await getSupplierById(supplierId, storeId);
        console.log("supplier: ", supplier)
    })

    it("should create a supplier", {tags: ["create", "supplier"]}, async () => {
        const currentStore = await getCurrentStore();
        if (!currentStore || currentStore instanceof AppError)
            return console.log("the store fetching went through an error: ", currentStore)

        const supplier: CreateSupplierInput = {
            storeId: currentStore.id,
            name: "sup 2",
        } 

        const createdSupplier = await createSupplier(supplier);
        console.log("created supplier: ", createdSupplier);
    })
    
    it("should update a supplier", {tags: ["update", "supplier"]}, async () => {
        const supplier: UpdateSupplierInput = {
            id: "9fa27398-894e-4ecd-ad90-e074d037bcd7",
            name: "sup 1 updated",
            phone: "112233",
            email: "supplier@email.com",
            notes: "this is an updated supplier"
        } 

        const updatedSupplier = await updateSupplier(supplier);
        console.log("updated supplier: ", updatedSupplier);
    })

    it("should delete all suppliers from the bd", {tags: ["delete", "all", "suppliers"]}, async () => {
        const deletedSuppliers = await deleteAllSuppliers(storeId);
        console.log("deleted Suppliers: ", deletedSuppliers);
    })

    it("should delete Supplier by its id", {tags: ["delete", "supplier"]}, async () => {
        const supId = "f6cd8f28-cf02-4c0d-b18c-59890da62193";
        const deletedSupplier = await deleteSupplier(supId, storeId);
        console.log("deleted Supplier: ", deletedSupplier);
    })
})