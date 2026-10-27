/**
 * @store-manager/extensions/test — testing harness for extension
 * unit tests.
 *
 * Imported as `@store-manager/extensions/test`. Exposes two
 * primitives:
 *
 *   - `createTestContext(options)` — build a mock `ExtensionContext`
 *     where every API method is a vitest `Mock<Fn>`. Tests assert on
 *     calls with `expect(ctx.extensions.db.insert).toHaveBeenCalledWith(...)`
 *     and configure behavior with `.mockResolvedValue(...)`. See
 *     `context.ts` for capability-guard semantics and default return
 *     values.
 *
 *   - `fireHook(ext, hookName, payload, ctx)` — invoke the handler an
 *     extension has registered for `hookName`. Typed so payload shapes
 *     are checked per-hook. Throws a clear error if the extension
 *     doesn't subscribe to the named hook. Handler-thrown errors
 *     propagate unchanged. See `fire-hook.ts` for details.
 *
 * The two types `CreateTestContextOptions` and `TestContext` are
 * exported for authors who want to annotate their own test helpers or
 * fixtures without inferring the shapes from usage.
 *
 * No custom assertion helpers or vitest matchers are added by this
 * subpath — the design uses vitest's existing `Mock` and matcher API
 * directly. If an assertion pattern would benefit from sugar, it
 * belongs in the extension project's own test utils, not here.
 *
 * This subpath is not imported by `@store-manager/extensions` — a
 * project that doesn't run tests never loads any of this code. The
 * `vitest` peer is marked optional (see `package.json`) so the
 * missing-peer check doesn't fire for production consumers.
 */

export {
    createTestContext,
    type CreateTestContextOptions,
    type TestContext,
} from "./context";

export { fireHook } from "./fire-hook";