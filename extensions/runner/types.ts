/**
 * Runner's type surface.
 *
 * After Phase B's B1 delivery, the extension-facing types live in
 * `@store-manager/extensions`. This file:
 *
 *   1. Re-exports the extension-facing surface for backwards
 *      compatibility — every existing `import { X } from "./types"`
 *      in the runner continues to work.
 *
 *   2. Defines the runtime-only types the runner adds on top: the
 *      in-memory `LoadedExtension` representation, and the two custom
 *      error classes.
 *
 *   3. Redefines `HookHandler` and `ExtensionExportedDefault` locally.
 *      The library's versions of these carry per-hook payload types
 *      (`HookPayloads[H]`); the runner's internal dispatch cannot carry
 *      that correlation through a `Map<HookName, HookHandler>`, so the
 *      local versions erase the payload to `unknown`. Extension authors
 *      who want typed handlers import `HookHandler` from
 *      `@store-manager/extensions` directly.
 */

import type {
    ExtensionContext,
    ExtensionNotificationDefinition,
    ExtensionScope,
    HookName,
    Manifest,
} from "@store-manager/extensions";

/* ==========================================================================
 * Extension-facing types (re-exported from the library)
 * ========================================================================== */

export {
    HOOK_NAMES,
    type HookName,
    type ExtensionScope,
    type ExtensionUserContext,
    type ExtensionStoreContext,
    type ExtensionLogApi,
    type ExtensionDbApi,
    type ExtensionStorageApi,
    type ExtensionNotificationsApi,
    type ExtensionHttpApi,
    type ExtensionContext,
    type ExtensionNotificationDefinition,
    type Manifest,
} from "@store-manager/extensions";

/* ==========================================================================
 * Runner-local redefinitions
 * ========================================================================== */

/**
 * The runner's erased handler type.
 *
 * The library's `HookHandler<H>` carries a per-hook payload type.
 * Extension authors use that form for typed handlers. The runner's
 * dispatch machinery cannot preserve the correlation between a hook
 * name and its payload type through a `Map<HookName, HookHandler>`,
 * so this file redeclares `HookHandler` with the payload erased to
 * `unknown`.
 *
 * The two types are intentionally separate, not assignable to each
 * other in the contravariant direction. Runtime behavior is identical
 * — both describe a function taking `(ctx, payload)` and returning
 * `Promise<void> | void`. Only the type-level payload precision
 * differs.
 */
export type HookHandler = (
    ctx: ExtensionContext,
    payload: unknown,
) => Promise<void> | void;

/**
 * Alias for the author info in a manifest. Previously a standalone
 * interface; now derived from the manifest schema so that the shape
 * stays in sync if the schema ever gains a field.
 */
export type ExtensionAuthor = Manifest["author"];

/**
 * The shape an extension's compiled `index.js` exports as `default`.
 *
 * Differs from the library's `ExtensionExportedDefault` in one way:
 * `hooks` is `Partial<Record<HookName, HookHandler>>` using the
 * runner's erased handler, not the library's typed `HookHandlerMap`.
 * At the boundary the runner has no way to know which hook a given
 * handler is registered for, so the payload is erased.
 *
 * `notifications` is the same shape as the library's, but written as
 * a mutable `Record` rather than the library's `Readonly<Record>` —
 * no runner code mutates this object, but the loader builds it and
 * the guard narrows to it, so the mutable form matches the
 * construction site.
 */
export interface ExtensionExportedDefault {
    notifications: Record<string, ExtensionNotificationDefinition>;
    hooks: Partial<Record<HookName, HookHandler>>;
}

/* ==========================================================================
 * Runner-runtime types
 *
 * These are the runner's internal representation. Not part of the
 * extension-facing contract — extension code should never import them.
 * ========================================================================== */

export interface LoadedExtension {
    installId: string;
    extensionId: string;
    version: string;
    scope: ExtensionScope;
    scopeId: string;
    manifest: Manifest;
    capabilities: Set<string>;
    handlers: Map<HookName, HookHandler>;
    notificationDefinitions: Array<{
        eventName: string;
        definition: ExtensionNotificationDefinition;
    }>;
    quotaMaxRows: number;
    quotaMaxBytes: number;
}

export class ExtensionCapabilityError extends Error {
    constructor(
        public readonly extensionId: string,
        public readonly capability: string,
    ) {
        super(
            `Extension "${extensionId}" attempted to use undeclared capability "${capability}"`,
        );
        this.name = "ExtensionCapabilityError";
    }
}

export class ExtensionQuotaExceeded extends Error {
    constructor(
        message: string,
        public readonly details: { current: number; limit: number },
    ) {
        super(message);
        this.name = "ExtensionQuotaExceeded";
    }
}