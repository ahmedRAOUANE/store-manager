import type { NotificationDefinition } from "./definition";
import { storeActivated, storeSuspended } from "./definitions/store";
import {
    memberRoleChanged,
    membershipAccepted,
    membershipInvalidated,
    membershipRejected,
    membershipRequested,
} from "./definitions/membership";
import { productLowStock } from "./definitions/inventory";

/**
 * The set of notification types owned by core (non-extension) code.
 *
 * This is the single source of truth for:
 *   - which event types core code can publish
 *   - the presentation keys each type resolves to
 *   - the compile-time union of core type IDs
 *
 * Extensions do NOT add entries here. They register their own
 * definitions through a future extension API. The publisher accepts any
 * `NotificationDefinition` regardless of registry membership, so core
 * and extension code share one publish path without sharing one list.
 *
 * Frozen to prevent accidental reassignment at runtime. The definitions
 * themselves are not deep-frozen; they are already constructed via
 * `defineNotification`, which is treated as an immutable contract.
 */
export const CORE_NOTIFICATION_REGISTRY = Object.freeze({
    [storeActivated.type]: storeActivated,
    [storeSuspended.type]: storeSuspended,
    [membershipAccepted.type]: membershipAccepted,
    [membershipRejected.type]: membershipRejected,
    [membershipInvalidated.type]: membershipInvalidated,
    [memberRoleChanged.type]: memberRoleChanged,
    [membershipRequested.type]: membershipRequested,
    [productLowStock.type]: productLowStock,
} satisfies Record<string, NotificationDefinition>);

/**
 * Union of core notification type identifiers.
 *
 * Derived from the registry, not declared by hand, so adding a
 * definition automatically extends the union and removing one shrinks it.
 *
 * This is a *closed* union. Extension-provided types are deliberately
 * not part of it — they are not core, and pretending otherwise would
 * couple the compile-time type graph to a runtime extension model that
 * does not exist yet.
 */
export type CoreNotificationType = keyof typeof CORE_NOTIFICATION_REGISTRY;

/**
 * Runtime type guard for core notification types.
 *
 * Read-side code (rendering, filtering) receives a stored
 * `type: string` from the database and narrows to the core union before
 * indexing the registry. Returning `false` is the correct outcome for
 * extension types and for unknown IDs — the caller decides how to
 * render or fall back.
 */
export const isCoreNotificationType = (
    type: string,
): type is CoreNotificationType =>
    Object.prototype.hasOwnProperty.call(
        CORE_NOTIFICATION_REGISTRY,
        type,
    );