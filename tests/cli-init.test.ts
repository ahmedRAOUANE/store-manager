import { describe, it, expect, afterEach } from "vitest";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runInit } from "../extensions/library/src/cli/init";

const createdDirs: string[] = [];

async function makeTmpDir(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), "ext-init-test-"));
    createdDirs.push(dir);
    return dir;
}

afterEach(async () => {
    for (const dir of createdDirs) {
        try {
            await rm(dir, { recursive: true, force: true });
        } catch {
            // ignore
        }
    }
    createdDirs.length = 0;
});

describe("cli: init", () => {
    it("writes the full scaffold file set", async () => {
        const root = await makeTmpDir();
        const target = join(root, "my-ext");

        await runInit({
            targetDir: target,
            name: "my-ext",
            version: "1.0.0",
            description: "test",
            author: "me",
            scope: "user",
        });

        const expected = [
            "package.json",
            "tsconfig.json",
            "README.md",
            ".gitignore",
            "src/index.ts",
            "src/capabilities.ts",
            "src/hooks/.gitkeep",
            "src/tables/.gitkeep",
            "src/notifications/.gitkeep",
            "src/translations/en.json",
            "src/translations/ar.json",
        ];
        for (const rel of expected) {
            expect(existsSync(join(target, rel)), `missing ${rel}`).toBe(true);
        }
    });

    it("writes a valid package.json with user-scope storeManager", async () => {
        const root = await makeTmpDir();
        const target = join(root, "user-ext");

        await runInit({
            targetDir: target,
            name: "user-ext",
            version: "1.0.0",
            description: "",
            author: "",
            scope: "user",
        });

        const pkg = JSON.parse(readFileSync(join(target, "package.json"), "utf-8"));
        expect(pkg.name).toBe("user-ext");
        expect(pkg.version).toBe("1.0.0");
        expect(pkg.private).toBe(true);
        expect(pkg.type).toBe("module");
        expect(pkg.storeManager.scope).toBe("user");
        expect(pkg.storeManager.eligibility).toEqual({ minimumGlobalRole: "USER" });
    });

    it("writes a valid package.json with store-scope storeManager", async () => {
        const root = await makeTmpDir();
        const target = join(root, "store-ext");

        await runInit({
            targetDir: target,
            name: "store-ext",
            version: "1.0.0",
            description: "",
            author: "",
            scope: "store",
            requiresStoreRole: ["OWNER", "MANAGER"],
        });

        const pkg = JSON.parse(readFileSync(join(target, "package.json"), "utf-8"));
        expect(pkg.storeManager.scope).toBe("store");
        expect(pkg.storeManager.eligibility).toEqual({
            minimumGlobalRole: "USER",
            requiresStoreRole: ["OWNER", "MANAGER"],
        });
    });

    it("writes a valid package.json with admin-scope storeManager", async () => {
        const root = await makeTmpDir();
        const target = join(root, "admin-ext");

        await runInit({
            targetDir: target,
            name: "admin-ext",
            version: "1.0.0",
            description: "",
            author: "",
            scope: "admin",
        });

        const pkg = JSON.parse(readFileSync(join(target, "package.json"), "utf-8"));
        expect(pkg.storeManager.scope).toBe("admin");
        expect(pkg.storeManager.eligibility).toEqual({ minimumGlobalRole: "ADMIN" });
    });

    it("refuses to write to a non-empty directory", async () => {
        const root = await makeTmpDir();
        const target = join(root, "occupied");
        mkdirSync(target, { recursive: true });
        writeFileSync(join(target, "existing.txt"), "stuff", "utf-8");

        await expect(
            runInit({
                targetDir: target,
                name: "test",
                version: "1.0.0",
                description: "",
                author: "",
                scope: "user",
            }),
        ).rejects.toThrow(/already exists and is not empty/);
    });

    it("creates a nonexistent target directory", async () => {
        const root = await makeTmpDir();
        const target = join(root, "fresh");

        await expect(
            runInit({
                targetDir: target,
                name: "test",
                version: "1.0.0",
                description: "",
                author: "",
                scope: "user",
            }),
        ).resolves.toBeUndefined();

        expect(existsSync(join(target, "package.json"))).toBe(true);
    });

    it("rejects an invalid extension name", async () => {
        const root = await makeTmpDir();
        await expect(
            runInit({
                targetDir: join(root, "test"),
                name: "Invalid Name",
                version: "1.0.0",
                description: "",
                author: "",
                scope: "user",
            }),
        ).rejects.toThrow(/Invalid extension name/);
    });

    it("rejects an invalid version", async () => {
        const root = await makeTmpDir();
        await expect(
            runInit({
                targetDir: join(root, "test"),
                name: "test",
                version: "not-semver",
                description: "",
                author: "",
                scope: "user",
            }),
        ).rejects.toThrow(/Invalid version/);
    });
});