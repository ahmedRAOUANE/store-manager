import { AuthorizationError } from "@/errors/auth.error";
import { AppError } from "@/errors/base.error";
import { getActiveMembershipService } from "@/services/storeMembership.services";

import { getCurrentUser } from "./context";
import { canOperateOnStore, hasGlobalRole, hasStoreRole } from "./predicates";
import type {
    AuthenticatedUser,
    GlobalRole,
    StoreMembership,
    StoreRole,
} from "./types";
import { getStoreService } from "@/services/store.services";

type AuthenticatedHandler<TArgs extends unknown[], TResult> = (
    user: AuthenticatedUser,
    ...args: TArgs
) => TResult | Promise<TResult>;

/* ========================================================================== */
/*  Identity wrappers                                                         */
/* ========================================================================== */

/**
 * Require an authenticated user.
 *
 * Throws `AuthenticationError` (from the context layer) if the user is
 * not authenticated. Passes the resolved user to the handler on success.
 *
 * This is the base of every wrapper. All other wrappers call into it so
 * that identity resolution is guaranteed to run first and any auth
 * failure is thrown before any store or role work happens.
 */
export const withAuth = <TArgs extends unknown[], TResult>(
    handler: AuthenticatedHandler<TArgs, TResult>,
) => {
    return async (...args: TArgs): Promise<TResult> => {
        const user = await getCurrentUser();
        if (user instanceof AppError) {
            throw user;
        }

        return await handler(user, ...args);
    };
};

/**
 * Require an authenticated user whose global role is in the given set.
 *
 * Throws `AuthorizationError` when the check fails. Global roles
 * (`ADMIN`, `USER`) are platform-wide and unrelated to store membership.
 */
export const withGlobalRole = <TArgs extends unknown[], TResult>(
    allowedRoles: readonly GlobalRole[],
    handler: AuthenticatedHandler<TArgs, TResult>,
) => {
    return withAuth(async (user, ...args: TArgs) => {
        if (!hasGlobalRole(user, allowedRoles)) {
            throw new AuthorizationError();
        }

        return await handler(user, ...args);
    });
};

export const withStoreAccess = <
    TArgs extends [string, ...unknown[]],
    TResult,
>(
    handler: (
        user: AuthenticatedUser,
        membership: StoreMembership,
        ...args: TArgs
    ) => TResult | Promise<TResult>,
) => {
    return withAuth(async (user, ...args: TArgs) => {
        const [storeId] = args;

        const membership = await getActiveMembershipService(
            user.id,
            storeId,
        );

        if (membership instanceof AppError) {
            throw membership;
        }

        if (!membership) {
            throw new AuthorizationError();
        }

        // Store-status enforcement.
        //
        // A suspended or pending store must reject business mutations.
        // The layout also redirects away from non-active stores, but
        // Server Actions can be invoked directly, so the check must
        // also live here at the action-authorization boundary.
        //
        // Admins bypass this check so platform-level recovery flows
        // (activation, data repair) continue to work. See
        // `canOperateOnStore` for the full policy.
        //
        // Note: this blocks read actions too, not just mutations. In
        // this app that is acceptable because the workspace layout
        // redirects users away from suspended stores entirely — no UI
        // exists to invoke reads while suspended. If self-service
        // reads are ever needed during suspension, split this wrapper
        // into read and write variants.
        const store = await getStoreService(storeId);
        if (store instanceof AppError) {
            throw store;
        }
        if (!canOperateOnStore(store.status, user.globalRole)) {
            throw new AuthorizationError();
        }

        return await handler(user, membership, ...args);
    });
};

/**
 * Require an active membership in the store with one of the given
 * roles.
 *
 * Throws `AuthorizationError` when the user has no active membership
 * in the store, or when their membership role is not in the allowed
 * set.
 *
 * The role check goes through `hasStoreRole` — the same predicate the
 * `requireStoreRole` guard uses — so the "can this role do this?" rule
 * is expressed in one place and cannot drift between pages and
 * actions.
 */
export const withStoreRole = <
    TArgs extends [string, ...unknown[]],
    TResult,
>(
    allowedRoles: readonly StoreRole[],
    handler: (
        user: AuthenticatedUser,
        membership: StoreMembership,
        ...args: TArgs
    ) => TResult | Promise<TResult>,
) => {
    return withStoreAccess(
        async (user, membership, ...args: TArgs) => {
            if (!hasStoreRole(membership, allowedRoles)) {
                throw new AuthorizationError();
            }

            return await handler(user, membership, ...args);
        },
    );
};