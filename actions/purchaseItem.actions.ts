"use server";

import { createPurchaseItemService, deleteAllPurchaseItemsService, deletePurchaseItemService, getAllPurchaseItemsService, getPurchaseItemByIdService, updatePurchaseItemService } from "@/services/purchaseItem.services";
import { CreatePurchaseItemInputWithRequiredPurchaseId, UpdatePurchaseItemInput } from "@/zod/purchaseItem.schema";

/**
* ! this file is currently under investigation, I don't know if I should add these services or
* the plan as usual frees it until the actual usage shows wether we need them or not
 */

export const getAllPurchaseItems = (purchaseId: string) => getAllPurchaseItemsService(purchaseId);

export const getPurchaseItemById = (id: string, purchaseId: string) => getPurchaseItemByIdService(id, purchaseId);

export const createPurchaseItem = (PurchaseItem: CreatePurchaseItemInputWithRequiredPurchaseId) => createPurchaseItemService(PurchaseItem);

export const updatePurchaseItem = (PurchaseItem: UpdatePurchaseItemInput) => updatePurchaseItemService(PurchaseItem);

export const deletePurchaseItem = (id: string, purchaseId: string) => deletePurchaseItemService(id, purchaseId);

export const deleteAllPurchaseItems = (purchaseId: string) => deleteAllPurchaseItemsService(purchaseId);
