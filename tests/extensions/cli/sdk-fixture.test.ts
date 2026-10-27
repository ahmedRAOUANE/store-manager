import { describe, it, expect, beforeAll } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { ManifestSchema, type Manifest } from "@store-manager/extensions";

const execFileP = promisify(execFile);
const PNPM = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const WORKSPACE_ROOT = process.cwd();
const SDK_FIXTURE_DIR = join(
    WORKSPACE_ROOT,
    "extensions",
    "fixtures",
    "product-audit-sdk",
);
const HANDCRAFTED_FIXTURE_DIR = join(
    WORKSPACE_ROOT,
    "extensions",
    "fixtures",
    "product-audit",
);

/**
 * B4 â€” proves that an artifact built by the SDK is functionally
 * equivalent to a hand-crafted one.
 *
 * The hand-crafted fixture (`product-audit/`) is the reference: a raw
 * `index.js` + `manifest.json` that the runner already loads and
 * executes (proven in A7). The SDK-built fixture
 * (`product-audit-sdk/`) is the same extension written in TypeScript
 * using `@store-manager/extensions` and compiled by `ext build`.
 *
 * If this test passes, the SDK can produce artifacts
 * indistinguishable â€” at the runtime-contract level â€” from
 * hand-crafted ones.
 */
describe("extensions: SDK-built fixture (B4)", { timeout: 60_000, hookTimeout: 60_000 }, () => {
    let sdkManifest: Manifest;
    let handcraftedManifest: Manifest;
    let sdkBundle: { default: Record<string, unknown> };
    let handcraftedBundle: { default: Record<string, unknown> };

    beforeAll(async () => {
        // â”€â”€ 1. Build the SDK fixture fresh â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        await execFileP(
            PNPM,
            ["exec", "store-manager-ext", "build", SDK_FIXTURE_DIR],
            { cwd: WORKSPACE_ROOT, shell: true },
        );

        // â”€â”€ 2. Load both manifests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        const sdkManifestRaw = await readFile(
            join(SDK_FIXTURE_DIR, "dist", "manifest.json"),
            "utf-8",
        );
        const sdkManifestJson: unknown = JSON.parse(sdkManifestRaw);
        const sdkParsed = ManifestSchema.safeParse(sdkManifestJson);
        if (!sdkParsed.success) {
            throw new Error(
                `SDK-built manifest failed validation: ${sdkParsed.error.message}`,
            );
        }
        sdkManifest = sdkParsed.data;

        const handcraftedManifestRaw = await readFile(
            join(HANDCRAFTED_FIXTURE_DIR, "manifest.json"),
            "utf-8",
        );
        const handcraftedManifestJson: unknown = JSON.parse(
            handcraftedManifestRaw,
        );
        const handcraftedParsed =
            ManifestSchema.safeParse(handcraftedManifestJson);
        if (!handcraftedParsed.success) {
            throw new Error(
                `Hand-crafted manifest failed validation: ${handcraftedParsed.error.message}`,
            );
        }
        handcraftedManifest = handcraftedParsed.data;

        // â”€â”€ 3. Import both bundles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        // The SDK-built bundle uses its checksum as a cache-buster so
        // a rebuild produces a fresh module evaluation. The hand-crafted
        // one is stable across runs (no rebuild happens) â€” no buster needed.
        const sdkChecksum =
            (sdkManifestJson as { buildMetadata?: { artifactChecksum?: string } })
                .buildMetadata?.artifactChecksum ?? "no-checksum";

        sdkBundle = (await import(
            `${pathToFileURL(join(SDK_FIXTURE_DIR, "dist", "index.js")).href}?v=${sdkChecksum}`
        )) as { default: Record<string, unknown> };

        handcraftedBundle = (await import(
            pathToFileURL(join(HANDCRAFTED_FIXTURE_DIR, "index.js")).href
        )) as { default: Record<string, unknown> };
    }, 60_000);

    it("SDK-built manifest validates via ManifestSchema", () => {
        // Already validated in beforeAll; this test makes the assertion
        // visible in the test output.
        const recheck = ManifestSchema.safeParse(sdkManifest);
        expect(recheck.success).toBe(true);
    });

    it("SDK-built bundle exports a valid ExtensionExportedDefault shape", () => {
        const def = sdkBundle.default as {
            notifications?: Record<string, unknown>;
            hooks?: Record<string, unknown>;
        };
        expect(def).toBeDefined();
        expect(typeof def.notifications).toBe("object");
        expect(typeof def.hooks).toBe("object");
        expect(def.hooks?.["product.created"]).toBeInstanceOf(Function);
        expect(def.hooks?.["product.updated"]).toBeInstanceOf(Function);
    });

    it("both fixtures produce the same notification type ID", () => {
        const sdkDef = (sdkBundle.default as {
            notifications: Record<
                string,
                { presentation: { titleKey: string; bodyKey: string } }
            >;
        }).notifications.LOG_CHANGED;
        const handcraftedDef = (handcraftedBundle.default as {
            notifications: Record<
                string,
                { presentation: { titleKey: string; bodyKey: string } }
            >;
        }).notifications.LOG_CHANGED;

        expect(sdkDef).toBeDefined();
        expect(handcraftedDef).toBeDefined();
        expect(sdkDef.presentation).toEqual(handcraftedDef.presentation);
        expect(sdkDef.presentation.titleKey).toBe(
            "ext.product-audit.LOG_CHANGED.title",
        );
        expect(sdkDef.presentation.bodyKey).toBe(
            "ext.product-audit.LOG_CHANGED.body",
        );
    });

    it("both fixtures declare identical recipient rules", () => {
        const sdkDef = (sdkBundle.default as {
            notifications: Record<string, { recipients: unknown }>;
        }).notifications.LOG_CHANGED;
        const handcraftedDef = (handcraftedBundle.default as {
            notifications: Record<string, { recipients: unknown }>;
        }).notifications.LOG_CHANGED;

        expect(sdkDef.recipients).toEqual(handcraftedDef.recipients);
        expect(sdkDef.recipients).toEqual({
            scope: "store",
            roles: ["OWNER", "MANAGER"],
            excludeActor: true,
        });
    });

    it("both manifests agree on every runtime-relevant field", () => {
        // `name` is intentionally excluded: hand-crafted uses a display
        // name ("Product Audit Log"), SDK-built uses the package name
        // ("product-audit"). Documented in the fixture's README under
        // "Known cosmetic difference".
        expect(sdkManifest.id).toBe(handcraftedManifest.id);
        expect(sdkManifest.version).toBe(handcraftedManifest.version);
        expect(sdkManifest.scope).toBe(handcraftedManifest.scope);
        expect(sdkManifest.eligibility).toEqual(
            handcraftedManifest.eligibility,
        );
        expect(sdkManifest.libraryVersion).toBe(
            handcraftedManifest.libraryVersion,
        );
        expect(sdkManifest.capabilities).toEqual(
            handcraftedManifest.capabilities,
        );
        expect([...sdkManifest.hooks].sort()).toEqual(
            [...handcraftedManifest.hooks].sort(),
        );
        expect(sdkManifest.tables).toEqual(handcraftedManifest.tables);
        expect(sdkManifest.notifications).toEqual(
            handcraftedManifest.notifications,
        );
        expect(sdkManifest.translations).toEqual(
            handcraftedManifest.translations,
        );
    });

    it("both bundles expose the same set of hook subscriptions", () => {
        const sdkHooks = Object.keys(
            (sdkBundle.default as { hooks: Record<string, unknown> }).hooks,
        ).sort();
        const handcraftedHooks = Object.keys(
            (handcraftedBundle.default as { hooks: Record<string, unknown> })
                .hooks,
        ).sort();
        expect(sdkHooks).toEqual(handcraftedHooks);
        expect(sdkHooks).toEqual(["product.created", "product.updated"]);
    });
});