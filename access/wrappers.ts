import { AuthorizationError } from "@/errors/auth.error";
import { AppError } from "@/errors/base.error";
import { getActiveMembershipService } from "@/services/storeMembership.services";

import { getCurrentUser } from "./context";
import { hasGlobalRole, hasStoreRole } from "./predicates";
import type {
    AuthenticatedUser,
    GlobalRole,
    StoreMembership,
    StoreRole,
} from "./types";

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

/* ========================================================================== */
/*  Store wrappers                                                            */
/* ========================================================================== */

/**
 * Require an active membership in the store identified by the first
 * argument.
 *
 * The first argument is consumed as the store ID and is also forwarded
 * to the handler. This is what makes `withStoreAccess` and its
 * subclasses compatible with the existing call-site signature:
 *
 *   withStoreRole(["OWNER"], async (_user, _membership, storeId) => ...)
 *
 * Throws `AuthorizationError` when the user has no active membership
 * in the store.
 */
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