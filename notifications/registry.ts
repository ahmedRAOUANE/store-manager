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
 * Frozen so nothing accidentally mutates it at runtime. Extensions
 * never add entries here; their types live in the runtime registry
 * below, managed by the extension runner.
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

export type CoreNotificationType = keyof typeof CORE_NOTIFICATION_REGISTRY;

export const isCoreNotificationType = (
    type: string,
): type is CoreNotificationType =>
    Object.prototype.hasOwnProperty.call(
        CORE_NOTIFICATION_REGISTRY,
        type,
    );

/* ========================================================================== */
/*  Runtime extension registry                                                */
/* ========================================================================== */

/**
 * Extension-provided notification definitions, populated at boot by the
 * extension runner. Keyed by the full type ID (`ext.<extensionId>.<EVENT>`).
 *
 * The map is module-level and mutable by design — extensions install and
 * uninstall at runtime. All mutations go through the two functions below
 * so that invariants (no core-type collision, no double-registration)
 * stay enforced in one place.
 */
const EXTENSION_NOTIFICATION_REGISTRY = new Map<
    string,
    NotificationDefinition
>();

/**
 * Register an extension-provided notification definition.
 *
 * Throws if:
 *   - the type collides with a core type (extensions cannot shadow core)
 *   - the type is already registered (double-registration is a runner bug)
 *
 * The runner is responsible for unregistering on uninstall; the registry
 * does not track which install registered what. That bookkeeping lives in
 * the runner's in-memory state.
 */
// export const registerExtensionNotification = (
//     definition: NotificationDefinition,
// ): void => {
//     if (isCoreNotificationType(definition.type)) {
//         throw new Error(
//             `Cannot register extension notification with core type ID "${definition.type}"`,
//         );
//     }

//     if (EXTENSION_NOTIFICATION_REGISTRY.has(definition.type)) {
//         throw new Error(
//             `Notification type "${definition.type}" is already registered`,
//         );
//     }

//     EXTENSION_NOTIFICATION_REGISTRY.set(definition.type, definition);
// };

export const registerExtensionNotification = (
    definition: NotificationDefinition,
): void => {
    if (isCoreNotificationType(definition.type)) {
        throw new Error(
            `Cannot register extension notification with core type ID "${definition.type}"`,
        );
    }

    if (EXTENSION_NOTIFICATION_REGISTRY.has(definition.type)) {
        /*
         * Idempotent: multiple installs of the same extension register
         * the same type string. The registry is keyed by type, not by
         * install, because notification rendering has no install context
         * — a stored notification's `type` is looked up to a single
         * definition regardless of which install produced it.
         *
         * First-wins semantics: the definition loaded first is
         * preserved. Subsequent registrations of the same type from
         * another install are silently ignored.
         *
         * Caveat for future versions: if two installs use different
         * versions of the extension and the payload schema diverged
         * between them, stored notifications from one version may
         * fail to parse against the other version's schema. Fixing
         * this requires version-pinned lookup (e.g. adding `version`
         * to `Notification` and looking up by `(type, version)`),
         * deferred until the phase where multi-version installs are
         * allowed.
         */
        return;
    }

    EXTENSION_NOTIFICATION_REGISTRY.set(definition.type, definition);
};

/**
 * Unregister an extension-provided notification definition.
 *
 * Silent no-op if the type is not currently registered — uninstall
 * flows run this idempotently, and an extension can be in an error
 * state where its definition was never registered to begin with.
 *
 * Throws if the caller tries to unregister a core type. That indicates
 * a runner bug — core types are not managed by the runtime registry.
 */
export const unregisterExtensionNotification = (type: string): void => {
    if (isCoreNotificationType(type)) {
        throw new Error(
            `Cannot unregister core notification type "${type}"`,
        );
    }

    EXTENSION_NOTIFICATION_REGISTRY.delete(type);
};

/**
 * Resolve a stored notification's `type` string to its definition.
 *
 * Checks core first, then extension. Returns `null` for unknown types —
 * including the type of an extension that has since been uninstalled.
 * Callers must handle `null` (fallback rendering).
 */
export const lookupNotificationDefinition = (
    type: string,
): NotificationDefinition | null => {
    if (isCoreNotificationType(type)) {
        return CORE_NOTIFICATION_REGISTRY[type];
    }

    return EXTENSION_NOTIFICATION_REGISTRY.get(type) ?? null;
};