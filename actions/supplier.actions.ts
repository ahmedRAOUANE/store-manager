"use server";

import {
    createSupplierService,
    deleteAllSuppliersService,
    deleteSupplierService,
    getAllSuppliersService,
    getSupplierByIdService,
    updateSupplierService,
} from "@/services/supplier.services";
import { withStoreRole } from "@/utils/auth";
import { AppError } from "@/errors/base.error";
import {
    CreateSupplierInput,
    UpdateSupplierInput,
} from "@/zod/supplier.schema";

export const getAllSuppliers = withStoreRole(
    ["OWNER", "MANAGER"],
    async (_user, _membership, storeId) =>
        await getAllSuppliersService(storeId)
);

export const getSupplierById = withStoreRole(
    ["OWNER", "MANAGER"],
    async (_user, _membership, storeId, id: string) =>
        await getSupplierByIdService(id, storeId)
);

export const createSupplier = withStoreRole(
    ["OWNER", "MANAGER"],
    async (_user, _membership, storeId, supplier: CreateSupplierInput) => {
        /* The URL's storeId always wins — a client-supplied one is ignored. */
        const result = await createSupplierService({ ...supplier, storeId });

        if (result instanceof AppError) {
            return { ok: false as const, message: result.message };
        }

        return { ok: true as const, id: result.id };
    }
);

export const updateSupplier = withStoreRole(
    ["OWNER", "MANAGER"],
    async (_user, _membership, storeId, supplier: UpdateSupplierInput) => {
        const result = await updateSupplierService({ ...supplier, storeId });

        if (result instanceof AppError) {
            return { ok: false as const, message: result.message };
        }

        return { ok: true as const };
    }
);

export const deleteSupplier = withStoreRole(
    ["OWNER"],
    async (_user, _membership, storeId, id: string) =>
        await deleteSupplierService(id, storeId)
);

export const deleteAllSuppliers = withStoreRole(
    ["OWNER"],
    async (_user, _membership, storeId) =>
        await deleteAllSuppliersService(storeId)
);