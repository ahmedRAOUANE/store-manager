import { DatabaseError } from "@/errors/db.error";
import { ValidationError } from "@/errors/validation.error";
import { models } from "@/prisma/db";
import { isUuid } from "@/utils/uuid";
import { CreatePurchaseItemInputWithRequiredPurchaseId, CreatePurchaseItemSchemaWithRequiredPurchaseId, GetPurchaseItemSchema, UpdatePurchaseItemInput, UpdatePurchaseItemSchema } from "@/zod/purchaseItem.schema";

export const getAllPurchaseItemsService = async (purchaseId: string) => {
    if (!isUuid(purchaseId)) {
        return new ValidationError("invalid purchase id provided")
    }

    try {
        const dbPurchaseItems = await models.PurchaseItem.where({ purchaseId }).all();
        const parsedPurchaseItems = GetPurchaseItemSchema.array().safeParse(dbPurchaseItems);
        if (!parsedPurchaseItems.success) {
            console.log("services/purchaseItem.services.ts > getAllPurchaseItemsService > ", parsedPurchaseItems.error);
            return new ValidationError("invalid data received from the db");
        }

        return parsedPurchaseItems.data;
    } catch (error) {
        console.log("services/purchaseItem.services.ts > getAllPurchasesService > ", error);
        throw new DatabaseError("unable to get all purchase items from the db", error as Record<string, unknown>);
    }
}

export const getPurchaseItemByIdService = async (id: string, purchaseId: string) => {
    if (!isUuid(id)) {
        return new ValidationError("invalid purcahse item id provided");
    }

    if (!isUuid(purchaseId)) {
        return new ValidationError("invalid purhcase id provided");
    }

    try {
        const dbPurchaseItem = await models.PurchaseItem.where({ id, purchaseId }).first();
        const parsedPurchaseItem = GetPurchaseItemSchema.safeParse(dbPurchaseItem);
        if (!parsedPurchaseItem.success) {
            console.log("services/purchaseItem.services.ts > getPurchaseItemByIdService > ", parsedPurchaseItem.error);
            return new ValidationError("recieved invalid data from the db");
        }

        return parsedPurchaseItem.data;
    } catch (error) {
        console.log("services/purchaseItem.services.ts > getPurchaseItemByIdService > ", error);
        throw new DatabaseError("unable to get purchaseItem from the db", error as Record<string, unknown>);
    }
}

export const createPurchaseItemService = async (purchaseItemData: CreatePurchaseItemInputWithRequiredPurchaseId) => {
    const parsedPurchaseItem = CreatePurchaseItemSchemaWithRequiredPurchaseId.safeParse(purchaseItemData);
    if (!parsedPurchaseItem.success) {
        console.log("services/purchaseItem.services.ts > createPurchaseItemByIdService > ", parsedPurchaseItem.error);
        return new ValidationError("invalid data provided")
    }

    try {
        return await models.PurchaseItem.create(parsedPurchaseItem.data);
    } catch (error) {
        console.log("services/purchaseItem.services.ts > createPurchaseItemByIdService > ", error);
        throw new DatabaseError("unable to push purchaseItem to the db", error as Record<string, unknown>);
    }
}

export const createManyPurchaseItemsService = async (purchaseItemData: CreatePurchaseItemInputWithRequiredPurchaseId[]) => {
    const parsedPurchaseItem = CreatePurchaseItemSchemaWithRequiredPurchaseId.array().safeParse(purchaseItemData);
    if (!parsedPurchaseItem.success) {
        console.log("services/purchaseItem.services.ts > createPurchaseItemByIdService > ", parsedPurchaseItem.error);
        return new ValidationError("invalid data provided")
    }

    try {
        return await models.PurchaseItem.createAll(parsedPurchaseItem.data);
    } catch (error) {
        console.log("services/purchaseItem.services.ts > createPurchaseItemByIdService > ", error);
        throw new DatabaseError("unable to push purchaseItem to the db", error as Record<string, unknown>);
    }
}

export const updatePurchaseItemService = async (purchaseItemData: UpdatePurchaseItemInput) => {
    const parsedPurchaseItem = UpdatePurchaseItemSchema.safeParse(purchaseItemData);
    if (!parsedPurchaseItem.success) {
        console.log("services/purchaseItem.services.ts > updatePurchaseItemService > ", parsedPurchaseItem.error);
        return new ValidationError("invalid data provided")
    }

    try {
        return await models.PurchaseItem.where({ id: parsedPurchaseItem.data.id, purchaseId: parsedPurchaseItem.data.purchaseId }).update(parsedPurchaseItem.data);
    } catch (error) {
        console.log("services/purchaseItem.services.ts > updatePurchaseItemService > ", error);
        throw new DatabaseError("unable to push purchaseItem to the db", error as Record<string, unknown>);
    }
}

export const deletePurchaseItemService = async (id: string, purchaseId: string) => {
    if (!isUuid(id)) {
        return new ValidationError("invalid item id provided");
    }

    if (!isUuid(purchaseId)) {
        return new ValidationError("invalid purhcase id provided");
    }

    try {
        return await models.PurchaseItem.where({ id, purchaseId }).delete();
    } catch (error) {
        console.log("services/purchaseItem.services.ts > deletePurchaseItemService > ", error);
        throw new DatabaseError("unable to delete purchaseItem from the db", error as Record<string, unknown>);
    }
}

export const deleteAllPurchaseItemsService = async (purchaseId: string) => {
    if (!isUuid(purchaseId)) {
        return new ValidationError("invalid purchase id provided")
    }

    try {
        return await models.PurchaseItem.where({ purchaseId }).deleteAll();
    } catch (error) {
        console.log("services/purchaseItem.services.ts > deleteAllPurchaseItemsService > ", error);
        throw new DatabaseError("unable to delete purchaseItem from the db", error as Record<string, unknown>);
    }
}