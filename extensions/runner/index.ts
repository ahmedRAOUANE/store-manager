import {
    registerExtensionNotification,
    unregisterExtensionNotification,
} from "@/notifications/registry";

import {
    clearDispatcherState,
    emitHook,
    flushHooks,
    setDispatcherState,
} from "./dispatcher";
import { loadAllInstalled } from "./loader";
import { toCoreNotificationDefinition } from "./notification-bridge";
import type { LoadedExtension } from "./types";

let started = false;
let loadedExtensions: LoadedExtension[] = [];

/**
 * Boot the runner. Idempotent — safe to call from `instrumentation.ts`
 * even if a subsequent hot-reload invokes it again. Loads all active
 * installs, registers their notification definitions in the runtime
 * registry, and installs the dispatcher state.
 *
 * Per-install failures are isolated: a broken extension is marked
 * `status = "error"` and skipped, but the app boots.
 */
export async function startRunner(): Promise<void> {
    if (started) {
        console.warn("[extensions] startRunner called twice; ignoring");
        return;
    }

    loadedExtensions = await loadAllInstalled();

    for (const ext of loadedExtensions) {
        for (const { eventName, definition } of ext.notificationDefinitions) {
            try {
                registerExtensionNotification(
                    toCoreNotificationDefinition(
                        ext.extensionId,
                        eventName,
                        definition,
                    ),
                );
            } catch (error) {
                console.error(
                    `[extensions] failed to register notification ` +
                    `"ext.${ext.extensionId}.${eventName}":`,
                    error,
                );
            }
        }
    }

    setDispatcherState(loadedExtensions);
    started = true;

    console.info(
        `[extensions] runner started with ${loadedExtensions.length} extension(s) loaded`,
    );
}

/**
 * Stop the runner. Unregisters all extension notification definitions
 * and clears dispatcher state. Intended for tests; production processes
 * do not shut down gracefully.
 */
export function stopRunner(): void {
    for (const ext of loadedExtensions) {
        for (const { eventName } of ext.notificationDefinitions) {
            try {
                unregisterExtensionNotification(
                    `ext.${ext.extensionId}.${eventName}`,
                );
            } catch {
                // Idempotent; ignore.
            }
        }
    }
    clearDispatcherState();
    loadedExtensions = [];
    started = false;
}

export { emitHook, flushHooks };
export type { HookName } from "./types";