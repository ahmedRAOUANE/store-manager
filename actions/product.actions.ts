"use server";

import { createProductsService, deleteAllProductsService, deleteProductService, getProductsService, getSingleProductService, updateProductService } from "@/services/product.services";
import { CreateProductInput, UpdateProductInput } from "@/zod/product.schema";
import { withStoreRole } from "@/utils/auth";
import { AppError } from "@/errors/base.error";

export const getAllProducts = withStoreRole(
    ["OWNER", "MANAGER", "STAFF"],
    async (_user, _membership, storeId: string) => 
        await getProductsService(storeId)
);

export const getProductById = withStoreRole(
    ["OWNER", "MANAGER"],
    async (_user, _membership, storeId, id: string) => 
        await getSingleProductService(storeId, id)
);

export const createProduct = withStoreRole(
    ["OWNER", "MANAGER"],
    async (_user, _membership, storeId, product: CreateProductInput) => {
        const result = await createProductsService(storeId, product);

        if (result instanceof AppError) {
            return { ok: false as const, message: result.message };
        }

        return { ok: true as const, id: result.id };
    }
);

export const updateProduct = withStoreRole(
    ["OWNER", "MANAGER"],
    async (
        _user,
        _membership,
        storeId,
        productId: string,
        product: UpdateProductInput
    ) => {
        const result = await updateProductService(storeId, productId, product);

        if (result instanceof AppError) {
            return { ok: false as const, message: result.message };
        }

        return { ok: true as const };
    }
);

export const deleteProduct = withStoreRole(
    ["OWNER"],
    async (_user, _membership, storeId, id: string) => 
        deleteProductService(storeId, id)
);

export const deleteAllProducts = withStoreRole(
    ["OWNER"],
    async (_user, _membership, storeId) => 
        await deleteAllProductsService(storeId)
);