# Store Manager

Multi-tenant inventory and sales app for small and medium stores. Users authenticate with Kinde, create or join stores, and manage products, suppliers, purchases, and sales under role-based access (Owner, Manager, Staff). Platform admins activate or suspend stores and oversee users.

## Features

- **Multi-store tenancy** — data is scoped per store; users can belong to multiple stores
- **Store lifecycle** — create → `PENDING` → admin activates → `ACTIVE` (or `SUSPENDED`)
- **Roles**
  - Global: `ADMIN` | `USER`
  - Per store: `OWNER` | `MANAGER` | `STAFF`
- **Inventory** — products with SKU, barcode, stock levels, average cost, selling price
- **Suppliers** — contact and tax details tied to a store
- **Purchases & sales** — line items, discounts/tax, payments due, invoice numbers; inventory and cost updates
- **Memberships** — request to join, accept/reject, promote, invalidate
- **Staff UI** — sales-focused; owners/managers also get products, purchases, suppliers, and members

## Tech stack

| Layer | Choice |
|--------|--------|
| App | Next.js 16 (App Router), React 19, TypeScript |
| Auth | [Kinde](https://kinde.com) (`@kinde-oss/kinde-auth-nextjs`) |
| Database | PostgreSQL ≥ 15 |
| Data layer | Prisma 8 / Prisma Next (contract-first) |
| Validation | Zod 4 |
| UI | Tailwind CSS 4, Lucide React |
| Tests | Vitest |
| Package manager | pnpm 11 |

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io) 11
- Docker (recommended for local Postgres), or any PostgreSQL 15+ server
- A [Kinde](https://kinde.com) application (client ID, secret, issuer URL)

## Getting started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

This starts Postgres 15 with:

- Database: `store_manager`
- User / password: `postgres` / `password`
- Port: `5432`

Connection string:

```text
postgresql://postgres:password@localhost:5432/store_manager
```

### 3. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/store_manager

KINDE_CLIENT_ID=
KINDE_CLIENT_SECRET=
KINDE_ISSUER_URL=

KINDE_SITE_URL=http://localhost:3000
KINDE_POST_LOGOUT_REDIRECT_URL=http://localhost:3000
KINDE_POST_LOGIN_REDIRECT_URL=http://localhost:3000/dashboard
```

In the Kinde dashboard, allow callbacks for `http://localhost:3000/api/auth/kinde_callback` (and matching logout URLs for local/prod).

### 4. Initialize the database

```bash
pnpm prisma db init
```

After changing the data contract:

```bash
pnpm contract:emit
# or: pnpm prisma contract emit
```

Check migration status:

```bash
pnpm prisma migration status
```

### 5. Run the app

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Sign-in flows through `/dashboard`, which routes admins and users to the right home.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Next.js development server |
| `pnpm build` | Production build |
| `pnpm start` | Run production server |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest (watch) |
| `pnpm test:run` | Vitest (CI / one-shot) |
| `pnpm contract:emit` | Regenerate `contract.json` and `contract.d.ts` |

`postinstall` runs `prisma skills sync` for local agent skills (safe to ignore if it no-ops).

## Project structure

```text
app/            Next.js App Router (pages, layouts, Kinde auth route)
actions/        Server actions (authz wrappers)
services/       Domain / DB logic
components/     UI (layout shell, products, sales, …)
calculations/   Purchase & sale totals
zod/            Validation schemas
utils/          Auth helpers, roles, formatting
errors/         Typed application errors
prisma/         Data contract + DB client
migrations/     Prisma Next migrations and snapshots
tests/          Vitest suites
```

### Data contract (Prisma Next)

| File | Purpose |
|------|---------|
| `prisma/contract.prisma` | Source of truth — edit models here |
| `prisma/contract.json` | Compiled IR (commit this) |
| `prisma/contract.d.ts` | Generated types (commit this) |
| `prisma/db.ts` | App DB client (`db` / `models`) |
| `prisma.config.ts` | CLI config (`DATABASE_URL`, skills agents) |

Typical workflow: edit `contract.prisma` → `pnpm contract:emit` → use typed queries → plan/apply migrations as needed.

## Auth & access control

1. Unauthenticated users hitting protected flows are sent to Kinde (`/api/auth/login`).
2. On success, the local `User` row is upserted from Kinde (`kindeId`).
3. `/dashboard` routes by `globalRole` (admin vs user).
4. Store UIs live under role path segments: `/stores/[storeId]/owner|manager|staff/...`.
5. Authorization is enforced in layouts and server actions (`withAuth`, store/global role helpers) — there is no Next.js `middleware.ts` gate.

## Main routes

| Path | Purpose |
|------|---------|
| `/` | Landing |
| `/dashboard` | Post-login router |
| `/api/auth/[kindeAuth]` | Kinde handlers |
| `/user/[userId]/profile` | Profile |
| `/user/[userId]/stores` | User’s stores / create request |
| `/admin/[adminId]/…` | Platform admin (users, stores, activate/suspend) |
| `/stores/[storeId]/activate` | Pending / suspended gate |
| `/stores/[storeId]/owner|manager|staff/…` | Role-specific store ops |

## Domain models

`User`, `Store`, `StoreMembership`, `Product`, `Supplier`, `Purchase`, `PurchaseItem`, `Sale`, `SaleItem`.

Stores default currency to `DZ` and timezone to `UTC`. SKUs and invoice numbers use DB-generated sequences.

## Testing

```bash
pnpm test:run
```

Tests live under `tests/` and cover domain services/actions (users, stores, products, purchases, sales, memberships, admin, etc.). Ensure `DATABASE_URL` points at a usable Postgres instance when running DB-backed tests.

## Learn more

- [Next.js documentation](https://nextjs.org/docs)
- [Kinde Next.js SDK](https://docs.kinde.com/developer-tools/sdks/backend/nextjs-sdk/)
- Project notes: [`prisma-next.md`](./prisma-next.md)
