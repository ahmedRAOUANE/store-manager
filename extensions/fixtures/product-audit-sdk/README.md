# product-audit-sdk — SDK-built reference fixture

A **second** version of the Product Audit Log extension, built using
`@store-manager/extensions` and `store-manager-ext build` instead of
being hand-crafted. Its purpose is to prove that an artifact built by
the SDK is functionally indistinguishable from a hand-crafted one.

## Why two fixtures?

Two fixtures, two purposes:

- **`../product-audit/`** (hand-crafted, Phase A) validates the
  *runtime contract*. It's a raw `index.js` + `manifest.json` written
  by hand, proving the runner can load and execute any extension whose
  files match the contract — with no dependency on the SDK.

- **`../product-audit-sdk/`** (this directory, Phase B) validates the
  *SDK's output*. It's real source code (`src/*.ts`) that the compiler
  bundles into an artifact. Its existence proves that:

  1. The SDK produces a **runner-loadable artifact** — same shape as
     the hand-crafted one, accepted by `loader.ts` without changes.
  2. Notification type IDs, recipient rules, and hook handlers
     **behave identically** to the hand-crafted version.
  3. The compiler's `defineNotification` presentation injection, AST
     anchoring, and manifest assembly all work correctly on a
     realistic extension (not just an empty scaffold).

Neither fixture is redundant. The hand-crafted one proves the contract
is achievable; this one proves the SDK achieves it.

## Folder name vs package name — on purpose

The folder is `product-audit-sdk` (organizational clarity: it sits
next to `product-audit/`).

The **package name** in `package.json` is `product-audit` — the
**same** as the hand-crafted fixture's ID.

Why: the compiler derives the extension ID from `pkg.name`. That ID
becomes the notification type prefix (`ext.<id>.<EVENT>`). Matching
the hand-crafted ID means both artifacts produce the same notification
type at runtime, which lets the B4 test assert equivalence directly
(`ext.product-audit.LOG_CHANGED` from both sides).

## Known cosmetic difference from the hand-crafted fixture

The SDK-built `manifest.json` will have `"name": "product-audit"` —
the package name — where the hand-crafted one has
`"name": "Product Audit Log"` — a display name. This is because
`build.ts` uses `pkg.name` for the manifest's `name` field.

**No functional impact.** The runner's `loader.ts` never reads
`manifest.name`. The install CLI copies it to the `Extension.name`
catalog field for display, so a future management UI would show
`"product-audit"` instead of `"Product Audit Log"` — cosmetic only.

Options when this starts to matter (deferred — Phase C or a B3
refinement): add a `storeManager.displayName` field to `package.json`,
or accept that SDK display names default to the package name.

## What this fixture exercises

Every surface of the SDK:

| Surface | Where |
|---|---|
| `defineExtension` | `src/index.ts` |
| `defineCapabilities` | `src/capabilities.ts` |
| `defineTable` | `src/tables/audit_log.ts` |
| `defineNotification` | `src/notifications/LOG_CHANGED.ts` |
| Typed `HookHandler` | `src/hooks/product.created.ts`, `src/hooks/product.updated.ts` |
| Translations | `src/translations/en.json`, `src/translations/ar.json` |
| Manifest assembly | Built by `build.ts` from the above |

## Building

From the workspace root:

```sh
pnpm exec store-manager-ext build extensions/fixtures/product-audit-sdk
```

Output:

```text
extensions/fixtures/product-audit-sdk/dist/
├── index.js            Bundled ESM, external zod
├── index.js.map        Source map
├── manifest.json       Compiled manifest with buildMetadata
└── README.md           Copied from this file
```