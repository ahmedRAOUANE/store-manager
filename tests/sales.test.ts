import { createSaleService, getSaleByIdService, getSalesService } from "@/services/sale.services";
import { CreateSaleInput } from "@/zod/sale.schema";
import { describe, it } from "vitest";

describe("sales tests", () => {
    const storeId = "8dacefdb-2c06-41e8-a845-a6a9c2cba418";
    it("should get all sales - service only", {tags: ["get", "all", "sales"]}, async () => {
        const allSales = await getSalesService(storeId)
        console.log("all stores: ", allSales)
    })

    it ("should get sale by its id", {tags: ['get', 'sale']}, async () => {
        const saleId = "01965fa9-0004-4371-8017-751d030648bd"; //! this should be changed
        const sale = await getSaleByIdService(storeId, saleId);
        console.log("sale: ", JSON.stringify(sale, null, 2))
    })

    it("should create a new sale", {tags: ["create", "sale"]}, async () => {
        const userId = "52b45375-ce27-4859-8839-d991d3634330"; //! this should be changed
        const sale: CreateSaleInput = {
            discountAmount: 5,
            taxAmount: 0,
            amountPaid: 15,
            items: [
                {
                    productId: "0e0fb388-7879-4171-8716-3e9cb0577d8f",
                    quantity: 2,
                    unitPrice: 10.5,
                    discountAmount: 0,
                    taxAmount: 0,
                }
            ]
        }

        const createdSale = await createSaleService(
            userId,
            storeId,
            sale
        )
        console.log("created sale: ", createdSale);
    })
})