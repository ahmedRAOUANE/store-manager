# Access Control

Authorization for authenticated users and their store memberships.

This domain answers three questions and separates them strictly:

1. **Who is the user?** — identity resolution
2. **Is this user allowed?** — pure predicates
3. **What should happen on failure?** — guards (redirect) or wrappers (throw)

The answer to #3 is *chosen by the caller's context*, not baked into the check.
That's the boundary this domain exists to preserve.

---

## The four layers

Each layer calls only the layer below it. No layer skips down; no layer calls up.

┌──────────────────────────────────────────────────────────────────────┐
│ Guards (guards.ts) │ Wrappers (wrappers.ts) │
│ page render │ server actions │
│ redirect on failure │ throw AppError on failure │
└──────────┬──────────────────┴─────────────────┬─────────────────────┘
│ │
└───────────────┬────────────────────┘
▼
┌──────────────────────────────────────────────────────────────────────┐
│ Predicates (predicates.ts) │
│ pure boolean, no I/O, no framework │
└──────────────────────────────────────────────────────────────────────┘
▲
│
┌──────────────────────────────────────────────────────────────────────┐
│ Context (context.ts) │
│ identity resolution — Kinde, DB, cache │
└──────────────────────────────────────────────────────────────────────┘


### Context — `context.ts`

Resolves identity. Talks to Kinde and queries the DB. Caches per request.

- `getCurrentUser(): Promise<AuthenticatedUser | AppError>`
- `getCurrentStoreContext(storeId): Promise<StoreContext | AppError>`

Returns `AppError` on failure — does not redirect, does not throw. The layer
above decides what to do.

### Predicates — `predicates.ts`

Pure functions. No imports beyond `./types`. Trivially unit-testable with
fabricated inputs. No DB, no framework, no side effects.

- `hasStoreRole(membership, roles)`
- `hasGlobalRole(user, roles)`
- `isSelf(user, targetUserId)`

**This is the single source of truth for "is this user allowed?".** Guards and
wrappers call predicates; nothing else compares `user.globalRole` or
`membership.role` directly.

### Guards — `guards.ts`

Page-side enforcement. Uses `next/navigation`. Redirects on failure. Returns
the resolved context on success so pages don't re-fetch.

- `requireAuth()`
- `requireSelf(targetUserId)`
- `requireGlobalRole(roles)`
- `requireStoreAccess(storeId)`
- `requireStoreRole(storeId, roles)`

Every guard redirects to `/api/auth/login` (unauthenticated) or `/dashboard`
(authenticated, denied). `/dashboard` re-resolves the user's role and forwards
to their landing page — so a user whose role just changed lands somewhere they
can use, not an error screen.

### Wrappers — `wrappers.ts`

Action-side enforcement. No `next/navigation`. Throws `AuthenticationError` or
`AuthorizationError` on failure.

- `withAuth(handler)`
- `withGlobalRole(roles, handler)`
- `withStoreAccess(handler)`
- `withStoreRole(roles, handler)`

Wrappers throw so the client can `try/catch`. Guards redirect so the page can
send the user somewhere useful. Same predicate, different failure behavior —
that's the whole point.

---

## Invariants

1. **Guards redirect; wrappers throw.** If you find yourself writing
   `throw new AuthorizationError()` in `guards.ts` or `redirect()` in
   `wrappers.ts`, the layering has been violated.

2. **Guards do not call other guards.** `requireStoreRole` calls
   `getCurrentStoreContext`, not `requireAuth`. Nested guards would have to
   reconcile conflicting failure destinations, which is exactly the ambiguity
   this architecture eliminates. Composition of *requirements* happens at the
   call site (two guards in sequence in one page), not inside a compound guard.

3. **Predicates are pure.** No imports from `./context`, `./guards`,
   `./wrappers`, `@/services`, or `next/*`. The `README` you're reading is a
   longer document than any predicate.

4. **Context does not enforce.** `getCurrentUser` and `getCurrentStoreContext`
   return `AppError` on failure. They do not redirect or throw. The caller
   decides.

5. **No barrel export (`index.ts`).** Imports are explicit:
   `@/access/guards`, `@/access/context`, `@/access/predicates`. This keeps
   `next/navigation` out of contexts that only need identity resolution.

---

## Adding a new scope

A "scope" is an axis of authorization: global role, store membership, self,
and (future) extension, billing, feature flag.

**Adding a scope is two new functions, not a refactor.** For example, to add
"verified user":

```ts
// predicates.ts
export const isVerified = (user: AuthenticatedUser): boolean =>
    user.verifiedAt !== null;

// guards.ts
export const requireVerified = async (): Promise<AuthenticatedUser> => {
    const user = await requireAuth();
    if (!isVerified(user)) redirect(DENIED_PATH);
    return user;
};

// wrappers.ts
export const withVerified = <TArgs, TResult>(
    handler: AuthenticatedHandler<TArgs, TResult>,
) => withAuth(async (user, ...args) => {
    if (!isVerified(user)) throw new AuthorizationError();
    return handler(user, ...args);
});
```

Existing predicates, guards, wrappers, and call sites are untouched.

**When a scope grows past ~5 guards**, split it into a sub-folder:
`access/admin/{stores,users,billing}.ts`, each exporting its own guards. The
top-level `guards.ts` re-exports them for convenience. Don't split before
there's volume.

---

## Adding a new page or action
**New page under an existing role scope:**

```ts
// app/stores/[storeId]/(workspace)/manager/reports/page.tsx
export default async function ReportsPage({ params }) {
    const { storeId } = await params;
    await requireStoreRole(storeId, ["MANAGER"]);
    // rest of the page
}
```

The guard runs before any wrapped action is called. That's what fixes the
role-change race: the layout and the page both redirect; the action never
starts.

**New server action** under an existing role scope:

```ts
export const generateReport = withStoreRole(
    ["MANAGER"],
    async (_user, _membership, storeId, args) => {
        // rest of the action
    },
);
```

The wrapper throws on role failure. Client code that wants to handle it uses
`try/catch`. Client code that doesn't care just awaits; the error surfaces to
the nearest boundary.

---

## Migration status
The new domain coexists with `utils/auth.ts` until the old file is deleted.
Both files currently export the same names, with the same behavior — the
window is a pure duplication.

**Phases**:

- [x] Build access/ alongside utils/auth.ts
- [ ] Repoint imports to @/access/* (per file, no behavior change)
- [ ] Delete utils/auth.ts
- [ ] Add requireStoreRole as the first line of each role-guarded page
- [ ] Delete any inline auth checks the guards now cover

Until phase 4 is complete, the role-change race from the manager dashboard is
still live on other pages. The fix is adding the guard; the architecture is
already there.

## What this domain does not do
- **It does not resolve identity outside a request**. Kinde's `cache()` and
`getCurrentStoreContext`'s `cache()` are request-scoped. Background jobs and
webhooks must pass explicit user IDs to services directly, not call this
domain.

- **It does not own error classes**. `AuthenticationError` and
`AuthorizationError` live in `errors/`. This domain imports them.

- **It does not own roles or role schemas**. StoreRole is re-exported from
`@/zod/membership.schema` via `./types`. The role set is a schema concern;

- **It does not enforce on the client**. All checks are server-side. Client
components that hide UI based on role are doing cosmetic work; the actual
gate is the server action or page guard.


