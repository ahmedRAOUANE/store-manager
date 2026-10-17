import { cache } from "react";

import { AuthenticationError, AuthorizationError } from "@/errors/auth.error";
import { AppError } from "@/errors/base.error";
import { getStoreService } from "@/services/store.services";
import { getActiveMembershipService } from "@/services/storeMembership.services";
import { syncKindeUserService } from "@/services/user.services";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

import type { AuthenticatedUser, StoreContext } from "./types";

/**
 * Resolve the currently authenticated user.
 *
 * Returns `AppError` rather than throwing. This is the identity layer —
 * its callers (guards, wrappers, page renders) decide how to react.
 * Guards redirect, wrappers throw, pages render an error state. The
 * context layer has no opinion.
 *
 * Wrapped in `cache()` so multiple calls in the same request — a page
 * guard, a layout guard, a server action — all resolve to a single
 * lookup.
 */
export const getCurrentUser = cache(
    async (): Promise<AuthenticatedUser | AppError> => {
        try {
            const {
                isAuthenticated,
                getUser: getKindeUser,
            } = getKindeServerSession();

            // `isAuthenticated` throws NEXT_REDIRECT when the user is
            // not authenticated. Catching it here lets pages render
            // their own auth state instead of being force-redirected
            // from inside this function.
            let isAuthed = false;

            try {
                isAuthed = (await isAuthenticated()) ?? false;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (error: any) {
                console.log(
                    "access/context.ts > getCurrentUser > ",
                    error,
                );

                if (error?.digest?.startsWith("NEXT_REDIRECT")) {
                    isAuthed = false;
                } else {
                    return new AppError("auth check failed");
                }
            }

            if (!isAuthed) {
                return new AuthenticationError();
            }

            const kindeUser = await getKindeUser();

            if (!kindeUser?.id) {
                return new AuthenticationError();
            }

            return await syncKindeUserService({
                id: kindeUser.id,
                email: kindeUser.email,
                given_name: kindeUser.given_name,
                family_name: kindeUser.family_name,
                picture: kindeUser.picture,
            });
        } catch (error) {
            console.log(
                "access/context.ts > getCurrentUser > ",
                error,
            );

            if (error instanceof AuthenticationError) {
                return error;
            }

            return new AuthenticationError();
        }
    },
);

/**
 * Resolve the current user's context within a specific store.
 *
 * On success: returns `{ user, store, membership }` — everything a
 * page or action needs to render a store view or perform a
 * store-scoped operation, in one call.
 *
 * On failure: returns the appropriate `AppError`. The distinction
 * matters to the caller:
 *   - `AuthenticationError` — not logged in; redirect to login
 *   - `AuthorizationError` — logged in but not an active member
 *   - other `AppError` — store not found, DB error, etc.
 *
 * Wrapped in `cache()`. The inner `getCurrentUser` call is already
 * cached, so repeat invocations from page + layout + action all share
 * one resolution.
 */
export const getCurrentStoreContext = cache(
    async (storeId: string): Promise<StoreContext | AppError> => {
        try {
            const user = await getCurrentUser();
            if (user instanceof AppError) {
                return user;
            }

            const membership = await getActiveMembershipService(
                user.id,
                storeId,
            );

            if (membership instanceof AppError) {
                return membership;
            }

            if (!membership) {
                return new AuthorizationError();
            }

            const store = await getStoreService(storeId);

            if (store instanceof AppError) {
                return store;
            }

            return {
                user,
                store,
                membership,
            };
        } catch (error) {
            console.log(
                "access/context.ts > getCurrentStoreContext > ",
                error,
            );
            return new AppError("context error");
        }
    },
);