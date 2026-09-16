import { DatabaseError } from "@/errors/db.error";
import { ValidationError } from "@/errors/validation.error";
import { db, models } from "@/prisma/db";
import { isUuid } from "@/utils/uuid";
import { CreatePurchaseInput, CreatePurchaseSchema, GetPurchaseSchema, UpdatePurchaseInput, UpdatePurchaseSchema } from "@/zod/purchase.schema";
import { CreatePurchaseItemInput, CreatePurchaseItemSchema } from "@/zod/purchaseItem.schema";
import { updateProductInventoryFromPurchaseItems } from "../utils/productInventory";
import { AppError } from "@/errors/base.error";
import { calculatePurchase } from "../calculations/purchases";

export const getAllPurchasesService = async (storeId: string) => {
    if (!isUuid(storeId)) {
        return new ValidationError("invalid store id provided")
    }

    try {
        const dbPurchases = await models.Purchase
            .where({ storeId })
            .include('items')
            .include('supplier', (s) => s.select('id', 'name'))
            .orderBy((p) => p.purchaseDate.desc())
            .all();

        const parsedPurchases = GetPurchaseSchema.array().safeParse(dbPurchases);
        if (!parsedPurchases.success) {
            console.log("services/purchase.services.ts > getAllPurchasesService > ", parsedPurchases.error);
            return new ValidationError("invalid data received from the db");
        }

        return parsedPurchases.data;
    } catch (error) {
        console.log("services/purchase.services.ts > getAllPurchasesService > ", error);
        throw new DatabaseError("unable to get all purchases from the db", error as Record<string, unknown>);
    }
}

export const getPurchaseByIdService = async (storeId: string, id: string) => {
    if (!isUuid(id)) {
        return new ValidationError("invalid purcahse id provided");
    }

    if (!isUuid(storeId)) {
        return new ValidationError("invalid store id provided");
    }

    try {
        const dbPurchase = await models.Purchase.where({ id, storeId }).include('items').first();
        const parsedPurchase = GetPurchaseSchema.safeParse(dbPurchase);
        if (!parsedPurchase.success) {
            console.log("services/purchase.services.ts > getPurchaseByIdService > ", parsedPurchase.error);
            return new ValidationError("recieved invalid data from the db");
        }

        return parsedPurchase.data;
    } catch (error) {
        console.log("services/purchase.services.ts > getPurchaseByIdService > ", error);
        throw new DatabaseError("unable to get purchase from the db", error as Record<string, unknown>);
    }
}

export const createPurchaseService = async (purchaseData: CreatePurchaseInput, purchaseItems: CreatePurchaseItemInput[] = []) => {
    const parsedPurchase = CreatePurchaseSchema.safeParse(purchaseData);
    if (!parsedPurchase.success) {
        console.log("services/purchase.services.ts > createPurchaseByIdService > ", parsedPurchase.error);
        return new ValidationError("invalid data provided")
    }

    const parsedPurchaseItems = CreatePurchaseItemSchema.array().safeParse(purchaseItems);
    if (!parsedPurchaseItems.success) {
        console.log("services/purchase.services.ts > createPurchaseByIdService > ", parsedPurchaseItems.error);
        return new ValidationError("invalid purchaseItems provided");
    }

    const { calculatedPurchaseItems, subtotal, totalAmount, amountDue } = calculatePurchase(parsedPurchase.data, parsedPurchaseItems.data)

    try {
        const result = await db.transaction(async (tx) => {
            const createdPurchase = await tx.orm.public.Purchase.create({
                ...parsedPurchase.data,
                subtotal,
                totalAmount,
                amountDue,
                items: (items) => items.create(calculatedPurchaseItems)
            });

            const effectedProducts = [];
            for (const item of calculatedPurchaseItems) {
                const updatedProduct =
                    await updateProductInventoryFromPurchaseItems(
                        parsedPurchase.data,
                        item,
                        tx
                    );

                if (updatedProduct instanceof AppError) {
                    console.log(`error updating a product: `, updatedProduct)
                    throw updatedProduct;
                }

                effectedProducts.push(updatedProduct);
            }

            return {
                created: {
                    ...createdPurchase,
                    items: calculatedPurchaseItems
                },
                effected: effectedProducts
            }
        })

        return result;
    } catch (error) {
        console.log("services/purchase.services.ts > createPurchaseByIdService > ", error);
        throw new DatabaseError("unable to push purchase to the db", error as Record<string, unknown>);
    }
}

export const updatePurchaseService = async (storeId: string, purchaseData: UpdatePurchaseInput) => {
    if (!isUuid(storeId)) {
        return new ValidationError("invalid store id provided")
    }
    
    const parsedPurchase = UpdatePurchaseSchema.safeParse(purchaseData);
    if (!parsedPurchase.success) {
        console.log("services/purchase.services.ts > updatePurchaseService > ", parsedPurchase.error);
        return new ValidationError("invalid data provided")
    }

    try {
        return await models.Purchase.where({ id: parsedPurchase.data.id, storeId }).update(parsedPurchase.data);
    } catch (error) {
        console.log("services/purchase.services.ts > updatePurchaseService > ", error);
        throw new DatabaseError("unable to push purchase to the db", error as Record<string, unknown>);
    }
}

export const deletePurchaseService = async (storeId: string, id: string) => {
    if (!isUuid(id)) {
        return new ValidationError("invalid id provided");
    }

    if (!isUuid(storeId)) {
        return new ValidationError("invalid id provided");
    }

    try {
        return await models.Purchase.where({ id, storeId }).delete();
    } catch (error) {
        console.log("services/purchase.services.ts > deletePurchaseService > ", error);
        throw new DatabaseError("unable to delete purchase from the db", error as Record<string, unknown>);
    }
}

export const deleteAllPurchasesService = async (storeId: string) => {
    if (!isUuid(storeId)) {
        return new ValidationError("invalid store id provided")
    }

    try {
        return await models.Purchase.where({ storeId }).deleteAll();
    } catch (error) {
        console.log("services/purchase.services.ts > deletePurchaseService > ", error);
        throw new DatabaseError("unable to delete purchase from the db", error as Record<string, unknown>);
    }
}