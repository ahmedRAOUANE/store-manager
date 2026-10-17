/**
 * !boundaries
 * this file is only for pages
 */

import { redirect } from "next/navigation";

import { AuthenticationError } from "@/errors/auth.error";
import { AppError } from "@/errors/base.error";

import { getCurrentUser, getCurrentStoreContext } from "./context";
import { hasGlobalRole, hasStoreRole, isSelf } from "./predicates";
import type {
    AuthenticatedUser,
    GlobalRole,
    StoreContext,
    StoreRole,
} from "./types";

/* ========================================================================== */
/*  Redirect destinations                                                     */
/* ========================================================================== */

/**
 * Where guards send a user who is not authenticated.
 * Matches the destination used by `app/dashboard/page.tsx`.
 */
const LOGIN_PATH = "/api/auth/login";

/**
 * Where guards send a user who is authenticated but lacks the required
 * access. `/dashboard` re-resolves the user's role and forwards to their
 * correct landing page — so a demoted user who hits a stale URL ends up
 * in a page they can use, not an error screen.
 */
const DENIED_PATH = "/dashboard";

/* ========================================================================== */
/*  Identity guards                                                           */
/* ========================================================================== */

/**
 * Require an authenticated user.
 *
 * On failure, redirects to the login endpoint. On success, returns the
 * resolved user so the caller can use it without a second lookup.
 */
export const requireAuth = async (): Promise<AuthenticatedUser> => {
    const user = await getCurrentUser();

    if (user instanceof AppError) {
        redirect(LOGIN_PATH);
    }

    return user;
};

/**
 * Require an authenticated user whose ID matches the target.
 *
 * Used by `/user/[userId]/*` routes. Does NOT grant admin override —
 * call sites that need "self OR admin" compose the two predicates
 * explicitly:
 *
 *   const user = await requireAuth();
 *   if (!isSelf(user, targetUserId) && !hasGlobalRole(user, ["ADMIN"])) {
 *       redirect("/dashboard");
 *   }
 *
 * Keeping the override out of the guard means the rule lives at the
 * call site, not scattered inside an opaque guard.
 */
export const requireSelf = async (
    targetUserId: string,
): Promise<AuthenticatedUser> => {
    const user = await requireAuth();

    if (!isSelf(user, targetUserId)) {
        redirect(DENIED_PATH);
    }

    return user;
};

/**
 * Require an authenticated user whose global role is in the given set.
 *
 * Global roles (`ADMIN`, `USER`) are platform-wide and unrelated to
 * store membership. Use `requireStoreRole` for anything scoped to a
 * store.
 */
export const requireGlobalRole = async (
    roles: readonly GlobalRole[],
): Promise<AuthenticatedUser> => {
    const user = await requireAuth();

    if (!hasGlobalRole(user, roles)) {
        redirect(DENIED_PATH);
    }

    return user;
};

/* ========================================================================== */
/*  Store guards                                                              */
/* ========================================================================== */

/**
 * Require an active membership in the given store, any role.
 *
 * Use this for pages that any active member can visit — dashboards,
 * settings, member-only views. Use `requireStoreRole` when the page
 * additionally needs a specific role.
 */
export const requireStoreAccess = async (
    storeId: string,
): Promise<StoreContext> => {
    const ctx = await getCurrentStoreContext(storeId);

    if (ctx instanceof AppError) {
        if (ctx instanceof AuthenticationError) {
            redirect(LOGIN_PATH);
        }
        redirect(DENIED_PATH);
    }

    return ctx;
};

/**
 * Require an active membership in the given store with one of the
 * given roles.
 *
 * This is the guard that fixed the role-change race: when the user's
 * role drops mid-session, both the layout and the page call this
 * (or its sibling), both end up redirecting to `/dashboard`, and the
 * `withStoreRole` wrapper inside the action never runs because the
 * guard failed first.
 */
export const requireStoreRole = async (
    storeId: string,
    roles: readonly StoreRole[],
): Promise<StoreContext> => {
    const ctx = await getCurrentStoreContext(storeId);

    if (ctx instanceof AppError) {
        if (ctx instanceof AuthenticationError) {
            redirect(LOGIN_PATH);
        }
        redirect(DENIED_PATH);
    }

    if (!hasStoreRole(ctx.membership, roles)) {
        redirect(DENIED_PATH);
    }

    return ctx;
};