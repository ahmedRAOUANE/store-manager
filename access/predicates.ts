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