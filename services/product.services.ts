import { AppError } from "@/errors/base.error";
import { DatabaseError } from "@/errors/db.error";
import { ValidationError } from "@/errors/validation.error";
import { models, TransactionClient } from "@/prisma/db";
import { isUuid } from "@/utils/uuid";
import { CreateProductInput, CreateProductInputSchema, GetProductSchema, UpdateProductCalculatedFieldsInput, UpdateProductCalculatedFieldsSchema, UpdateProductInput, UpdateProductInputSchema } from "@/zod/product.schema";

export const getProductsService = async (storeId: string) => {
    if (!isUuid(storeId)) {
        return new ValidationError("invalida store id");
    }

    try {
        const dbProducts = await models.Product.where({ storeId }).all();

        const parsedProducts = GetProductSchema.array().safeParse(dbProducts);
        if (!parsedProducts.success) {
            console.log("services/product.services.ts > getPtoducts > ", parsedProducts.error)
            return new ValidationError("recieved invalid data from the db");
        }

        return parsedProducts.data;
    } catch (error) {
        console.log("services/product.services.ts > getPtoducts > ", error)
        throw new DatabaseError("unable to get products form the db", error as Record<string, unknown>);
    }
}

export const getSingleProductService = async (storeId: string, productId: string, transaction?: TransactionClient) => {
    if (!isUuid(productId)) {
        console.log("services/product.services.ts > getSinglePtoductService > ", productId);
        return new ValidationError(`productId: ${productId} is not a valid id`);
    }

    if (!isUuid(storeId)) {
        console.log("services/product.services.ts > getSinglePtoductService > ", productId);
        return new ValidationError(`storeId: ${storeId} is not a valid id`);
    }

    const productModel = transaction
        ? transaction.orm.public.Product
        : models.Product;

    try {
        const dbProduct = await productModel.first({
            id: productId,
            storeId
        })

        if (!dbProduct) {
            return new AppError("product not found");
        }

        const parsedProduct = GetProductSchema.safeParse(dbProduct);
        if (!parsedProduct.success) {
            console.log("services/product.services.ts > getSingleProductService > ", parsedProduct.error)
            return new ValidationError("recieved invalid data from the db");
        }

        return parsedProduct.data;
    } catch (error) {
        console.log("services/product.services.ts > getSinglePtoductService > ", error);
        throw new DatabaseError("unable to get this product from the db", error as Record<string, unknown>)
    }
}

export const createProductsService = async (storeId: string, product: CreateProductInput) => {
    if (!isUuid(storeId) ) {
        return new ValidationError("invalid store id provided")
    }

    try {
        const parsedProduct = CreateProductInputSchema.safeParse(product);
        if (!parsedProduct.success) {
            console.log("services/product.services.ts > createPtoduct > ", parsedProduct.error)
            return new ValidationError("recieved invalid data");
        }

        return await models.Product.create({...parsedProduct.data, storeId});
    } catch (error) {
        console.log("services/product.services.ts > createPtoduct > ", error)
        throw new DatabaseError("unable to push product to the db", error as Record<string, unknown>);
    }
}

export const updateProductService = async (storeId: string, productId: string, product: UpdateProductInput, transaction?: TransactionClient) => {
    const productModel = transaction
        ? transaction.orm.public.Product
        : models.Product;

    try {
        const parsedProduct = UpdateProductInputSchema.safeParse(product);
        if (!parsedProduct.success) {
            console.log("services/product.services.ts > updatePtoduct > ", parsedProduct.error)
            return new ValidationError("recieved invalid data");
        }

        const existingProduct = await getSingleProductService(storeId, productId, transaction);
        if (!existingProduct || existingProduct instanceof AppError) return new AppError("the product you are trying to update does not exist")

        return await productModel.where({ id: productId, storeId }).update(parsedProduct.data);
    } catch (error) {
        console.log("services/product.services.ts > updatePtoduct > ", error)
        throw new DatabaseError("unable to update product to the db", error as Record<string, unknown>);
    }
}

export const updateProductCalculatedFieldsService = async (storeId: string, productId: string, product: UpdateProductCalculatedFieldsInput, transaction?: TransactionClient) => {
    const productModel = transaction
        ? transaction.orm.public.Product
        : models.Product;

    try {
        const parsedProduct = UpdateProductCalculatedFieldsSchema.safeParse(product);
        if (!parsedProduct.success) {
            console.log("services/product.services.ts > updateProductCalculatedFieldsService > ", parsedProduct.error)
            return new ValidationError("recieved invalid data");
        }

        return await productModel.where({ id: productId, storeId }).update(parsedProduct.data);
    } catch (error) {
        console.log("services/product.services.ts > updateProductCalculatedFieldsService > ", error)
        throw new DatabaseError("unable to update product to the db", error as Record<string, unknown>);
    }
}

export const deleteProductService = async (storeId: string, productId: string) => {
    if (!isUuid(productId)) {
        console.log("services/product.services.ts > deletePtoductService > ", productId);
        return new ValidationError(`productId: ${productId} is not a valid id`);
    }

    if (!isUuid(storeId)) {
        console.log("services/product.services.ts > deletePtoductService > ", productId);
        return new ValidationError(`productId: ${productId} is not a valid id`);
    }
    
    try {
        return await models.Product.where({
            id: productId,
            storeId
        }).delete()
    } catch (error) {
        console.log("services/product.services.ts > deletePtoductService > ", error);
        throw new DatabaseError("unable to get this product from the db", error as Record<string, unknown>)
    }
}

export const deleteAllProductsService = async (storeId: string) => {
    if (!isUuid(storeId)) {
        return new ValidationError("invalid store id provided")
    }

    try {
        return await models.Product.where({ storeId }).deleteAll();
    } catch (error) {
        console.log("services/product.services.ts > deleteAllPtoductService > ", error);
        throw new DatabaseError("unable to delete all products from the db", error as Record<string, unknown>)
    }
}