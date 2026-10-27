import { vi, type Mock } from "vitest";

import type {
    CapabilityDeclaration,
    ExtensionContext,
    // ExtensionDbApi,
    // ExtensionHttpApi,
    // ExtensionLogApi,
    // ExtensionNotificationsApi,
    // ExtensionStorageApi,
    ExtensionStoreContext,
    ExtensionUserContext,
} from "../types";

/**
 * Testing utilities for extension unit tests.
 *
 * `createTestContext` returns a `TestContext` — structurally an
 * `ExtensionContext` (so it can be passed to any handler), but with
 * every API method exposed as a `Mock<Fn>` (so tests can assert on
 * calls with vitest's standard `expect(...).toHaveBeenCalledWith(...)`
 * matchers).
 *
 * The design uses vitest's existing mock machinery rather than
 * hand-rolled assertion helpers. This means:
 *
 *   - No custom helper functions to learn or maintain.
 *   - Full access to `.mock.calls`, `.mockClear()`, `.mockResolvedValue()`,
 *     and every other `vi.fn()` capability.
 *   - Familiar to anyone who has used vitest (or jest, whose API is
 *     nearly identical for this use case).
 *
 * Capability enforcement in the mock mirrors the runner's runtime
 * behavior (B5-D3): calling `ctx.extensions.db.insert(...)` without
 * `db.write` in the granted capabilities throws. This catches the
 * class of bug where an extension's `capabilities.ts` is missing a
 * declaration its source actually uses — although B3's AST pass
 * catches the same case earlier for most extensions, so this is
 * defense-in-depth for the paths B3 can't see (aliased contexts,
 * cross-function capability calls).
 *
 * **Overrides bypass the guard.** If a test calls
 * `ctx.http.fetch.mockResolvedValue(response)`, that replaces the
 * mock's default implementation — which includes the capability
 * guard. The author is opting out. Documented, intentional, and
 * consistent with how `vi.fn()` overrides work everywhere.
 */

type CapabilityKey = keyof CapabilityDeclaration;

const ALL_CAPABILITIES: readonly CapabilityKey[] = [
    "db.read",
    "db.write",
    "storage.read",
    "storage.write",
    "notifications.publish",
    "http.fetch",
    "logs.write",
];

export interface CreateTestContextOptions {
    /** The user whose actions triggered the hook. */
    user: ExtensionUserContext;
    /** The store context — required for store-scope extensions. */
    store?: ExtensionStoreContext | null;
    /**
     * Capabilities to grant. Pass `"all"` to grant every capability
     * (useful for tests that exercise an extension broadly without
     * replicating its exact `capabilities.ts` declaration).
     *
     * Defaults to `[]` — no capabilities granted. Authors declare
     * exactly what their test exercises, mirroring the runner's
     * runtime enforcement.
     */
    capabilities?: readonly CapabilityKey[] | "all";
}

/**
 * The mock `ctx` returned by `createTestContext`.
 *
 * Structurally compatible with `ExtensionContext` — assignable wherever
 * the runner's context type is expected — but every API method is
 * exposed as a vitest `Mock<Fn>` for assertion and override access.
 */
export interface TestContext {
    user: ExtensionUserContext;
    store: ExtensionStoreContext | null;
    extensions: {
        db: {
            insert: Mock<
                (tableName: string, row: Record<string, unknown>) => Promise<void>
            >;
            find: Mock<
                (
                    tableName: string,
                    where: Record<string, unknown>,
                ) => Promise<Record<string, unknown>[]>
            >;
            update: Mock<
                (
                    tableName: string,
                    where: Record<string, unknown>,
                    updates: Record<string, unknown>,
                ) => Promise<number>
            >;
            delete: Mock<
                (tableName: string, where: Record<string, unknown>) => Promise<number>
            >;
        };
        storage: {
            get: Mock<(key: string) => Promise<unknown>>;
            set: Mock<(key: string, value: unknown) => Promise<void>>;
            delete: Mock<(key: string) => Promise<void>>;
        };
    };
    notifications: {
        publish: Mock<(eventName: string, payload: unknown) => Promise<void>>;
    };
    http: {
        fetch: Mock<typeof fetch>;
    };
    log: {
        info: Mock<(msg: string, meta?: unknown) => void>;
        warn: Mock<(msg: string, meta?: unknown) => void>;
        error: Mock<(msg: string, meta?: unknown) => void>;
    };
}

/**
 * Build a mock `ExtensionContext` for unit-testing extension handlers.
 *
 * Every API method is a `vi.fn()` with a default implementation that
 * runs the capability guard. The defaults return:
 *
 *   - `db.find` → `[]`
 *   - `db.update` → `0`
 *   - `db.delete` → `0`
 *   - `db.insert` → void
 *   - `storage.get` → `null`
 *   - `storage.set` / `storage.delete` → void
 *   - `notifications.publish` → void
 *   - `log.*` → void
 *   - `http.fetch` → throws (must be configured via
 *     `.mockResolvedValue(...)` before invoking)
 *
 * Tests that expect specific return values call `.mockResolvedValue(...)`
 * or `.mockReturnValue(...)` on the corresponding mock — standard
 * vitest usage.
 */
export function createTestContext(
    options: CreateTestContextOptions,
): TestContext {
    const granted = new Set<CapabilityKey>(
        options.capabilities === "all"
            ? ALL_CAPABILITIES
            : (options.capabilities ?? []),
    );

    const guard = (required: CapabilityKey): void => {
        if (granted.has(required)) return;
        const err = new Error(
            `Extension capability "${required}" was used but is not granted in this test context. ` +
            `Add it to createTestContext({ capabilities: [...] }) or pass "all".`,
        );
        err.name = "ExtensionCapabilityError";
        throw err;
    };

    return {
        user: options.user,
        store: options.store ?? null,
        extensions: {
            db: {
                insert: vi.fn<
                    (
                        tableName: string,
                        row: Record<string, unknown>,
                    ) => Promise<void>
                >(async () => {
                    guard("db.write");
                }),
                find: vi.fn<
                    (
                        tableName: string,
                        where: Record<string, unknown>,
                    ) => Promise<Record<string, unknown>[]>
                >(async () => {
                    guard("db.read");
                    return [];
                }),
                update: vi.fn<
                    (
                        tableName: string,
                        where: Record<string, unknown>,
                        updates: Record<string, unknown>,
                    ) => Promise<number>
                >(async () => {
                    guard("db.write");
                    return 0;
                }),
                delete: vi.fn<
                    (
                        tableName: string,
                        where: Record<string, unknown>,
                    ) => Promise<number>
                >(async () => {
                    guard("db.write");
                    return 0;
                }),
            },
            storage: {
                get: vi.fn<(key: string) => Promise<unknown>>(async () => {
                    guard("storage.read");
                    return null;
                }),
                set: vi.fn<(key: string, value: unknown) => Promise<void>>(
                    async () => {
                        guard("storage.write");
                    },
                ),
                delete: vi.fn<(key: string) => Promise<void>>(async () => {
                    guard("storage.write");
                }),
            },
        },
        notifications: {
            publish: vi.fn<
                (eventName: string, payload: unknown) => Promise<void>
            >(async () => {
                guard("notifications.publish");
            }),
        },
        http: {
            fetch: vi.fn<typeof fetch>(async () => {
                guard("http.fetch");
                throw new Error(
                    "ctx.http.fetch was called without a configured response. " +
                    "Use `ctx.http.fetch.mockResolvedValue(...)` (or `mockResolvedValueOnce`) " +
                    "before invoking the hook.",
                );
            }),
        },
        log: {
            info: vi.fn<(msg: string, meta?: unknown) => void>(() => {
                guard("logs.write");
            }),
            warn: vi.fn<(msg: string, meta?: unknown) => void>(() => {
                guard("logs.write");
            }),
            error: vi.fn<(msg: string, meta?: unknown) => void>(() => {
                guard("logs.write");
            }),
        },
    };
}

/**
 * Compile-time assertion that `TestContext` is assignable to
 * `ExtensionContext`. If this fails, `fireHook` and any code that
 * accepts `ExtensionContext` will reject a `TestContext` — the whole
 * testing harness is unusable. The assertion is a type-only export,
 * erased at runtime; it exists purely as a compile-time guarantee.
 *
 * If future changes to `ExtensionContext` or `TestContext` break this,
 * the error surfaces at typecheck, not at the point of use.
 */
export type _TestContextIsExtensionContext = TestContext extends ExtensionContext
    ? true
    : never;

/**
 * Compile-time assertion that every mock field is a real `Mock`.
 * Ensures the `TestContext` type hasn't accidentally been relaxed to
 * plain function types (which would break `.toHaveBeenCalledWith` at
 * call sites without an obvious cause).
 */
export type _DbApiHasMocks = TestContext["extensions"]["db"]["insert"] extends Mock<
    (...args: never[]) => unknown
>
    ? true
    : never;