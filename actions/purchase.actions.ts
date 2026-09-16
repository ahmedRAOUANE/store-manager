"use server";

import {
    createPurchaseService,
    deleteAllPurchasesService,
    deletePurchaseService,
    getAllPurchasesService,
    getPurchaseByIdService,
    updatePurchaseService,
} from "@/services/purchase.services";
import { withStoreRole } from "@/utils/auth";
import { AppError } from "@/errors/base.error";
import { CreatePurchaseInput, UpdatePurchaseInput } from "@/zod/purchase.schema";
import { CreatePurchaseItemInput } from "@/zod/purchaseItem.schema";

export const getAllPurchases = withStoreRole(
    ["OWNER", "MANAGER"],
    (_user, _membership, storeId: string) => getAllPurchasesService(storeId),
);

export const getPurchaseById = withStoreRole(
    ["OWNER", "MANAGER"],
    (_user, _membership, storeId: string, id: string) =>
        getPurchaseByIdService(storeId, id),
);

export const createPurchase = withStoreRole(
    ["OWNER", "MANAGER"],
    async (
        _user,
        _membership,
        _storeId,
        purchase: CreatePurchaseInput,
        items: CreatePurchaseItemInput[] = [],
    ) => {
        const result = await createPurchaseService(purchase, items);

        if (result instanceof AppError) {
            return { ok: false as const, message: result.message };
        }

        return { ok: true as const, id: result.created.id };
    },
);

export const updatePurchase = withStoreRole(
    ["OWNER", "MANAGER"],
    async (_user, _membership, storeId, purchase: UpdatePurchaseInput) => {
        const result = await updatePurchaseService(storeId, purchase);

        if (result instanceof AppError) {
            return { ok: false as const, message: result.message };
        }

        return { ok: true as const };
    },
);

export const deletePurchase = withStoreRole(
    ["OWNER", "MANAGER"],
    (_user, _membership, storeId, id: string) => deletePurchaseService(storeId, id),
);

export const deleteAllPurchases = withStoreRole(
    ["OWNER", "MANAGER"],
    (_user, _membership, storeId) => deleteAllPurchasesService(storeId),
);