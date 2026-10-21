import type { z } from "zod";
import type { Manifest } from "./manifest";

/**
 * The complete set of hooks the runner emits. Extensions can only
 * subscribe to hooks in this list — the manifest validator rejects
 * unknown names, and the dispatcher silently ignores anything else.
 *
 * Adding a hook is a coordinated change: add the name here, add the
 * emission point in the corresponding service or action, and (if the
 * payload shape changes) update the dispatcher's curated snapshot.
 */
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

export type ExtensionScope = "user" | "store" | "admin";

export interface ExtensionAuthor {
    name: string;
    contact?: string;
}

export interface ExtensionUserContext {
    id: string;
    firstName: string | null;
    lastName: string | null;
}

export interface ExtensionStoreContext {
    id: string;
    name: string;
}

export interface ExtensionLogApi {
    info: (msg: string, meta?: unknown) => void;
    warn: (msg: string, meta?: unknown) => void;
    error: (msg: string, meta?: unknown) => void;
}

/**
 * The extension-facing view of its own data store.
 *
 * `tableName` refers to a logical namespace declared in the manifest's
 * `tables` map (e.g. "audit_log"). The runner translates it into rows
 * in `extension_data` filtered by (installId, tableName). No real
 * per-extension tables exist.
 *
 * All `where` clauses are simple equality on JSON fields — the runner
 * translates them into Postgres JSONB containment (`data @> $1`).
 * Complex queries (range, ordering beyond created/updated, joins) are
 * not supported in v1.
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
     * Publish a declared notification. The `eventName` is the short
     * name from the manifest (e.g. "LOG_CHANGED"), NOT the fully
     * qualified `ext.<id>.<EVENT>` string. The runner prepends the
     * extension ID and validates the event is declared.
     */
    publish: (eventName: string, payload: unknown) => Promise<void>;
}

export interface ExtensionHttpApi {
    fetch: typeof fetch;
}

export interface ExtensionContext {
    user: ExtensionUserContext;
    store: ExtensionStoreContext | null;
    extensions: {
        db: ExtensionDbApi;
        storage: ExtensionStorageApi;
    };
    notifications: ExtensionNotificationsApi;
    http: ExtensionHttpApi;
    log: ExtensionLogApi;
}

export type HookHandler = (
    ctx: ExtensionContext,
    payload: unknown,
) => Promise<void> | void;

/**
 * A notification definition declared by an extension.
 *
 * Unlike core definitions, this does NOT carry a `type` field — the
 * runner derives the full type ID (`ext.<extensionId>.<eventName>`)
 * from the manifest and the short event name the extension uses.
 *
 * `recipients` is declarative — extensions cannot pick individual
 * recipient IDs. The runner translates the declaration into the core
 * `resolveRecipients` closure when building the core-shaped definition.
 */
export interface ExtensionNotificationDefinition {
    payloadSchema: z.ZodTypeAny;
    presentation: {
        titleKey: string;
        bodyKey: string;
    };
    recipients: {
        scope: "store" | "user";
        roles?: readonly ("OWNER" | "MANAGER" | "STAFF")[];
        /**
         * When true, the user who triggered the hook is excluded from
         * recipients even if their role matches. Useful for self-action
         * audit logs that shouldn't ping the actor.
         */
        excludeActor?: boolean;
    };
}

/**
 * The shape an extension's `index.js` must export as `default`.
 * Validated by the loader before the extension is considered loaded.
 */
export interface ExtensionExportedDefault {
    notifications: Record<string, ExtensionNotificationDefinition>;
    hooks: Partial<Record<HookName, HookHandler>>;
}

/**
 * The runner's in-memory representation of an active install.
 */
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