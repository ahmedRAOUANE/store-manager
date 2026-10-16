import { z } from "zod";
import { UuidSchema } from "@/zod/general.schema";
import { defineNotification, derivePresentation, requireStoreId } from "../definition";
import { getStoreOwnersAndManagers } from "../recipients";

/**
 * Payload for PRODUCT_LOW_STOCK.
 *
 * `productName`, `stockQuantity`, and `minimumStock` are captured at
 * event time. The notification is a historical record of what crossed
 * the threshold — it is not re-resolved against current product state
 * when rendered.
 */
const ProductLowStockPayloadSchema = z
    .object({
        productId: UuidSchema,
        productName: z.string().trim().min(1).max(200),
        stockQuantity: z.number().nonnegative(),
        minimumStock: z.number().nonnegative(),
    })
    .strict();

/**
 * PRODUCT_LOW_STOCK
 *
 * Fired from the inventory mutation path when a product's stock crosses
 * from above `minimumStock` to at-or-below it. The transition rule lives
 * in `crossedIntoLowStock` and is checked by the caller before publishing.
 *
 * Recipients: active OWNER and MANAGER members of the store.
 * STAFF is intentionally excluded — this is a decision-maker alert.
 */
export const productLowStock = defineNotification({
    type: "PRODUCT_LOW_STOCK",
    payloadSchema: ProductLowStockPayloadSchema,
    presentation: derivePresentation("PRODUCT_LOW_STOCK"),
    resolveRecipients: (tx, ctx) =>
        getStoreOwnersAndManagers(tx, requireStoreId(ctx)),
});