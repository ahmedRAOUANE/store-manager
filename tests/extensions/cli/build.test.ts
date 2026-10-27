import { describe, it, expect, afterEach } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { runInit } from "../extensions/library/src/cli/init";
import { ManifestSchema } from "@store-manager/extensions";

const execFileP = promisify(execFile);
const PNPM = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const createdDirs: string[] = [];

async function makeTmpDir(): Promise<string> {
    const dir = await mkdtemp(join(process.cwd(), ".tmp-build-test-"));
    createdDirs.push(dir);
    return dir;
}

async function initScaffold(
    targetDir: string,
    opts: {
        scope?: "user" | "store" | "admin";
        requiresStoreRole?: readonly ("OWNER" | "MANAGER" | "STAFF")[];
    } = {},
): Promise<void> {
    const name = targetDir.split(/[\\/]/).pop() ?? "test-ext";
    await runInit({
        targetDir,
        name,
        version: "1.0.0",
        description: "test",
        author: "test",
        scope: opts.scope ?? "user",
        requiresStoreRole: opts.requiresStoreRole,
    });
}

async function runCliBuild(dir: string): Promise<{ stdout: string }> {
    const result = await execFileP(
        PNPM,
        ["exec", "store-manager-ext", "build", dir],
        { cwd: process.cwd(), shell: true },
    );
    return { stdout: result.stdout };
}

async function runCliBuildExpectingFailure(
    dir: string,
): Promise<{ stderr: string }> {
    try {
        await execFileP(
            PNPM,
            ["exec", "store-manager-ext", "build", dir],
            { cwd: process.cwd(), shell: true },
        );
    } catch (error) {
        const err = error as { stderr?: string };
        return { stderr: err.stderr ?? "" };
    }
    throw new Error("Expected build to fail, but it succeeded");
}

afterEach(async () => {
    for (const dir of createdDirs) {
        try {
            await rm(dir, { recursive: true, force: true });
        } catch {
            // ignore — subprocess may hold a handle briefly on Windows
        }
    }
    createdDirs.length = 0;
});

describe("cli: build", () => {
    it("builds an empty scaffold and produces valid dist output", async () => {
        const root = await makeTmpDir();
        const target = join(root, "empty-ext");
        await initScaffold(target);
        await runCliBuild(target);

        expect(existsSync(join(target, "dist/index.js"))).toBe(true);
        expect(existsSync(join(target, "dist/index.js.map"))).toBe(true);
        expect(existsSync(join(target, "dist/manifest.json"))).toBe(true);
        expect(existsSync(join(target, "dist/README.md"))).toBe(true);

        const manifest = JSON.parse(
            readFileSync(join(target, "dist/manifest.json"), "utf-8"),
        );
        const parsed = ManifestSchema.safeParse(manifest);
        expect(parsed.success).toBe(true);
    });

    it("produces a manifest with correct store-scope eligibility", async () => {
        const root = await makeTmpDir();
        const target = join(root, "store-ext");
        await initScaffold(target, {
            scope: "store",
            requiresStoreRole: ["OWNER", "MANAGER"],
        });
        await runCliBuild(target);

        const manifest = JSON.parse(
            readFileSync(join(target, "dist/manifest.json"), "utf-8"),
        );
        expect(manifest.scope).toBe("store");
        expect(manifest.eligibility).toEqual({
            minimumGlobalRole: "USER",
            requiresStoreRole: ["OWNER", "MANAGER"],
        });
    });

    it("compiled bundle exports a loadable ExtensionExportedDefault shape", async () => {
        const root = await makeTmpDir();
        const target = join(root, "bundle-ext");
        await initScaffold(target);
        await runCliBuild(target);

        const bundle = (await import(
            pathToFileURL(join(target, "dist/index.js")).href
        )) as {
            default: {
                notifications: Record<string, unknown>;
                hooks: Record<string, unknown>;
            };
        };

        expect(bundle.default).toBeDefined();
        expect(typeof bundle.default.notifications).toBe("object");
        expect(typeof bundle.default.hooks).toBe("object");
        expect(bundle.default.hooks["product.created"]).toBeInstanceOf(Function);
    });

    it("injects namespaced presentation into compiled notifications", async () => {
        const root = await makeTmpDir();
        const target = join(root, "notif-ext");
        await initScaffold(target, { scope: "user" });

        await writeFile(
            join(target, "src/notifications/LOG_CHANGED.ts"),
            `import { defineNotification } from "@store-manager/extensions";
import { z } from "zod";

export default defineNotification({
    name: "LOG_CHANGED",
    payloadSchema: z.object({ productName: z.string() }).strict(),
    recipients: { scope: "user" },
});`,
            "utf-8",
        );

        await writeFile(
            join(target, "src/index.ts"),
            `import { defineExtension } from "@store-manager/extensions";
import capabilities from "./capabilities";
import LOG_CHANGED from "./notifications/LOG_CHANGED";

export default defineExtension({
    capabilities,
    tables: {},
    notifications: { LOG_CHANGED },
    on: {
        "product.created": async () => {},
    },
});`,
            "utf-8",
        );

        await writeFile(
            join(target, "src/capabilities.ts"),
            `import { defineCapabilities } from "@store-manager/extensions";
export default defineCapabilities({
    "notifications.publish": ["LOG_CHANGED"],
});`,
            "utf-8",
        );

        await writeFile(
            join(target, "src/translations/en.json"),
            JSON.stringify({
                notifications: {
                    LOG_CHANGED: {
                        title: "Changed",
                        body: "{productName} changed",
                    },
                },
            }),
            "utf-8",
        );

        await writeFile(
            join(target, "src/translations/ar.json"),
            JSON.stringify({
                notifications: {
                    LOG_CHANGED: {
                        title: "تم التعديل",
                        body: "تم تعديل {productName}",
                    },
                },
            }),
            "utf-8",
        );

        await runCliBuild(target);

        // Runtime shape — proves defineNotification was invoked with the
        // correct inlined extension ID and produced a namespaced presentation.
        const bundle = (await import(
            pathToFileURL(join(target, "dist/index.js")).href
        )) as {
            default: {
                notifications: Record<
                    string,
                    { presentation: { titleKey: string; bodyKey: string } }
                >;
            };
        };

        const def = bundle.default.notifications.LOG_CHANGED;
        expect(def).toBeDefined();
        expect(def.presentation).toEqual({
            titleKey: "ext.notif-ext.LOG_CHANGED.title",
            bodyKey: "ext.notif-ext.LOG_CHANGED.body",
        });

        // Manifest — must match the runtime shape
        const manifest = JSON.parse(
            readFileSync(join(target, "dist/manifest.json"), "utf-8"),
        );
        expect(manifest.notifications.LOG_CHANGED).toEqual({
            titleKey: "ext.notif-ext.LOG_CHANGED.title",
            bodyKey: "ext.notif-ext.LOG_CHANGED.body",
        });
    });

    it("fails when a declared notification lacks a translation entry", async () => {
        const root = await makeTmpDir();
        const target = join(root, "no-trans-ext");
        await initScaffold(target);

        await writeFile(
            join(target, "src/notifications/LOG_CHANGED.ts"),
            `import { defineNotification } from "@store-manager/extensions";
import { z } from "zod";

export default defineNotification({
    name: "LOG_CHANGED",
    payloadSchema: z.object({ x: z.string() }),
    recipients: { scope: "user" },
});`,
            "utf-8",
        );
        await writeFile(
            join(target, "src/index.ts"),
            `import { defineExtension } from "@store-manager/extensions";
import capabilities from "./capabilities";
import LOG_CHANGED from "./notifications/LOG_CHANGED";

export default defineExtension({
    capabilities,
    tables: {},
    notifications: { LOG_CHANGED },
    on: { "product.created": async () => {} },
});`,
            "utf-8",
        );
        await writeFile(
            join(target, "src/capabilities.ts"),
            `import { defineCapabilities } from "@store-manager/extensions";
export default defineCapabilities({
    "notifications.publish": ["LOG_CHANGED"],
});`,
            "utf-8",
        );
        // Translations left empty

        const { stderr } = await runCliBuildExpectingFailure(target);
        expect(stderr).toMatch(/missing an entry for notification "LOG_CHANGED"/);
    });

    it("fails when package.json is missing the storeManager block", async () => {
        const root = await makeTmpDir();
        const target = join(root, "no-sm-ext");
        await initScaffold(target);

        const pkg = JSON.parse(
            readFileSync(join(target, "package.json"), "utf-8"),
        );
        delete pkg.storeManager;
        await writeFile(
            join(target, "package.json"),
            JSON.stringify(pkg, null, 2),
            "utf-8",
        );

        const { stderr } = await runCliBuildExpectingFailure(target);
        expect(stderr).toMatch(/storeManager/);
    });
});