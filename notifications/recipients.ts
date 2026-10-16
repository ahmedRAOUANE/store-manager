import type { TransactionClient } from "@/prisma/db";
import {
    requireAffectedUserId,
    type NotificationPublishContext,
} from "./definition";

/**
 * Active OWNER members of a store.
 *
 * Used by store lifecycle events (activation, suspension).
 * Returns unique user IDs — the same user can only hold one membership
 * per store, but the deduplication is defensive against future changes
 * to the membership model.
 */
export const getStoreOwners = async (
    tx: TransactionClient,
    storeId: string,
): Promise<readonly string[]> => {
    const memberships = await tx.orm.public.StoreMembership
        .where({ storeId, status: "ACTIVE" })
        .all();

    return [
        ...new Set(
            memberships
                .filter((m) => m.role === "OWNER")
                .map((m) => m.userId),
        ),
    ];
};

/**
 * Active OWNER and MANAGER members of a store.
 *
 * Used by operational events that need the store's decision-makers
 * (today: PRODUCT_LOW_STOCK).
 */
export const getStoreOwnersAndManagers = async (
    tx: TransactionClient,
    storeId: string,
): Promise<readonly string[]> => {
    const memberships = await tx.orm.public.StoreMembership
        .where({ storeId, status: "ACTIVE" })
        .all();

    return [
        ...new Set(
            memberships
                .filter(
                    (m) => m.role === "OWNER" || m.role === "MANAGER",
                )
                .map((m) => m.userId),
        ),
    ];
};

/**
 * Resolver for user-scoped events: the only recipient is the user the
 * event concerns (e.g. the member whose role changed, or whose
 * membership was accepted).
 *
 * Extracted here rather than inlined per definition so the pattern has
 * one documented home if it later grows (e.g. "affected user plus store
 * owners").
 */
export const resolveAffectedUser = async (
    _tx: TransactionClient,
    ctx: NotificationPublishContext,
): Promise<readonly string[]> => [requireAffectedUserId(ctx)];