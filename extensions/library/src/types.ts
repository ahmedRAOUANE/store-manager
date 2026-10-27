import type { z } from "zod";

/* ==========================================================================
 * HOOK CATALOG
 *
 * The runner emits these events; extensions subscribe to them. Adding a
 * hook is a coordinated change: add the name here, add the payload shape
 * below, add the emission point in the corresponding service or action.
 * ========================================================================== */

export const HOOK_NAMES = [
    "product.created",
    "product.updated",
    "product.deleted",
    "product.stock.changed",
    "sale.created",
    "purchase.created",
    "store.activated",
    "store.suspended",
    "membership.requested",
    "membership.accepted",
] as const;

export type HookName = typeof HOOK_NAMES[number];

/* ==========================================================================
 * SHARED VALUE SHAPES
 * ========================================================================== */

/**
 * A structural instant. Real `Temporal.Instant` instances satisfy this
 * automatically, so `payload.createdAt.epochMilliseconds` works without
 * extensions importing Temporal. Extensions that need full Temporal
 * (arithmetic, timezones) cast or narrow.
 */
export interface Instant {
    readonly epochMilliseconds: number;
    toString(): string;
}

/**
 * A single field change captured in a `product.updated` payload.
 *
 * `previous` and `next` are `unknown` because the shape varies by field
 * — `sellingPrice` is a number, `name` is a string, `description` is
 * `string | null`. Extensions that need the value should narrow with a
 * typeof or schema check.
 */
export interface FieldChange {
    readonly previous: unknown;
    readonly next: unknown;
}

/* ==========================================================================
 * HOOK PAYLOADS
 *
 * The shape of `payload` inside a handler. The runner emits exactly these
 * shapes; the compiler does not transform them. If a payload shape here
 * drifts from what the runner actually emits, that's a bug in this file
 * or the emission site.
 *
 * `product.deleted` and `product.stock.changed` are typed for future use
 * — no emission site exists yet.
 * ========================================================================== */

export type HookPayloads = {
    "product.created": {
        readonly id: string;
        readonly name: string;
        readonly sku: string;
        readonly stockQuantity: number;
        readonly minimumStock: number;
        readonly sellingPrice: number;
        readonly isActive: boolean;
        readonly createdAt: Instant;
    };

    "product.updated": {
        readonly id: string;
        readonly name: string;
        readonly sku: string;
        readonly stockQuantity: number;
        readonly minimumStock: number;
        readonly sellingPrice: number;
        readonly isActive: boolean;
        readonly createdAt: Instant;
        readonly changes: Readonly<Record<string, FieldChange>>;
    };

    "product.deleted": {
        readonly id: string;
        readonly name: string;
        readonly sku: string;
    };

    "product.stock.changed": {
        readonly id: string;
        readonly name: string;
        readonly previousStock: number;
        readonly newStock: number;
        readonly minimumStock: number;
        readonly cause: "sale" | "purchase" | "manual" | "adjustment";
    };

    "sale.created": {
        readonly id: string;
        readonly invoiceNumber: string;
        readonly items: ReadonlyArray<{
            readonly productId: string;
            readonly name: string;
            readonly quantity: number;
            readonly unitPrice: number;
            readonly totalAmount: number;
        }>;
        readonly totalAmount: number;
        readonly amountPaid: number;
        readonly createdAt: Instant;
        readonly createdById: string;
    };

    "purchase.created": {
        readonly id: string;
        readonly invoiceNumber: string;
        readonly items: ReadonlyArray<{
            readonly productId: string;
            readonly name: string;
            readonly quantity: number;
            readonly unitCost: number;
            readonly totalAmount: number;
        }>;
        readonly totalAmount: number;
        readonly supplierId: string;
        readonly createdAt: Instant;
    };

    "store.activated": {
        readonly id: string;
        readonly name: string;
        readonly status: "ACTIVE";
        readonly activatedAt: Instant;
    };

    "store.suspended": {
        readonly id: string;
        readonly name: string;
        readonly status: "SUSPENDED";
        readonly suspendedAt: Instant;
    };

    "membership.requested": {
        readonly id: string;
        readonly storeId: string;
        readonly userId: string;
        readonly role: "OWNER" | "MANAGER" | "STAFF";
        readonly requestedAt: Instant;
    };

    "membership.accepted": {
        readonly id: string;
        readonly storeId: string;
        readonly userId: string;
        readonly role: "OWNER" | "MANAGER" | "STAFF";
        readonly acceptedAt: Instant;
    };
};

/* ==========================================================================
 * SCOPE
 * ========================================================================== */

export type ExtensionScope = "user" | "store" | "admin";

/* ==========================================================================
 * CONTEXT
 *
 * What the extension receives when its handler runs. The runner builds
 * one of these per invocation. Extensions read from it but never
 * construct it.
 * ========================================================================== */

export interface ExtensionUserContext {
    readonly id: string;
    readonly firstName: string | null;
    readonly lastName: string | null;
}

export interface ExtensionStoreContext {
    readonly id: string;
    readonly name: string;
}

export interface ExtensionLogApi {
    info: (msg: string, meta?: unknown) => void;
    warn: (msg: string, meta?: unknown) => void;
    error: (msg: string, meta?: unknown) => void;
}

/**
 * The extension-facing view of its own data store. Table names must
 * match a key in the manifest's `tables` map — the runner rejects
 * undeclared names at runtime, but the type signature is widened
 * `string` for now (see D4.3). All `where` clauses are simple equality
 * on JSON fields; complex queries are not supported in v1.
 */
export interface ExtensionDbApi {
    insert: (
        tableName: string,
        row: Record<string, unknown>,
    ) => Promise<void>;
    update: (
        tableName: string,
        where: Record<string, unknown>,
        updates: Record<string, unknown>,
    ) => Promise<number>;
    delete: (
        tableName: string,
        where: Record<string, unknown>,
    ) => Promise<number>;
    find: (
        tableName: string,
        where: Record<string, unknown>,
    ) => Promise<Record<string, unknown>[]>;
}

export interface ExtensionStorageApi {
    get: <T = unknown>(key: string) => Promise<T | null>;
    set: (key: string, value: unknown) => Promise<void>;
    delete: (key: string) => Promise<void>;
}

export interface ExtensionNotificationsApi {
    /**
     * Publish a declared notification. `eventName` is the short name
     * from the manifest (e.g. `"LOG_CHANGED"`), not the fully-qualified
     * type — the runner derives `ext.<id>.<eventName>` internally.
     */
    publish: (eventName: string, payload: unknown) => Promise<void>;
}

export interface ExtensionHttpApi {
    fetch: typeof fetch;
}

export interface ExtensionContext {
    readonly user: ExtensionUserContext;
    readonly store: ExtensionStoreContext | null;
    readonly extensions: {
        readonly db: ExtensionDbApi;
        readonly storage: ExtensionStorageApi;
    };
    readonly notifications: ExtensionNotificationsApi;
    readonly http: ExtensionHttpApi;
    readonly log: ExtensionLogApi;
}

/* ==========================================================================
 * HANDLERS
 * ========================================================================== */

export type HookHandler<H extends HookName = HookName> = (
    ctx: ExtensionContext,
    payload: HookPayloads[H],
) => Promise<void> | void;

export type HookHandlerMap = {
    readonly [H in HookName]?: HookHandler<H>;
};

/* ==========================================================================
 * DECLARATION TYPES (what developers write)
 * ========================================================================== */

/**
 * Capabilities declared by the extension. Every key is optional at the
 * declaration site — missing keys default to `false` / `[]` when the
 * compiler normalizes to the manifest. Presence in the object is a
 * positive assertion; absence is the default.
 */
export type CapabilityDeclaration = {
    "db.read"?: boolean;
    "db.write"?: boolean;
    "storage.read"?: boolean;
    "storage.write"?: boolean;
    "notifications.publish"?: string[];
    "http.fetch"?: string[];
    "logs.write"?: boolean;
};

export type ColumnType =
    | "uuid"
    | "text"
    | "timestamptz"
    | "int"
    | "float8"
    | "bool";

export interface TableDefinition {
    readonly columns: Readonly<Record<string, ColumnType>>;
}

/**
 * Input to `defineNotification`.
 *
 * Note: NO `presentation` field. The compiler derives `titleKey` and
 * `bodyKey` from `<packageJson.name>.<name>` at build time. Extension
 * authors never write translation keys — they write translation entries
 * in `src/translations/<locale>.json` and the compiler wires the rest.
 *
 * `name` duplicates the map key in `notifications: { NAME: ... }`, but
 * it makes the AST pass (B3) simpler: it can read the notification name
 * directly from the `defineNotification({ name, ... })` call site
 * instead of tracing the call result to its map use site. The compiler
 * cross-checks `name` against the map key and errors on mismatch.
 */
export interface NotificationDeclarationInput {
    readonly name: string;
    readonly payloadSchema: z.ZodTypeAny;
    readonly recipients: {
        readonly scope: "store" | "user";
        readonly roles?: readonly ("OWNER" | "MANAGER" | "STAFF")[];
        readonly excludeActor?: boolean;
    };
}

/**
 * Input to `defineExtension`. The compiler transforms this into the
 * runtime shape (`ExtensionExportedDefault`) plus the manifest.
 */
export interface ExtensionDeclarationInput {
    readonly capabilities: CapabilityDeclaration;
    readonly tables: Readonly<Record<string, TableDefinition>>;
    readonly notifications: Readonly<
        Record<string, ExtensionNotificationDefinition>
    >;
    readonly on: HookHandlerMap;
}

/* ==========================================================================
 * RUNTIME TYPES (what the runner sees after compile)
 * ========================================================================== */

/**
 * The runtime shape of a notification. Same as `NotificationDeclarationInput`
 * but with `presentation` — injected by the compiler from the notification
 * name and the extension ID.
 */
export interface ExtensionNotificationDefinition {
    readonly payloadSchema: z.ZodTypeAny;
    readonly presentation: {
        readonly titleKey: string;
        readonly bodyKey: string;
    };
    readonly recipients: {
        readonly scope: "store" | "user";
        readonly roles?: readonly ("OWNER" | "MANAGER" | "STAFF")[];
        readonly excludeActor?: boolean;
    };
}

/**
 * The shape an extension's compiled `index.js` must export as `default`.
 * Produced by the compiler from an `ExtensionDeclarationInput`; validated
 * by the runner's loader before the extension is loaded.
 *
 * Differs from `ExtensionDeclarationInput` in three ways:
 *   1. `notifications` maps names to `ExtensionNotificationDefinition`
 *      (with `presentation`), not `NotificationDeclarationInput`.
 *   2. `hooks` (not `on`) is the runtime handler map.
 *   3. `capabilities`, `tables` are not present — they live in the
 *      manifest, which the runner loads separately.
 */
export interface ExtensionExportedDefault {
    readonly notifications: Readonly<
        Record<string, ExtensionNotificationDefinition>
    >;
    readonly hooks: HookHandlerMap;
}