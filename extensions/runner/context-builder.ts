import { publishNotificationInTransaction } from "@/notifications/publish";
import type { TransactionClient } from "@/prisma/db";

import { assertCapability } from "./capability";
import {
    createExtensionDbApi,
    createExtensionStorageApi,
} from "./extension-data";
import { toCoreNotificationDefinition } from "./notification-bridge";
import type {
    ExtensionContext,
    ExtensionLogApi,
    ExtensionStoreContext,
    LoadedExtension,
} from "./types";

/**
 * Build the `ctx` object handed to an extension's hook handler.
 *
 * All operations share the `tx` passed in by the dispatcher, so the
 * entire handler invocation is one atomic unit. If the handler throws,
 * every write (extension data, storage, notifications) rolls back
 * together.
 *
 * Capability enforcement happens inline: every method in the returned
 * object calls `assertCapability` first. An extension cannot call an API
 * it didn't declare — `ExtensionCapabilityError` throws before the
 * underlying operation runs.
 */
export async function buildContext(
    ext: LoadedExtension,
    tx: TransactionClient,
    triggeringScope: { userId: string; storeId?: string },
): Promise<ExtensionContext> {
    // ── Fetch user (required) ──────────────────────────────────────
    const userRow = await tx.orm.public.User
        .where({ id: triggeringScope.userId })
        .first();
    if (!userRow) {
        throw new Error(
            `Triggering user ${triggeringScope.userId} not found`,
        );
    }

    // ── Fetch store if this is a store-scope install ───────────────
    let store: ExtensionStoreContext | null = null;
    if (ext.scope === "store") {
        if (!triggeringScope.storeId) {
            throw new Error(
                `Store-scope extension "${ext.extensionId}" fired without storeId`,
            );
        }
        const storeRow = await tx.orm.public.Store
            .where({ id: triggeringScope.storeId })
            .first();
        if (!storeRow) {
            throw new Error(
                `Store ${triggeringScope.storeId} not found`,
            );
        }
        store = { id: storeRow.id, name: storeRow.name };
    }

    // ── Helper for notifications ───────────────────────────────────
    const publish = async (
        eventName: string,
        payload: unknown,
    ): Promise<void> => {
        assertCapability(
            ext.extensionId,
            ext.capabilities,
            "notifications.publish",
        );

        const declared = ext.notificationDefinitions.find(
            (d) => d.eventName === eventName,
        );
        if (!declared) {
            throw new Error(
                `Extension "${ext.extensionId}" attempted to publish undeclared notification "${eventName}"`,
            );
        }

        await publishNotificationInTransaction(
            tx,
            toCoreNotificationDefinition(
                ext.extensionId,
                eventName,
                declared.definition,
            ),
            payload,
            {
                storeId: store?.id ?? null,
                actorId: triggeringScope.userId,
            },
        );
    };

    // ── HTTP wrapper with domain allowlist ─────────────────────────
    const wrappedFetch: typeof fetch = ((input, init) => {
        assertCapability(
            ext.extensionId,
            ext.capabilities,
            "http.fetch",
        );

        const url =
            typeof input === "string"
                ? input
                : input instanceof URL
                    ? input.href
                    : input.url;
        const hostname = new URL(url).hostname;

        const allowed = ext.manifest.capabilities["http.fetch"];
        const permitted =
            allowed.includes("*") ||
            allowed.some(
                (d) =>
                    hostname === d || hostname.endsWith(`.${d}`),
            );
        if (!permitted) {
            throw new Error(
                `Extension "${ext.extensionId}" attempted to fetch disallowed domain "${hostname}"`,
            );
        }

        return fetch(input, init);
    }) as typeof fetch;

    // ── Log API ────────────────────────────────────────────────────
    const log: ExtensionLogApi = {
        info: (msg, meta) => {
            assertCapability(
                ext.extensionId,
                ext.capabilities,
                "logs.write",
            );
            console.info(`[ext:${ext.extensionId}]`, msg, meta ?? "");
        },
        warn: (msg, meta) => {
            assertCapability(
                ext.extensionId,
                ext.capabilities,
                "logs.write",
            );
            console.warn(`[ext:${ext.extensionId}]`, msg, meta ?? "");
        },
        error: (msg, meta) => {
            assertCapability(
                ext.extensionId,
                ext.capabilities,
                "logs.write",
            );
            console.error(`[ext:${ext.extensionId}]`, msg, meta ?? "");
        },
    };

    return {
        user: {
            id: userRow.id,
            firstName: userRow.firstName,
            lastName: userRow.lastName,
        },
        store,
        extensions: {
            db: createExtensionDbApi({
                tx,
                installId: ext.installId,
                extensionId: ext.extensionId,
                manifest: ext.manifest,
                capabilities: ext.capabilities,
                quotaMaxRows: ext.quotaMaxRows,
                quotaMaxBytes: ext.quotaMaxBytes,
            }),
            storage: createExtensionStorageApi({
                tx,
                installId: ext.installId,
                extensionId: ext.extensionId,
                capabilities: ext.capabilities,
            }),
        },
        notifications: { publish },
        http: { fetch: wrappedFetch },
        log,
    };
}