import { db } from "@/prisma/db";

import { buildContext } from "./context-builder";
import type {
    ExtensionScope,
    HookHandler,
    HookName,
    LoadedExtension,
} from "./types";

const TIMEOUT_MS = 5_000;

interface HookRegistration {
    installId: string;
    extensionId: string;
    scope: ExtensionScope;
    scopeId: string;
    handler: HookHandler;
}

interface DispatcherState {
    byHook: Map<HookName, HookRegistration[]>;
    extensionsById: Map<string, LoadedExtension>;
}

let state: DispatcherState = {
    byHook: new Map(),
    extensionsById: new Map(),
};

const pending = new Set<Promise<void>>();

/**
 * Install the runner's dispatcher state. Called by `startRunner` after
 * `loadAllInstalled` returns; cleared by `stopRunner`.
 */
export function setDispatcherState(loaded: LoadedExtension[]): void {
    const byHook = new Map<HookName, HookRegistration[]>();
    const extensionsById = new Map<string, LoadedExtension>();

    for (const ext of loaded) {
        extensionsById.set(ext.installId, ext);
        for (const [hookName, handler] of ext.handlers) {
            const list = byHook.get(hookName) ?? [];
            list.push({
                installId: ext.installId,
                extensionId: ext.extensionId,
                scope: ext.scope,
                scopeId: ext.scopeId,
                handler,
            });
            byHook.set(hookName, list);
        }
    }

    state = { byHook, extensionsById };
}

export function clearDispatcherState(): void {
    state = {
        byHook: new Map(),
        extensionsById: new Map(),
    };
}

/**
 * Is a given install registration eligible to receive an event from the
 * given triggering scope?
 *
 *   - `user`  — fires only for actions performed by the installing user
 *   - `admin` — same rule as `user` (per-admin install; deferred shared
 *               semantics would be a separate scope)
 *   - `store` — fires for events in the installing store, from any user
 */
export function scopeMatches(
    registration: Pick<HookRegistration, "scope" | "scopeId">,
    triggeringScope: { userId: string; storeId?: string },
): boolean {
    switch (registration.scope) {
        case "user":
        case "admin":
            return registration.scopeId === triggeringScope.userId;
        case "store":
            return (
                triggeringScope.storeId !== undefined &&
                registration.scopeId === triggeringScope.storeId
            );
    }
}

/**
 * Emit a hook. Synchronous by design — callers do not await. Handlers
 * execute in background, isolated from one another and from the caller.
 */
export function emitHook(
    hookName: HookName,
    payload: unknown,
    triggeringScope: { userId: string; storeId?: string },
): void {
    const registrations = state.byHook.get(hookName);
    if (!registrations || registrations.length === 0) {
        return;
    }

    for (const registration of registrations) {
        if (!scopeMatches(registration, triggeringScope)) continue;
        trackPending(
            invokeSafely(registration, hookName, payload, triggeringScope),
        );
    }
}

/**
 * Wait for all in-flight hook invocations. Intended for tests, which
 * need deterministic verification after `emitHook`. Never called from
 * production code paths.
 *
 * Loops until the pending set is empty — a handler that emits a hook
 * during its own run is handled correctly (the newly-tracked promise
 * is awaited in the next iteration).
 */
export async function flushHooks(): Promise<void> {
    while (pending.size > 0) {
        await Promise.allSettled([...pending]);
    }
}

// ──────────────────────────────────────────────────────────────────────
// Internals
// ──────────────────────────────────────────────────────────────────────

function trackPending(promise: Promise<void>): void {
    pending.add(promise);
    void promise.finally(() => {
        pending.delete(promise);
    });
}

async function invokeSafely(
    registration: HookRegistration,
    hookName: HookName,
    payload: unknown,
    triggeringScope: { userId: string; storeId?: string },
): Promise<void> {
    const loaded = state.extensionsById.get(registration.installId);
    if (!loaded) return;

    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
        await Promise.race([
            db.transaction(async (tx) => {
                const ctx = await buildContext(
                    loaded,
                    tx,
                    triggeringScope,
                );
                await Promise.resolve(
                    registration.handler(ctx, payload),
                );
            }),
            new Promise<never>((_, reject) => {
                timer = setTimeout(
                    () =>
                        reject(
                            new Error(
                                `Extension "${registration.extensionId}" ` +
                                `hook "${hookName}" timed out after ${TIMEOUT_MS}ms`,
                            ),
                        ),
                    TIMEOUT_MS,
                );
            }),
        ]);
    } catch (error) {
        console.error(
            `[extensions] hook error in "${registration.extensionId}" ` +
            `for "${hookName}":`,
            error,
        );
        // Swallowed by design — the triggering business operation is
        // unaffected. Failures are logged for operational visibility.
    } finally {
        if (timer) clearTimeout(timer);
    }
}