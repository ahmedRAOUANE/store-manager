import type { DefaultModelRow } from "@prisma/orm-postgres/orm-client";
import { z } from "zod";
import type { Contract } from "@/prisma/contract";
import { StoreRole as StoreRoleSchema } from "@/zod/membership.schema";
import type { GetStore } from "@/zod/store.schema";

/**
 * The Prisma row shape for the authenticated user.
 *
 * This is what `getCurrentUser` returns on success. Access control reads
 * the raw row, not a curated view, so the type must match the columns the
 * rest of the app uses.
 */
export type AuthenticatedUser = DefaultModelRow<Contract, "User", "public">;

/**
 * The Prisma row shape for an active store membership.
 *
 * `getActiveMembershipService` can return `null` when the user has no
 * active membership in the given store. Callers that have already
 * narrowed that away (via a guard or an `instanceof AppError` check) use
 * this non-null type. Callers that haven't should accept
 * `StoreMembership | null`.
 */
export type StoreMembership = DefaultModelRow<
    Contract,
    "StoreMembership",
    "public"
>;

/**
 * The composite context resolved by `getCurrentStoreContext` on success.
 *
 * Bundling the three values here means guards can return the context
 * directly, and pages don't have to re-resolve the user or the store
 * after the guard runs.
 */
export interface StoreContext {
    user: AuthenticatedUser;
    store: GetStore;
    membership: StoreMembership;
}

/**
 * The user's platform-wide role (`User.globalRole`).
 *
 * Derived from the DB row rather than re-declared, so adding a new
 * global role to the schema propagates here automatically.
 */
export type GlobalRole = AuthenticatedUser["globalRole"];

/**
 * The user's role within a single store (`StoreMembership.role`).
 *
 * Re-exported from the Zod schema so access code imports from one place
 * (`@/access/types`) rather than reaching into `@/zod/membership.schema`
 * directly. If the role set ever changes shape (e.g. to a hand-written
 * union), only this file changes.
 */
export type StoreRole = z.infer<typeof StoreRoleSchema>;