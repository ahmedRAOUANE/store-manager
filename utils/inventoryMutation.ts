
import { param } from "@prisma/orm-postgres/relational-core/expression";

import { AppError } from "@/errors/base.error";
import { db, type TransactionClient } from "@/prisma/db";
import {
    createNotificationsForRecipientsInTransaction,
    getLowStockRecipientIdsInTransaction,
} from "@/services/notification.services";
import { crossedIntoLowStock } from "@/utils/notification-transitions";
import { calculateProductNewAverageCost } from "@/calculations/purchases";

interface LockedProductInventory {
    id: string;
    name: string;
    stockQuantity: number;
    minimumStock: number;
    averageCost: number;
}

interface MutateProductInventoryInput {
    tx: TransactionClient;
    storeId: string;
    productId: string;
    quantityChange: number;
    purchasedUnitCost?: number;
}

export const mutateProductInventoryInTransaction = async ({
    tx,
    storeId,
    productId,
    quantityChange,
    purchasedUnitCost,
}: MutateProductInventoryInput) => {
    if (
        !Number.isFinite(quantityChange) ||
        quantityChange === 0
    ) {
        throw new Error("Inventory quantity change must be finite and non-zero");
    }

    if (
        quantityChange > 0 &&
        (
            purchasedUnitCost === undefined ||
            !Number.isFinite(purchasedUnitCost) ||
            purchasedUnitCost < 0
        )
    ) {
        throw new Error(
            "A valid purchase unit cost is required when increasing inventory",
        );
    }

    const lockPlan = db.raw.sql`
        SELECT
            "id",
            "name",
            "stockQuantity",
            "minimumStock",
            "averageCost"
        FROM "product"
        WHERE
            "id" = ${param(productId, { codecId: "pg/uuid@1" })}
            AND "storeId" = ${param(storeId, { codecId: "pg/uuid@1" })}
        FOR UPDATE
    `
        .returnsRow({
            id: {
                codecId: "pg/uuid@1",
                nullable: false,
            },
            name: {
                codecId: "pg/text@1",
                nullable: false,
            },
            stockQuantity: {
                codecId: "pg/float8@1",
                nullable: false,
            },
            minimumStock: {
                codecId: "pg/float8@1",
                nullable: false,
            },
            averageCost: {
                codecId: "pg/float8@1",
                nullable: false,
            },
        })
        .build();

    const product = await tx.query(lockPlan).first() as
        | LockedProductInventory
        | null;

    if (!product) {
        throw new AppError("Product not found");
    }

    const newStockQuantity =
        product.stockQuantity + quantityChange;

    if (newStockQuantity < 0) {
        throw new AppError(
            `Insufficient stock for product: ${product.name}`,
        );
    }

    const newAverageCost =
        quantityChange > 0
            ? calculateProductNewAverageCost({
                existingStock: product.stockQuantity,
                existingAverageCost: product.averageCost,
                purchasedQuantity: quantityChange,
                purchasedUnitCost: purchasedUnitCost!,
            })
            : product.averageCost;

    const updatePlan = db.raw.sql`
        UPDATE "product"
        SET
            "stockQuantity" = ${param(
        newStockQuantity,
        { codecId: "pg/float8@1" },
    )},
            "averageCost" = ${param(
        newAverageCost,
        { codecId: "pg/float8@1" },
    )},
            "updatedAt" = ${param(
        Temporal.Instant.fromEpochMilliseconds(Date.now()),
        { codecId: "pg/timestamptz-temporal@1" },
    )}
        WHERE
            "id" = ${param(productId, { codecId: "pg/uuid@1" })}
            AND "storeId" = ${param(storeId, { codecId: "pg/uuid@1" })}
    `
        .affectedCount()
        .build();

    const updateResult = await tx.execute(updatePlan);

    if (updateResult.affectedRows !== 1) {
        throw new Error(
            `Expected to update one product inventory row; updated ${updateResult.affectedRows}`,
        );
    }

    const before = {
        stockQuantity: product.stockQuantity,
        minimumStock: product.minimumStock,
    };

    const after = {
        stockQuantity: newStockQuantity,
        minimumStock: product.minimumStock,
    };

    if (crossedIntoLowStock(before, after)) {
        const recipientIds =
            await getLowStockRecipientIdsInTransaction(tx, storeId);

        await createNotificationsForRecipientsInTransaction(
            tx,
            recipientIds,
            storeId,
            {
                type: "PRODUCT_LOW_STOCK",
                payload: {
                    productId: product.id,
                    productName: product.name,
                    stockQuantity: newStockQuantity,
                    minimumStock: product.minimumStock,
                },
            },
        );
    }

    return {
        ...product,
        stockQuantity: newStockQuantity,
        averageCost: newAverageCost,
    };
};
