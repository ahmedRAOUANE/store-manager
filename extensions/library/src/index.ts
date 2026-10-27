/**
 * @store-manager/extensions — public entry point.
 *
 * Exports three groups:
 *
 *   1. `define*` helpers — the extension authoring API. Zero-runtime
 *      identity functions; esbuild inlines them at build time. They
 *      exist for type inference and as AST anchors for the compiler.
 *
 *   2. Extension-facing types — everything an author needs to type
 *      their handlers, declarations, and payload access.
 *
 *   3. `ManifestSchema` — the runtime validator used by both the
 *      compiler (to check its output) and the runner (to check
 *      artifacts at load time).
 */

import type {
    CapabilityDeclaration,
    ExtensionDeclarationInput,
    ExtensionExportedDefault,
    ExtensionNotificationDefinition,
    NotificationDeclarationInput,
    TableDefinition,
} from "./types";

/* ==========================================================================
 * Hook catalog + extension-facing types
 * ========================================================================== */

export {
    HOOK_NAMES,
    type HookName,

    // Hook payload shapes
    type HookPayloads,
    type Instant,
    type FieldChange,

    // Context
    type ExtensionScope,
    type ExtensionUserContext,
    type ExtensionStoreContext,
    type ExtensionContext,
    type ExtensionLogApi,
    type ExtensionDbApi,
    type ExtensionStorageApi,
    type ExtensionNotificationsApi,
    type ExtensionHttpApi,

    // Handlers
    type HookHandler,
    type HookHandlerMap,

    // Declaration types (what authors write)
    type CapabilityDeclaration,
    type ColumnType,
    type TableDefinition,
    type NotificationDeclarationInput,
    type ExtensionDeclarationInput,

    // Runtime types (what the compiler produces)
    type ExtensionNotificationDefinition,
    type ExtensionExportedDefault,
} from "./types";

/* ==========================================================================
 * Manifest schema
 * ========================================================================== */

export { ManifestSchema, type Manifest } from "./manifest";

/* ==========================================================================
 * Authoring helpers
 * ========================================================================== */

/**
 * Wrap an extension declaration.
 *
 * Adds `hooks` (aliased from `on`) to the returned object so the
 * runner's loader sees the runtime shape it expects. The extension
 * author writes `on: { "product.created": ... }` — the idiomatic
 * declaration style. The runner reads `exported.hooks`. This function
 * bridges the two namings without exposing both to the author.
 *
 * The returned object retains `capabilities`, `tables`, and `on`
 * alongside `hooks`. The runner duck-types on `notifications` and
 * `hooks`, ignoring the extras. The extras exist for the compiler,
 * which reads `capabilities` and `tables` directly to build the
 * manifest — dropping them here would break `crossCheckEntry` in
 * `build.ts`.
 */
export const defineExtension = (
    def: ExtensionDeclarationInput,
): ExtensionDeclarationInput & ExtensionExportedDefault => ({
    ...def,
    hooks: def.on,
});

/**
 * Wrap a notification declaration and inject the namespaced
 * presentation keys.
 *
 * The author supplies `{ name, payloadSchema, recipients }`. The
 * extension ID is inlined into the bundle at build time via
 * esbuild's `define: { "process.env.STORE_MANAGER_EXTENSION_ID": ... }`
 * — see `build.ts`. This function reads that env var and derives
 * `presentation.titleKey` / `presentation.bodyKey` from
 * `ext.<extensionId>.<name>.(title|body)`.
 *
 * Runtime contract:
 *   - The env var is set by `store-manager-ext build` before any
 *     source file is imported, and restored in a `finally` block.
 *   - If the var is absent (e.g. the developer runs their extension
 *     outside the build pipeline), the error message explains how
 *     to set it manually.
 */
export const defineNotification = (
    def: NotificationDeclarationInput,
): ExtensionNotificationDefinition => {
    const extensionId = process.env.STORE_MANAGER_EXTENSION_ID;
    if (!extensionId) {
        throw new Error(
            "@store-manager/extensions: defineNotification was called " +
            "without STORE_MANAGER_EXTENSION_ID set. This env var is " +
            "set automatically by `store-manager-ext build`. If you're " +
            "running extension code outside the build pipeline, set " +
            "STORE_MANAGER_EXTENSION_ID=<your-extension-id> in your " +
            "environment before importing the extension.",
        );
    }
    return {
        payloadSchema: def.payloadSchema,
        presentation: {
            titleKey: `ext.${extensionId}.${def.name}.title`,
            bodyKey: `ext.${extensionId}.${def.name}.body`,
        },
        recipients: def.recipients,
    };
};

/**
 * Wrap a capabilities declaration. Returns the input unchanged.
 *
 * All keys are optional; omitted keys default to `false` / `[]` when
 * the compiler normalizes to the manifest.
 */
export const defineCapabilities = (
    def: CapabilityDeclaration,
): CapabilityDeclaration => def;

/**
 * Wrap a table definition. Returns the input unchanged.
 *
 * The table name is derived from the file name (or explicit key in
 * `index.ts`); this helper carries only the column declarations.
 */
export const defineTable = (def: TableDefinition): TableDefinition => def;