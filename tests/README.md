# Tests — conventions and gotchas

Three folders, three purposes. Pick by **what system the test exercises**, not by when it was written.

## Where does my test go?

| Folder | What it tests | Example |
|---|---|---|
| `domains/` | Business logic — services, notifications, calculations, access predicates | `products.test.ts`, `membership.test.ts`, `notifications.test.ts` |
| `extensions/runner/` | The extension runtime — loader, dispatcher, context builder, data isolation, install CLI | `data.test.ts`, `e2e.test.ts`, `install.test.ts` |
| `extensions/cli/` | The extension compiler — init, build, AST analysis, test harness | `init.test.ts`, `build.test.ts`, `ast-detect.test.ts` |

**If a test covers multiple folders**, put it where its primary subject lives. E2E tests that touch the whole extension pipeline live in `extensions/runner/` because they validate runtime behavior even when the artifact was built by the CLI.

**One test file per subject.** `products.test.ts` tests `product.services.ts`; if a test for `compute-product-changes.ts` appears, it goes in `products.test.ts` or a new `compute-product-changes.test.ts` in the same folder. Do not create `products-utils.test.ts`.

---

## Two projects — `unit` and `integration`

Defined in `vitest.config.ts`. `pnpm test:run` runs both.

| Project | Runs | Timeout | Parallelism |
|---|---|---|---|
| `unit` | All test files except the three listed below | 30s per test, 30s per hook | Full parallel |
| `integration` | `build.test.ts`, `build-integration.test.ts`, `sdk-fixture.test.ts` | 60s per test, 60s per hook | Sequential, one file at a time |

**Why the split?** The three `integration` files spawn `pnpm exec store-manager-ext build` subprocesses per test. Under parallel execution, they used to time out on busy machines. Sequential execution removes the class of failure entirely.

**When adding a test that spawns subprocesses**, add it to `INTEGRATION_FILES` in `vitest.config.ts`. **When a test stops spawning subprocesses** (e.g., the CLI gains an in-process entry point), remove it from `INTEGRATION_FILES`.

Shortcuts:
```
pnpm test:unit # fast local loop, 23s
pnpm test:integration # slow, deterministic, 50s
pnpm test:run # both, ~80-90s
```

---

## Four gotchas discovered during the migration

### 1. `type/**/*.d.ts` must be in the test tsconfig

`type/temporal.d.ts` declares the `Temporal` global. `tsconfig.test.json` inherits `compilerOptions` from `tsconfig.json` via `extends`, but **not `include`**. Without explicitly including `type/**/*.d.ts` in the test config, any test that imports a file using `Temporal` (`zod/*.schema.ts`, `services/*.services.ts`) fails with `Cannot find name 'Temporal'`.

`tsconfig.test.json` already handles this:
```json
"include": ["tests/**/*.ts", "type/**/*.d.ts", "next-env.d.ts"]
```

**If you add a new ambient global type declaration** (not just `Temporal`), put it under type/ — it's picked up automatically.

### 2. hookTimeout is not a describe option in Vitest 5
Vitest 5 removed `hookTimeout` from `describe/suite` options. `beforeAll(fn, timeout)` and `beforeEach(fn, timeout)` still work, as do `test({ timeout })` and `describe({ timeout })`.

If a beforeAll needs more than the suite's timeout, use:
```typescript
beforeAll(async () => { /* ... */ }, 60_000);
```
Not
```typescript
describe("...", { hookTimeout: 60_000 }, () => { /* ... */ });  // type error in Vitest 5
```

### 3. updateProductService returns AppError on null-update
Prisma's `.update()` returns `Model | null` when zero rows match. `updateProductService` guards against null by returning `AppError` — same shape as its existing "product not found" error. This makes the return type `Model | AppError | ValidationError`, so `result instanceof AppError` correctly narrows to `Model`.

Any test asserting on a service's return value should use `if (result instanceof AppError) throw result;` — same pattern across all services.

### 4. `TestContext` handlers should accept `ExtensionContext`
`HookHandler<H>` expects `(ctx: ExtensionContext, payload: HookPayloads[H])`. A handler declared with `TestContext` as the parameter is **narrower** — not assignable to `HookHandler<H>`.

```typescript
// WRONG — rejected by tsc
const handler = async (ctx: TestContext, payload: HookPayloads["product.created"]) => { /* ... */ };

// RIGHT — parameter is ExtensionContext, mock is still TestContext at the call site
const handler = async (ctx: ExtensionContext, payload: HookPayloads["product.created"]) => {
    // runtime object IS a TestContext, but the type doesn't tell us that
    // use `ctx.extensions.db.insert` — it's a Mock at runtime, plain function at type level
    await ctx.extensions.db.insert("audit_log", { productId: payload.id });
};

// Test setup
const testCtx = createTestContext({ user, capabilities: "all" });
await fireHook({ hooks: { "product.created": handler } }, "product.created", payload, testCtx);

// Assertions still work on testCtx
expect(testCtx.extensions.db.insert).toHaveBeenCalled();
```

The alternative — declaring the handler with `TestContext` — works at runtime but fails typecheck. The cost of declaring with `ExtensionContext` is zero: the mock is still `Mock<...>` on `testCtx`, only the handler's local parameter type is widened.

## Migration script gotcha
Bulk file rewrites in PowerShell must use `-Encoding UTF8` on `Get-Content`:

```pwoershell
# WRONG — reads as CP1252, corrupts non-ASCII content
$content = Get-Content $path -Raw

# RIGHT — preserves UTF-8
$content = Get-Content $path -Raw -Encoding UTF8
```
**Why**: during the test folder migration, this script corrupted `⚠` in `build-integration.test.ts` (rendered as `âš`) because `Get-Content -Raw` without `-Encoding` defaults to the system ANSI codepage. Only one file was affected (out of 28) because only one used non-ASCII characters in a string literal — but the same script run against `services/` or `notifications/` (which contain Arabic content) would have caused broader damage.

**Rule**: any migration script that reads and rewrites source files uses `-Encoding` UTF8 on read. UTF-8 is what the files are; reading them as anything else is corruption.

## Typecheck scripts

| Script | What it runs |
|---|---|
| `pnpm exec tsc --noEmit` | App code (root `tsconfig`, excludes `tests/`, `migrations/`, and `migration-archive/`) |
| `pnpm --filter @store-manager/extensions typecheck` | Library code (standalone `tsconfig`) |
| `pnpm typecheck:tests` | Test files (`tsconfig.test.json`) |

**All three must pass before commit**. `pnpm typecheck:tests` is not chained into `pnpm typecheck` to keep local iteration fast; wire it into CI or a pre-commit hook separately.

## Adding a new test
1. Pick the folder by system, not by phase.

2. Use relative imports (`../../services/foo`) or the `@/` alias — both work. New tests use `@/` for position-independence.

3. If the test spawns subprocesses: add it to `INTEGRATION_FILES` in `vitest.config.ts`.

4. If the test imports a source file that uses `Temporal`: no action needed; `type/temporal.d.ts` is already in the test tsconfig.

5. Run `pnpm test:unit`, then `pnpm typecheck:tests`, then pnpm `test:run` if the test touches extensions.