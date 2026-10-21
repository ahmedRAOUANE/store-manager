"use server";

import { createProductsService, deleteAllProductsService, deleteProductService, getProductsService, getSingleProductService, updateProductService } from "@/services/product.services";
import { CreateProductInput, UpdateProductInput } from "@/zod/product.schema";
import { withStoreRole } from "@/access/wrappers";
import { AppError } from "@/errors/base.error";
import { emitHook } from "@/extensions/runner";
import { computeProductChanges } from "@/utils/compute-product-changes";

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
    async (user, _membership, storeId, product: CreateProductInput) => {
        const result = await createProductsService(storeId, product);

        if (result instanceof AppError) {
            return { ok: false as const, message: result.message };
        }

        /*
         * Fire-and-forget. `emitHook` schedules the dispatch and
         * returns immediately; the action's response does not wait for
         * any extension handler to run. If no extensions are installed,
         * this is a no-op. If an extension handler fails or times out,
         * the error is logged and swallowed — this action's return
         * value is unaffected.
         */
        void emitHook(
            "product.created",
            {
                id: result.id,
                name: result.name,
                sku: result.sku,
                stockQuantity: result.stockQuantity,
                minimumStock: result.minimumStock,
                sellingPrice: result.sellingPrice,
                isActive: result.isActive,
                createdAt: result.createdAt,
            },
            { userId: user.id, storeId },
        );

        return { ok: true as const, id: result.id };
    }
);

export const updateProduct = withStoreRole(
    ["OWNER", "MANAGER"],
    async (
        user,
        _membership,
        storeId,
        productId: string,
        product: UpdateProductInput
    ) => {
        /*
         * Snapshot the product before the update so the hook payload can
         * carry a diff. This is one extra SELECT per update — acceptable
         * given the current call volume and the value of a proper diff
         * in the payload. If this ever becomes a hot path, the
         * alternative is to have `updateProductService` return
         * `{ before, after }` in a single transaction, avoiding the
         * second read.
         */
        const before = await getSingleProductService(storeId, productId);

        if (before instanceof AppError) {
            return { ok: false as const, message: before.message };
        }

        const result = await updateProductService(storeId, productId, product);

        if (!result) {
            return { ok: false as const, message: "could not update the product" };
        }

        if (result instanceof AppError) {
            return { ok: false as const, message: result.message };
        }

        const changes = computeProductChanges(before, result);

        /*
         * Only emit if something user-visible actually changed. A no-op
         * update — same values as before — should not notify extensions.
         * The service call itself succeeds either way; the row was
         * "updated" to identical values.
         */
        if (Object.keys(changes).length > 0) {
            void emitHook(
                "product.updated",
                {
                    id: result.id,
                    name: result.name,
                    sku: result.sku,
                    stockQuantity: result.stockQuantity,
                    minimumStock: result.minimumStock,
                    sellingPrice: result.sellingPrice,
                    isActive: result.isActive,
                    createdAt: result.createdAt,
                    changes,
                },
                { userId: user.id, storeId },
            );
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