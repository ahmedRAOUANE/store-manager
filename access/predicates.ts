/**
 * ! boundaries
 * this file answers yes/no questions
 * this file should not depend on anything else
 */

import type {
    AuthenticatedUser,
    GlobalRole,
    StoreMembership,
    StoreRole,
} from "./types";

/**
 * Does this store membership hold one of the given roles?
 *
 * Returns `false` for a null or undefined membership — a user with no
 * active membership in the store cannot hold any role in it.
 *
 * This is the single source of truth for store-role checks. Guards and
 * wrappers call it; nothing else should compare `membership.role`
 * directly.
 */
export const hasStoreRole = (
    membership: StoreMembership | null | undefined,
    roles: readonly StoreRole[],
): boolean => {
    if (!membership) {
        return false;
    }

    return roles.includes(membership.role as StoreRole);
};

/**
 * Does this user hold one of the given global roles?
 *
 * Global roles (`ADMIN`, `USER`) are platform-wide and unrelated to
 * store membership. Use `hasStoreRole` for anything scoped to a store.
 */
export const hasGlobalRole = (
    user: AuthenticatedUser,
    roles: readonly GlobalRole[],
): boolean => {
    return roles.includes(user.globalRole);
};

/**
 * Is this user the target of the check?
 *
 * Used to gate "own profile" routes and any operation that a user
 * should only perform on themselves. The comparison is on user IDs,
 * not on any display value.
 */
export const isSelf = (
    user: AuthenticatedUser,
    targetUserId: string,
): boolean => {
    return user.id === targetUserId;
};

/**
 * Can this user operate on a store in this status?
 *
 * `ADMIN` global role bypasses the status check so platform admins
 * can still perform administrative recovery on suspended stores.
 *
 * For non-admin users, only `ACTIVE` stores permit operation. This is
 * deliberately stricter than "only block SUSPENDED" because `PENDING`
 * stores are in the middle of activation and should not accept
 * business mutations before they are ready.
 *
 * See `withStoreAccess` for the enforcement point.
 */
export const canOperateOnStore = (
    storeStatus: "PENDING" | "ACTIVE" | "SUSPENDED",
    globalRole: GlobalRole,
): boolean => {
    if (globalRole === "ADMIN") {
        return true;
    }
    return storeStatus === "ACTIVE";
};