import { z } from "zod";
import { defineNotification, derivePresentation, requireStoreId } from "../definition";
import { getStoreOwners } from "../recipients";

/**
 * Payload shared by store lifecycle events.
 *
 * `storeName` is captured at event time so a historical notification
 * remains meaningful even if the store is later renamed.
 */
const StoreNamePayloadSchema = z
    .object({
        storeName: z.string().trim().min(1).max(200),
    })
    .strict();

/**
 * STORE_ACTIVATED
 *
 * Fired by the platform admin activation flow. Notifies the store's
 * owners that the store is now live.
 *
 * Recipients: active OWNER members of the store.
 */
export const storeActivated = defineNotification({
    type: "STORE_ACTIVATED",
    payloadSchema: StoreNamePayloadSchema,
    presentation: derivePresentation("STORE_ACTIVATED"),
    resolveRecipients: (tx, ctx) =>
        getStoreOwners(tx, requireStoreId(ctx)),
});

/**
 * STORE_SUSPENDED
 *
 * Fired by the platform admin suspension flow. Notifies the store's
 * owners that the store is no longer available.
 *
 * Recipients: active OWNER members of the store.
 */
export const storeSuspended = defineNotification({
    type: "STORE_SUSPENDED",
    payloadSchema: StoreNamePayloadSchema,
    presentation: derivePresentation("STORE_SUSPENDED"),
    resolveRecipients: (tx, ctx) =>
        getStoreOwners(tx, requireStoreId(ctx)),
});