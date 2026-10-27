import { describe, it, expect, afterEach } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { runInit } from "../extensions/library/src/cli/init";

const execFileP = promisify(execFile);
const PNPM = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const createdDirs: string[] = [];

async function makeTmpDir(): Promise<string> {
    const dir = await mkdtemp(join(process.cwd(), ".tmp-b3-integration-"));
    createdDirs.push(dir);
    return dir;
}

async function initScaffold(targetDir: string): Promise<void> {
    const name = targetDir.split(/[\\/]/).pop() ?? "test-ext";
    await runInit({
        targetDir,
        name,
        version: "1.0.0",
        description: "test",
        author: "test",
        scope: "user",
    });
}

async function runCliBuild(
    dir: string,
): Promise<{ stdout: string; stderr: string }> {
    const result = await execFileP(
        PNPM,
        ["exec", "store-manager-ext", "build", dir],
        { cwd: process.cwd(), shell: true },
    );
    return { stdout: result.stdout, stderr: result.stderr };
}

async function runCliBuildExpectingFailure(
    dir: string,
): Promise<{ stdout: string; stderr: string }> {
    try {
        await execFileP(
            PNPM,
            ["exec", "store-manager-ext", "build", dir],
            { cwd: process.cwd(), shell: true },
        );
    } catch (error) {
        const err = error as { stdout?: string; stderr?: string };
        return { stdout: err.stdout ?? "", stderr: err.stderr ?? "" };
    }
    throw new Error("Expected build to fail, but it succeeded");
}

afterEach(async () => {
    for (const dir of createdDirs) {
        try {
            await rm(dir, { recursive: true, force: true });
        } catch {
            // ignore — temp dirs, cleanup is best-effort
        }
    }
    createdDirs.length = 0;
});

describe(
    "cli: build integration (B3 AST verification)",
    { timeout: 60_000 },
    () => {
        /* ==============================================================
         * Success cases
         * ============================================================== */

        it("builds clean when no capabilities are declared and none are used", async () => {
            const root = await makeTmpDir();
            const target = join(root, "clean");
            await initScaffold(target);

            const { stderr } = await runCliBuild(target);

            expect(stderr).not.toContain("⚠");
            expect(stderr).not.toContain("❌");
            expect(existsSync(join(target, "dist/index.js"))).toBe(true);
            expect(existsSync(join(target, "dist/manifest.json"))).toBe(true);
        });

        it("succeeds with warnings for over-declared capabilities", async () => {
            const root = await makeTmpDir();
            const target = join(root, "over-decl");
            await initScaffold(target);

            // Declare db.read and db.write without using either.
            await writeFile(
                join(target, "src/capabilities.ts"),
                `import { defineCapabilities } from "@store-manager/extensions";
export default defineCapabilities({
    "db.read": true,
    "db.write": true,
});`,
                "utf-8",
            );

            const { stderr } = await runCliBuild(target);

            expect(stderr).toContain("⚠");
            expect(stderr).toMatch(/"db\.read".*declared but no/);
            expect(stderr).toMatch(/"db\.write".*declared but no/);
            // Build still succeeds — warnings do not block.
            expect(existsSync(join(target, "dist/index.js"))).toBe(true);
        });

        /* ==============================================================
         * Failure cases — one per error category
         * ============================================================== */

        it("fails when db.write is used but not declared", async () => {
            const root = await makeTmpDir();
            const target = join(root, "undecl-write");
            await initScaffold(target);

            // Handler uses db.insert but capabilities.ts is empty
            // (scaffold default).
            await writeFile(
                join(target, "src/index.ts"),
                `import { defineExtension } from "@store-manager/extensions";
import capabilities from "./capabilities";

export default defineExtension({
    capabilities,
    tables: {},
    notifications: {},
    on: {
        "product.created": async (ctx) => {
            await ctx.extensions.db.insert("audit_log", { x: 1 });
        },
    },
});`,
                "utf-8",
            );

            const { stderr } = await runCliBuildExpectingFailure(target);

            expect(stderr).toMatch(
                /Capability "db\.write".*used.*not declared/,
            );
            // No dist/ on verification failure.
            expect(existsSync(join(target, "dist"))).toBe(false);
        });

        it("fails when a table is written but not declared", async () => {
            const root = await makeTmpDir();
            const target = join(root, "undecl-table");
            await initScaffold(target);

            // Declare db.write but insert into a table that isn't
            // declared in src/tables/.
            await writeFile(
                join(target, "src/capabilities.ts"),
                `import { defineCapabilities } from "@store-manager/extensions";
export default defineCapabilities({ "db.write": true });`,
                "utf-8",
            );
            await writeFile(
                join(target, "src/index.ts"),
                `import { defineExtension } from "@store-manager/extensions";
import capabilities from "./capabilities";

export default defineExtension({
    capabilities,
    tables: {},
    notifications: {},
    on: {
        "product.created": async (ctx) => {
            await ctx.extensions.db.insert("undeclared_table", {});
        },
    },
});`,
                "utf-8",
            );

            const { stderr } = await runCliBuildExpectingFailure(target);

            expect(stderr).toMatch(
                /Table "undeclared_table".*written.*not declared/,
            );
            expect(existsSync(join(target, "dist"))).toBe(false);
        });

        it("fails when a notification is published but not declared in capabilities", async () => {
            const root = await makeTmpDir();
            const target = join(root, "undecl-notif");
            await initScaffold(target);

            // Create a real notification definition file so the
            // "no definition exists" error does NOT fire — we want to
            // exercise specifically the "not listed in capabilities"
            // path.
            await writeFile(
                join(target, "src/notifications/UNDECLARED_EVENT.ts"),
                `import { defineNotification } from "@store-manager/extensions";
import { z } from "zod";
export default defineNotification({
    name: "UNDECLARED_EVENT",
    payloadSchema: z.object({ x: z.string() }),
    recipients: { scope: "user" },
});`,
                "utf-8",
            );
            await writeFile(
                join(target, "src/index.ts"),
                `import { defineExtension } from "@store-manager/extensions";
import capabilities from "./capabilities";
import UNDECLARED_EVENT from "./notifications/UNDECLARED_EVENT";

export default defineExtension({
    capabilities,
    tables: {},
    notifications: { UNDECLARED_EVENT },
    on: {
        "product.created": async (ctx) => {
            await ctx.notifications.publish("UNDECLARED_EVENT", { x: "y" });
        },
    },
});`,
                "utf-8",
            );
            await writeFile(
                join(target, "src/translations/en.json"),
                JSON.stringify({
                    notifications: {
                        UNDECLARED_EVENT: { title: "T", body: "B" },
                    },
                }),
                "utf-8",
            );
            await writeFile(
                join(target, "src/translations/ar.json"),
                JSON.stringify({
                    notifications: {
                        UNDECLARED_EVENT: { title: "ت", body: "ب" },
                    },
                }),
                "utf-8",
            );

            const { stderr } = await runCliBuildExpectingFailure(target);

            expect(stderr).toMatch(
                /Notification "UNDECLARED_EVENT".*not listed in capabilities/,
            );
        });

        it("fails when a non-literal tableName is passed with file:line:col location", async () => {
            const root = await makeTmpDir();
            const target = join(root, "nonliteral");
            await initScaffold(target);

            await writeFile(
                join(target, "src/capabilities.ts"),
                `import { defineCapabilities } from "@store-manager/extensions";
export default defineCapabilities({ "db.write": true });`,
                "utf-8",
            );
            await writeFile(
                join(target, "src/index.ts"),
                `import { defineExtension } from "@store-manager/extensions";
import capabilities from "./capabilities";

declare function getTableName(): string;

export default defineExtension({
    capabilities,
    tables: {},
    notifications: {},
    on: {
        "product.created": async (ctx) => {
            const tableName = getTableName();
            await ctx.extensions.db.insert(tableName, { x: 1 });
        },
    },
});`,
                "utf-8",
            );

            const { stderr } = await runCliBuildExpectingFailure(target);

            expect(stderr).toMatch(/Non-literal tableName/);
            // Cross-platform path separator + line:col anchor.
            expect(stderr).toMatch(/src[\\/]index\.ts:\d+:\d+/);
        });

        /* ==============================================================
         * Pipeline ordering — B3-D7
         * ============================================================== */

        it("runs capability verification before manifest validation", async () => {
            // Fixture is deliberately broken in two ways:
            //   1. undeclared db.write usage (B3 verification, runs first)
            //   2. empty author.name in package.json (ManifestSchema,
            //      runs after manifest assembly)
            //
            // Expected: capability error fires, manifest error does not.
            // This proves the B3 pipeline insertion point — verification
            // blocks the build before it reaches manifest assembly.
            const root = await makeTmpDir();
            const target = join(root, "ordering");
            await initScaffold(target);

            // ── Break the manifest side ─────────────────────────────
            const pkgPath = join(target, "package.json");
            const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
                author?: string;
            };
            pkg.author = "";
            await writeFile(
                pkgPath,
                JSON.stringify(pkg, null, 2),
                "utf-8",
            );

            // ── Break the capability side ───────────────────────────
            await writeFile(
                join(target, "src/index.ts"),
                `import { defineExtension } from "@store-manager/extensions";
import capabilities from "./capabilities";

export default defineExtension({
    capabilities,
    tables: {},
    notifications: {},
    on: {
        "product.created": async (ctx) => {
            await ctx.extensions.db.insert("audit_log", {});
        },
    },
});`,
                "utf-8",
            );

            const { stderr } = await runCliBuildExpectingFailure(target);

            // Capability error fired — proves verification ran.
            expect(stderr).toMatch(
                /Capability "db\.write".*used.*not declared/,
            );
            // Manifest error did NOT fire — proves the throw at B3
            // blocked manifest assembly entirely.
            expect(stderr).not.toMatch(/author\.name/);
        });
    },
);