import type {
    ExtensionContext,
    HookHandlerMap,
    HookName,
    HookPayloads,
} from "../types";

/**
 * Invoke the handler an extension has registered for `hookName`.
 *
 * This is the testing equivalent of the runner's dispatch: the runner
 * looks up `ext.hooks[hookName]`, builds a context, and awaits the
 * handler's result. `fireHook` does the same, but with a mock context
 * you control and no timeout, isolation, or transaction wrapping.
 *
 * The payload parameter is typed to the specific hook's payload shape,
 * so test code gets the same autocomplete and type-checking that
 * production handlers get. A `fireHook(ext, "product.updated", ...)`
 * call rejects a payload shaped like `product.created` at compile time.
 *
 * ### Scope
 *
 * `fireHook` invokes exactly one handler and returns when it settles.
 * It does not:
 *
 *   - Run other handlers the extension subscribes to.
 *   - Simulate the runner's 5-second timeout.
 *   - Open a transaction (mock `ctx.extensions.db.*` calls are recorded,
 *     not persisted).
 *   - Enforce capability checks beyond what the mock context's defaults
 *     already do — see `createTestContext` for that behavior.
 *
 * For integration-level tests that need the real runner, use the actual
 * `emitHook` + `flushHooks` (Phase A). This helper is for unit tests.
 *
 * ### Example
 *
 * ```typescript
 * import { createTestContext, fireHook } from "@store-manager/extensions/test";
 * import ext from "../src/index";
 *
 * const ctx = createTestContext({
 *     user: { id: "u1", firstName: "Alice", lastName: "Smith" },
 *     store: { id: "s1", name: "Test Store" },
 *     capabilities: ["db.write", "notifications.publish"],
 * });
 *
 * await fireHook(
 *     ext,
 *     "product.updated",
 *     {
 *         id: "p1",
 *         name: "Widget",
 *         sku: "SKU-1",
 *         stockQuantity: 10,
 *         minimumStock: 5,
 *         sellingPrice: 15,
 *         isActive: true,
 *         createdAt: { epochMilliseconds: Date.now(), toString: () => "" },
 *         changes: {
 *             sellingPrice: { previous: 10, next: 15 },
 *         },
 *     },
 *     ctx,
 * );
 *
 * expect(ctx.notifications.publish).toHaveBeenCalledWith(
 *     "LOG_CHANGED",
 *     { productName: "Widget", field: "sellingPrice" },
 * );
 * ```
 *
 * ### Errors
 *
 * Throws if the extension doesn't subscribe to `hookName`. The error
 * names the missing hook and the subscribed set:
 *
 * ```
 * Extension does not subscribe to hook "product.created".
 * Subscribed hooks: [product.updated]
 * ```
 *
 * Handler-thrown errors propagate unchanged — `fireHook` doesn't catch
 * or wrap them. If the handler rejects, the promise returned by
 * `fireHook` rejects with the same error. This matches the runner's
 * behavior, where handler errors are logged but the *test author* here
 * may want to see them (e.g., a test for "this handler throws when X").
 */
export async function fireHook<H extends HookName>(
    ext: { hooks: HookHandlerMap },
    hookName: H,
    payload: HookPayloads[H],
    ctx: ExtensionContext,
): Promise<void> {
    if (!Object.prototype.hasOwnProperty.call(ext.hooks, hookName)) {
        const subscribed = Object.keys(ext.hooks).sort();
        throw new Error(
            `Extension does not subscribe to hook "${hookName}". ` +
            `Subscribed hooks: [${subscribed.join(", ")}]`,
        );
    }

    const handler = ext.hooks[hookName];
    if (!handler) {
        // Defensive: `hasOwnProperty` returned true but the value is
        // undefined/falsy. Possible when `ext.hooks` came from
        // `JSON.parse` (an `any` typed import, bypassing TS) or when
        // the value was explicitly set to `undefined`. In well-typed
        // code paths this branch is unreachable.
        throw new Error(
            `Hook "${hookName}" is present in the extension's hooks map but is not a function.`,
        );
    }

    await handler(ctx, payload);
}