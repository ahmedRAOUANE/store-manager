import { DatabaseError } from "@/errors/db.error";
import { ValidationError } from "@/errors/validation.error";
import { models } from "@/prisma/db";
import { isUuid } from "@/utils/uuid";
import { CreateSupplierInput, CreateSupplierSchema, GetSupplierSchema, UpdateSupplierInput, UpdateSupplierSchema } from "@/zod/supplier.schema";

export const getAllSuppliersService = async (storeId: string) => {
    if (!isUuid(storeId)) {
        return new ValidationError("invalid store id provided")
    }

    try {
        const dbSuppliers = await models.Supplier.where({ storeId }).all();
        const parsedSuppliers = GetSupplierSchema.array().safeParse(dbSuppliers);
        if (!parsedSuppliers.success) {
            console.log("services/supplier.services.ts > getAllSuppliersService > ", parsedSuppliers.error);
            return new ValidationError("the recived data from the db is invalid");
        }

        return parsedSuppliers.data;
    } catch (error) {
        console.log("services/supplier.services.ts > getAllSuppliersService > ", error);
        throw new DatabaseError("unable to get all suppliers from the db", error as Record<string, unknown>)
    }
}

export const getSupplierByIdService = async (id: string, storeId: string) => {
    if (!isUuid(id)) {
        return new ValidationError("invalid supplierId provided, the id must be of UUID type");
    }
    
    if (!isUuid(storeId)) {
        return new ValidationError("invalid store id provided, the id must be of UUID type");
    }

    try {
        const dbSupplier = await models.Supplier.first({ id, storeId });
        const parsedSupplier = GetSupplierSchema.safeParse(dbSupplier);
        if (!parsedSupplier.success) {
            console.log("services/supplier.services.ts > getSuppliersByIdService > ", parsedSupplier.error);
            return new ValidationError("the recived data from the db is invalid");
        }

        return parsedSupplier.data;
    } catch (error) {
        console.log("services/supplier.services.ts > getSuppliersByIdService > ", error);
        throw new DatabaseError("unable to get the specified supplier from the db", error as Record<string, unknown>)
    }
}

export const createSupplierService = async (supplierData: CreateSupplierInput) => {
    try {
        const parsedSupplier = CreateSupplierSchema.safeParse(supplierData);
        if (!parsedSupplier.success) {
            console.log("services/supplier.services.ts > createSupplierService > ", parsedSupplier.error);
            return new ValidationError("invalid data provided");
        }

        return await models.Supplier.create(parsedSupplier.data)
    } catch (error) {
        console.log("services/supplier.services.ts > createSupplierService > ", error);
        throw new DatabaseError("unable to push supplier to the db", error as Record<string, unknown>)
    }
}

export const updateSupplierService = async (supplierData: UpdateSupplierInput) => {
    try {
        const parsedSupplier = UpdateSupplierSchema.safeParse(supplierData);
        if (!parsedSupplier.success) {
            console.log("services/supplier.services.ts > updateSupplierService > ", parsedSupplier.error);
            return new ValidationError("invalid data provided");
        }

        return await models.Supplier.where({ id: parsedSupplier.data.id, storeId: parsedSupplier.data.storeId }).update(parsedSupplier.data)
    } catch (error) {
        console.log("services/supplier.services.ts > updateSupplierService > ", error);
        throw new DatabaseError("unable to push supplier to the db", error as Record<string, unknown>)
    }
}

export const deleteSupplierService = async (id: string, storeId: string) => {
    if (!isUuid(id)) {
        return new ValidationError("invalid supplierId provided, the id must be of UUID type");
    }

    if (!isUuid(storeId)) {
        return new ValidationError("invalid storeID provided, the id must be of UUID type");
    }

    try {
        return await models.Supplier.where({ id, storeId }).delete();
    } catch (error) {
        console.log("services/supplier.services.ts > deleteSupplierService > ", error);
        throw new DatabaseError("unable to delete supplier from the db", error as Record<string, unknown>)
    }
}

export const deleteAllSuppliersService = async (storeId: string) => {
    if (!isUuid(storeId)) {
        return new ValidationError("invalid store id provided")
    }

    try {
        return await models.Supplier.where({ storeId }).delete();
    } catch (error) {
        console.log("services/supplier.services.ts > deleteSupplierService > ", error);
        throw new DatabaseError("unable to delete supplier from the db", error as Record<string, unknown>)
    }
}