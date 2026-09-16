import { AppError } from "@/errors/base.error";
import { CreatePurchaseInput } from "@/zod/purchase.schema";
import { CreatePurchaseItemInput } from "@/zod/purchaseItem.schema";
import { getSingleProductService, updateProductCalculatedFieldsService } from "../services/product.services";
import { AverageCostTermsInput } from "@/zod/calculations.schema";
import { calculateProductNewAverageCost } from "../calculations/purchases";
import { UpdateProductCalculatedFieldsInput } from "@/zod/product.schema";
import { TransactionClient } from "@/prisma/db";

export const updateProductInventoryFromPurchaseItems = async (
    purchase: CreatePurchaseInput,
    item: CreatePurchaseItemInput,
    transaction?: TransactionClient
) => {
    const product = await getSingleProductService(
        purchase.storeId,
        item.productId,
        transaction
    );

    if (product instanceof AppError) {
        return new AppError("failed to find product");
    }

    const averageCostTerms: AverageCostTermsInput = {
        existingStock: product.stockQuantity,
        existingAverageCost: product.averageCost,
        purchasedQuantity: item.quantity,
        purchasedUnitCost: item.unitCost,
    };

    const newAverageCost =
        calculateProductNewAverageCost(averageCostTerms);

    const updatedProductData: UpdateProductCalculatedFieldsInput = {
        stockQuantity: product.stockQuantity + item.quantity,
        averageCost: newAverageCost,
    };

    const updatedProduct =
        await updateProductCalculatedFieldsService(purchase.storeId, product.id, updatedProductData, transaction);

    if (updatedProduct instanceof AppError) {
        return new AppError("failed to update the inventory");
    }

    return updatedProduct;
};