import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

// ─── Load env vars BEFORE anything else ────────────────────────────────
// .env provides defaults. .env.test overrides them, so a test-specific
// DATABASE_URL always wins when present.
loadEnv({ path: resolve(process.cwd(), ".env"), override: false });
loadEnv({ path: resolve(process.cwd(), ".env.test"), override: true });

// ─── Guard: refuse to run tests against an unexpected database ─────────
// Accepts the current dev DB and a future dedicated test DB. Rejects
// anything else, so destructive cleanup (deleteAllProducts, etc.) can
// never run against production or another unintended target.
const EXPECTED_DB_PATTERN = /^store_manager(_test)?$/;

const url = process.env.DATABASE_URL;
if (!url) {
    throw new Error(
        "DATABASE_URL is not set. Copy .env.example to .env if you haven't already.",
    );
}

let dbName: string;
try {
    dbName = new URL(url).pathname.replace(/^\//, "");
} catch {
    throw new Error(`DATABASE_URL is not a valid URL: ${url}`);
}

if (!EXPECTED_DB_PATTERN.test(dbName)) {
    throw new Error(
        [
            "",
            "═══════════════════════════════════════════════════════════",
            "  TEST DATABASE GUARD",
            "═══════════════════════════════════════════════════════════",
            `  Refusing to run tests against "${dbName}".`,
            `  Expected: "store_manager" or "store_manager_test".`,
            "",
            "  This guard prevents destructive test cleanup",
            "  (deleteAllProducts, deleteAllSuppliers, …) from",
            "  running against an unintended database such as production.",
            "",
            "  If you intentionally need a different DB for this run,",
            "  update EXPECTED_DB_PATTERN in tests/setup.ts to match.",
            "═══════════════════════════════════════════════════════════",
            "",
        ].join("\n"),
    );
}

// ─── Dead mock (kept for compatibility; safe to remove later) ──────────
// vi.mock("@/lib/prisma", () => ({
//     default: {
//         products: {
//             findMany: vi.fn(),
//             upsert: vi.fn(),
//             findUnique: vi.fn(),
//         },
//     },
// }));