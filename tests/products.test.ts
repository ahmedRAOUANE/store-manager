import { createProduct, deleteAllProducts, deleteProduct, getAllProducts, getProductById, updateProduct } from "@/actions/product.actions";
import { CreateProductInput, UpdateProductInput } from "@/zod/product.schema";
import { getCurrentStore } from "@/actions/storeManagement.actions";
import { AppError } from "@/errors/base.error";
import { describe, it } from "vitest";

// import "temporal-polyfill/full/global";
import { getProductsService, getSingleProductService } from "@/services/product.services";

describe("products tests", () => {
    const storeId = "8dacefdb-2c06-41e8-a845-a6a9c2cba418"; //! this must be changed to an actual store id > run  `pnpm test:run --tags-filter="get and store"` to finc it 

    it("should get all products from the db", {tags: ["get", "all", "products"]}, async () => {
        const prods = await getProductsService(storeId);
        console.log("products: ", prods);
    })

    it("should get single product by its id", {tags: ["get", "product"]}, async () => {
        const prdId = "0e0fb388-7879-4171-8716-3e9cb0577d8f";
        const product = await getSingleProductService(storeId, prdId);
        console.log("product: ", product)
    })

    it("should create a product", {tags: ["create", "product"]}, async () => {
        const currentStore = await getCurrentStore();
        if (!currentStore || currentStore instanceof AppError) 
            return console.log("the store fetching went through an error: ", currentStore)

        const product: CreateProductInput = {
            storeId: currentStore.id,
            name: "prod 1",
            description: "product description",
            unit: "123",
            minimumStock: 20,
            sellingPrice: 10.5,
            stockQuantity: 0,
            averageCost: 0,
        } 

        const createdProduct = await createProduct(product);
        console.log("created produc: ", createdProduct);
    })
    
    it("should update a product", {tags: ["update", "product"]}, async () => {
        const product: UpdateProductInput = {
            id: "17ab0082-cf18-4f68-b1f7-be718eeb8b8d",
            storeId,
            name: "prod 1 updated",
            description: "product description",
            unit: "123",
            minimumStock: 20,
            sellingPrice: 10.5,
            isActive: true,
            averageCost: 12.3,
            stockQuantity: 12,
        } 

        const createdProduct = await updateProduct(product);
        console.log("created produc: ", createdProduct);
    })

    it("should delete all products from the bd", {tags: ["delete", "all", "products"]}, async () => {
        const deletedProducts = await deleteAllProducts(storeId);
        console.log("deleted products: ", deletedProducts);
    })

    it("should delete product by its id", {tags: ["delete", "product"]}, async () => {
        const prdId = "0e0fb388-7879-4171-8716-3e9cb0577d8f";
        const deletedProduct = await deleteProduct(prdId, storeId);
        console.log("deleted product: ", deletedProduct);
    })
})