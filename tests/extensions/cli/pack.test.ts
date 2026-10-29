import { describe, it, expect, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { runInit } from "../../../extensions/library/src/cli/init";
import { runPack } from "../../../extensions/library/src/cli/pack";
import { inspectZip } from "../../../utils/zip-extract";
import { ManifestSchema } from "@store-manager/extensions";

/* ==========================================================================
 * Fixtures
 * ========================================================================== */

const createdDirs: string[] = [];

async function makeTmpDir(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), "ext-pack-test-"));
    createdDirs.push(dir);
    return dir;
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

/**
 * A valid manifest matching what `store-manager-ext build` would
 * produce for a scaffolded user-scope extension. Bypasses `build` (which
 * spawns esbuild) so pack tests run in <100ms each.
 */
function makeValidManifest(id: string, version: string): Record<string, unknown> {
    return {
        id,
        version,
        name: id,
        author: { name: "Test Author" },
        scope: "user",
        eligibility: { minimumGlobalRole: "USER" },
        libraryVersion: "^1.0.0",
        capabilities: {
            "db.read": false,
            "db.write": false,
            "storage.read": false,
            "storage.write": false,
            "notifications.publish": [],
            "http.fetch": [],
            "logs.write": false,
        },
        hooks: ["product.created"],
        tables: {},
        notifications: {},
        translations: {
            en: { notifications: {} },
            ar: { notifications: {} },
        },
        buildMetadata: {
            builtWith: "@store-manager/extensions@1.0.0",
            builtAt: new Date().toISOString(),
            artifactChecksum: "sha256:" + "0".repeat(64),
        },
    };
}

/**
 * Scaffold + simulate `build` by writing `dist/` directly. Avoids the
 * esbuild subprocess that `runBuild` would spawn (which would put these
 * tests in the `integration` project — this file is fast unit tests).
 */
async function makeBuiltFixture(
    name = `pack-test-${crypto.randomUUID().slice(0, 8)}`,
): Promise<string> {
    const root = await makeTmpDir();
    const target = join(root, name);

    await runInit({
        targetDir: target,
        name,
        version: "1.0.0",
        description: "test",
        author: "Test Author",
        scope: "user",
    });

    await mkdir(join(target, "dist"), { recursive: true });
    await writeFile(
        join(target, "dist", "manifest.json"),
        JSON.stringify(makeValidManifest(name, "1.0.0"), null, 2),
        "utf-8",
    );
    await writeFile(
        join(target, "dist", "index.js"),
        "export default { hooks: { 'product.created': async () => {} }, notifications: {} };",
        "utf-8",
    );

    return target;
}

/* ==========================================================================
 * Happy path — file placement and zip contents
 * ========================================================================== */

describe("cli: pack — happy path", () => {
    it("writes the zip to the default location", async () => {
        const dir = await makeBuiltFixture("my-ext");
        const result = await runPack({ dir });

        const name = dir.split(/[\\/]/).pop()!;
        const expectedPath = join(dir, `${name}-1.0.0.zip`);
        expect(result.outputPath).toBe(expectedPath);

        const stat = await fs.stat(expectedPath);
        expect(stat.isFile()).toBe(true);
        expect(result.byteLength).toBe(stat.size);
    });

    it("produces a valid zip with the C1-D2 structure", async () => {
        const dir = await makeBuiltFixture("structure-ext");
        const result = await runPack({ dir });

        const buffer = await readFile(result.outputPath);
        const inspected = await inspectZip(buffer);
        try {
            const names = inspected.entries
                .filter((e) => !e.isDirectory)
                .map((e) => e.fileName)
                .sort();

            // Root artifacts
            expect(names).toContain("manifest.json");
            expect(names).toContain("index.js");

            // Source tree
            expect(names).toContain("source/package.json");
            expect(names).toContain("source/tsconfig.json");
            expect(
                names.some((n) => n.startsWith("source/src/")),
            ).toBe(true);
        } finally {
            inspected.close();
        }
    });

    it("manifest.json inside the zip matches the built manifest", async () => {
        const dir = await makeBuiltFixture("manifest-ext");
        const result = await runPack({ dir });

        const buffer = await readFile(result.outputPath);
        const inspected = await inspectZip(buffer);
        try {
            const manifestBytes = await inspected.readFile("manifest.json");
            const parsed = JSON.parse(manifestBytes.toString("utf-8"));

            // Re-validate — the same check the server runs.
            const validated = ManifestSchema.safeParse(parsed);
            expect(validated.success).toBe(true);

            // id/version round-trip
            expect(result.extensionId).toBe("manifest-ext");
            expect(result.version).toBe("1.0.0");
        } finally {
            inspected.close();
        }
    });

    it("index.js inside the zip matches the built bundle", async () => {
        const dir = await makeBuiltFixture("index-ext");
        const result = await runPack({ dir });

        const buffer = await readFile(result.outputPath);
        const inspected = await inspectZip(buffer);
        try {
            const inZip = await inspected.readFile("index.js");
            const onDisk = await readFile(
                join(dir, "dist", "index.js"),
            );
            expect(inZip.equals(onDisk)).toBe(true);
        } finally {
            inspected.close();
        }
    });

    it("honors --out override", async () => {
        const dir = await makeBuiltFixture("out-ext");
        const overridePath = join(dir, "custom", "release.zip");
        await mkdir(join(dir, "custom"), { recursive: true });

        const result = await runPack({ dir, out: overridePath });
        expect(result.outputPath).toBe(overridePath);

        const stat = await fs.stat(overridePath);
        expect(stat.isFile()).toBe(true);
    });
});

/* ==========================================================================
 * Rejection paths
 * ========================================================================== */

describe("cli: pack — rejection paths", () => {
    it("rejects when dist/manifest.json is missing", async () => {
        const dir = await makeBuiltFixture("no-manifest-ext");
        await rm(join(dir, "dist", "manifest.json"));

        await expect(runPack({ dir })).rejects.toThrow(
            /manifest\.json.*not found.*build/,
        );
    });

    it("rejects when dist/index.js is missing", async () => {
        const dir = await makeBuiltFixture("no-index-ext");
        await rm(join(dir, "dist", "index.js"));

        await expect(runPack({ dir })).rejects.toThrow(
            /index\.js.*not found.*build/,
        );
    });

    it("rejects when src/ is missing", async () => {
        const dir = await makeBuiltFixture("no-src-ext");
        await rm(join(dir, "src"), { recursive: true, force: true });

        await expect(runPack({ dir })).rejects.toThrow(/src.*not found/);
    });

    it("rejects when tsconfig.json is missing", async () => {
        const dir = await makeBuiltFixture("no-tsconfig-ext");
        await rm(join(dir, "tsconfig.json"));

        await expect(runPack({ dir })).rejects.toThrow(
            /tsconfig\.json.*not found/,
        );
    });

    it("rejects when manifest is not valid JSON", async () => {
        const dir = await makeBuiltFixture("bad-json-ext");
        await writeFile(
            join(dir, "dist", "manifest.json"),
            "{ not json",
            "utf-8",
        );

        await expect(runPack({ dir })).rejects.toThrow(
            /not valid JSON/,
        );
    });

    it("rejects when manifest fails ManifestSchema", async () => {
        const dir = await makeBuiltFixture("bad-schema-ext");
        await writeFile(
            join(dir, "dist", "manifest.json"),
            JSON.stringify({ id: "x" }, null, 2),
            "utf-8",
        );

        await expect(runPack({ dir })).rejects.toThrow(
            /failed ManifestSchema/,
        );
    });

    it("rejects when manifest.id != package.json name", async () => {
        const dir = await makeBuiltFixture("id-mismatch-ext");
        const manifestPath = join(dir, "dist", "manifest.json");
        const manifest = JSON.parse(
            await readFile(manifestPath, "utf-8"),
        );
        manifest.id = "different-name";
        await writeFile(
            manifestPath,
            JSON.stringify(manifest, null, 2),
            "utf-8",
        );

        await expect(runPack({ dir })).rejects.toThrow(
            /must match package\.json name/,
        );
    });

    it("rejects when manifest.version != package.json version", async () => {
        const dir = await makeBuiltFixture("version-mismatch-ext");
        const manifestPath = join(dir, "dist", "manifest.json");
        const manifest = JSON.parse(
            await readFile(manifestPath, "utf-8"),
        );
        manifest.version = "9.9.9";
        await writeFile(
            manifestPath,
            JSON.stringify(manifest, null, 2),
            "utf-8",
        );

        await expect(runPack({ dir })).rejects.toThrow(
            /version mismatch/,
        );
    });

    it("rejects --out ending with a path separator", async () => {
        const dir = await makeBuiltFixture("dir-out-ext");
        await expect(
            runPack({ dir, out: join(dir, "output/") }),
        ).rejects.toThrow(/--out must be a file path/);
    });
});

/* ==========================================================================
 * Round-trip — the produced zip passes the server-side validator
 * ========================================================================== */

describe("cli: pack — round-trip with server-side validator", () => {
    it("produces a zip that inspectZip accepts cleanly", async () => {
        const dir = await makeBuiltFixture("roundtrip-ext");
        const result = await runPack({ dir });

        const buffer = await readFile(result.outputPath);
        // Must not throw — validates that pack's output is
        // shape-compatible with the server-side inspection step.
        const inspected = await inspectZip(buffer);
        try {
            expect(inspected.entries.length).toBeGreaterThan(0);
            expect(inspected.totalBytes).toBeGreaterThan(0);
        } finally {
            inspected.close();
        }
    });
});