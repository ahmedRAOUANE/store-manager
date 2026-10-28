import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * The three test files that spawn `pnpm exec store-manager-ext build`
 * subprocesses per test. They dominate wall time and contend for CPU
 * when run in parallel with fast in-memory tests. Isolating them into
 * a separate `integration` project that runs one file at a time
 * removes both the timeouts and the noise they used to inject into
 * unrelated test failures.
 *
 * When a future test does subprocess work, add it here. When a test
 * stops spawning subprocesses, remove it.
 */
const INTEGRATION_FILES = [
    "tests/extensions/cli/build.test.ts",
    "tests/extensions/cli/build-integration.test.ts",
    "tests/extensions/cli/sdk-fixture.test.ts",
] as const;

export default defineConfig({
    plugins: [
        react(),
        tsconfigPaths({ projects: ["./tsconfig.json", "./tsconfig.test.json"] }),
    ],
    test: {
        // ── Shared across both projects (inherited via extends: true) ──
        environment: "node",
        globals: true,
        setupFiles: ["./tests/setup.ts"],
        tags: [
            { name: "get" },
            { name: "create" },
            { name: "update" },
            { name: "delete" },
            { name: "search" },

            { name: "activate" },
            { name: "suspend" },

            { name: "all" },

            { name: "user" },
            { name: "users" },
            { name: "store" },
            { name: "stores" },
            { name: "product" },
            { name: "products" },
            { name: "supplier" },
            { name: "suppliers" },
            { name: "purchase" },
            { name: "purchases" },
            { name: "purchaseItem" },
            { name: "purchaseItems" },
            { name: "membership" },
            { name: "memberships" },
            { name: "sale" },
            { name: "sales" },
            { name: "membershipRequest" },
            { name: "membershipRequests" },
            { name: "admin" },
            { name: "locale" },
            { name: "inventory" },
            { name: "rollback" },
            { name: "notification" },
            { name: "concurrency" },

            { name: "extensions" },
            { name: "install" },
            { name: "uninstall" },
        ],

        // ── Project definitions ─────────────────────────────────────
        projects: [
            {
                extends: true,
                test: {
                    name: "unit",
                    include: ["tests/**/*.test.ts"],
                    exclude: [
                        "**/node_modules/**",
                        ...INTEGRATION_FILES,
                    ],
                    testTimeout: 30_000,
                    hookTimeout: 30_000,
                },
            },
            {
                extends: true,
                test: {
                    name: "integration",
                    include: [...INTEGRATION_FILES],
                    exclude: ["**/node_modules/**"],
                    testTimeout: 60_000,
                    hookTimeout: 60_000,
                    fileParallelism: false,
                },
            },
        ],
    },
});