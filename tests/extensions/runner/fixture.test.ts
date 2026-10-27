import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { ManifestSchema } from "../extensions/runner/manifest";
import { isExtensionExportedDefault } from "../extensions/runner/validation";

const FIXTURE_DIR = join(
    process.cwd(),
    "extensions",
    "fixtures",
    "product-audit",
);

const readManifest = () =>
    JSON.parse(readFileSync(join(FIXTURE_DIR, "manifest.json"), "utf-8"));

const loadFixtureModule = async () => {
    const fileUrl = pathToFileURL(join(FIXTURE_DIR, "index.js")).href;
    return import(fileUrl);
};

describe("product-audit fixture", () => {
    it("manifest parses against ManifestSchema", () => {
        const result = ManifestSchema.safeParse(readManifest());
        if (!result.success) {
            console.error(
                "Manifest validation failed:",
                result.error.format(),
            );
        }
        expect(result.success).toBe(true);
    });

    it("index.js exports a valid ExtensionExportedDefault", async () => {
        const mod = await loadFixtureModule();
        expect(isExtensionExportedDefault(mod.default)).toBe(true);
    });

    it("exported notifications match the manifest declarations", async () => {
        const manifest = ManifestSchema.parse(readManifest());
        const mod = await loadFixtureModule();
        const exported = mod.default as {
            notifications: Record<string, unknown>;
        };

        const manifestKeys = Object.keys(manifest.notifications).sort();
        const exportedKeys = Object.keys(exported.notifications).sort();

        expect(exportedKeys).toEqual(manifestKeys);
    });

    it("exported hooks cover every declared hook", async () => {
        const manifest = ManifestSchema.parse(readManifest());
        const mod = await loadFixtureModule();
        const exported = mod.default as {
            hooks: Record<string, unknown>;
        };

        for (const hook of manifest.hooks) {
            expect(exported.hooks).toHaveProperty(hook);
            expect(typeof exported.hooks[hook]).toBe("function");
        }
    });
});