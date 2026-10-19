import { AppError } from "@/errors/base.error";
import { CreatePurchaseItemInput } from "@/zod/purchaseItem.schema";
import { mutateProductInventoryInTransaction } from "@/utils/inventoryMutation";
import { TransactionClient } from "@/prisma/db";
import { ValidationError } from "@/errors/validation.error";
import { isUuid } from "./uuid";

// new version
export const updateProductInventoryFromPurchaseItems = async (
    storeId: string,
    item: CreatePurchaseItemInput,
    transaction?: TransactionClient,
) => {
    if (!isUuid(storeId)) {
        throw new ValidationError("invalid store id provided");
    }

    if (!transaction) {
        throw new Error(
            "Purchase inventory updates require the purchase transaction",
        );
    }

    try {
        return await mutateProductInventoryInTransaction({
            tx: transaction,
            storeId: storeId,
            productId: item.productId,
            quantityChange: item.quantity,
            purchasedUnitCost: item.unitCost,
        });
    } catch (error) {
        if (error instanceof AppError) {
            return error;
        }

        throw error;
    }
};
