import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";

import { db, models } from "../prisma/db";
import { ManifestSchema, type Manifest } from "../extensions/runner/manifest";
import {
    createExtensionDbApi,
    createExtensionStorageApi,
} from "../extensions/runner/extension-data";
import { ExtensionQuotaExceeded } from "../extensions/runner/types";

const ownerId = "52b45375-ce27-4859-8839-d991d3634330";

const BASE_MANIFEST = {
    id: "data-test",
    version: "1.0.0",
    name: "Data test",
    author: { name: "Test" },
    scope: "user" as const,
    eligibility: { minimumGlobalRole: "USER" as const },
    libraryVersion: "^1.0.0",
    capabilities: {
        "db.read": true,
        "db.write": true,
        "storage.read": true,
        "storage.write": true,
        "notifications.publish": [] as string[],
        "http.fetch": [] as string[],
        "logs.write": false,
    },
    hooks: ["product.created"] as const,
    tables: {
        audit_log: {
            columns: {
                productId: "uuid" as const,
                action: "text" as const,
            },
        },
    },
    notifications: {},
    translations: {
        en: { notifications: {} },
        ar: { notifications: {} },
    },
};

const FULL_CAPS = new Set([
    "db.read",
    "db.write",
    "storage.read",
    "storage.write",
]);

describe("extension data access", () => {
    const testExtId = `data-test-${crypto.randomUUID().slice(0, 8)}`;
    let installId: string;
    let manifest: Manifest;

    beforeAll(async () => {
        manifest = ManifestSchema.parse({
            ...BASE_MANIFEST,
            id: testExtId,
        });

        const extension = await models.Extension.create({
            id: testExtId,
            name: "Data test",
            authorName: "Test",
        });

        const version = await models.ExtensionVersion.create({
            extensionId: extension.id,
            version: "1.0.0",
            manifest: BASE_MANIFEST,
            artifactPath: "/tmp/fake",
            artifactChecksum: "sha256:fake",
            status: "approved",
        });

        const install = await models.ExtensionInstall.create({
            extensionId: extension.id,
            versionId: version.id,
            scope: "user",
            scopeId: ownerId,
            installedById: ownerId,
        });

        installId = install.id;
    });

    afterAll(async () => {
        await models.ExtensionInstall
            .where({ extensionId: testExtId })
            .deleteAll();
        await models.ExtensionVersion
            .where({ extensionId: testExtId })
            .deleteAll();
        await models.Extension.where({ id: testExtId }).delete();
    });

    beforeEach(async () => {
        await models.ExtensionData.where({ installId }).deleteAll();
        await models.ExtensionStorage.where({ installId }).deleteAll();
    });

    // const makeDbApi = (caps = FULL_CAPS, quota?: { rows: number; bytes: number }) =>
    //     db.transaction(async (tx) => {
    //         return createExtensionDbApi({
    //             tx,
    //             installId,
    //             extensionId: testExtId,
    //             manifest,
    //             capabilities: caps,
    //             quotaMaxRows: quota?.rows ?? 1_000_000,
    //             quotaMaxBytes: quota?.bytes ?? 500 * 1024 * 1024,
    //         });
    //     });

    const withDb = async (
        fn: (
            api: ReturnType<typeof createExtensionDbApi>,
        ) => Promise<void>,
        caps = FULL_CAPS,
        quota?: { rows: number; bytes: number },
    ) => {
        await db.transaction(async (tx) => {
            const api = createExtensionDbApi({
                tx,
                installId,
                extensionId: testExtId,
                manifest,
                capabilities: caps,
                quotaMaxRows: quota?.rows ?? 1_000_000,
                quotaMaxBytes: quota?.bytes ?? 500 * 1024 * 1024,
            });
            await fn(api);
        });
    };

    it("inserts a row into a declared table", async () => {
        await withDb(async (api) => {
            await api.insert("audit_log", {
                productId: "11111111-1111-1111-1111-111111111111",
                action: "created",
            });
        });

        const rows = await models.ExtensionData
            .where({ installId, tableName: "audit_log" })
            .all();

        expect(rows).toHaveLength(1);
        expect(rows[0].data).toEqual({
            productId: "11111111-1111-1111-1111-111111111111",
            action: "created",
        });
    });

    it("rejects insert into an undeclared table", async () => {
        await expect(
            withDb(async (api) => {
                await api.insert("not_declared", { x: 1 });
            }),
        ).rejects.toThrow(/undeclared table/);
    });

    it("rejects insert when db.write capability is missing", async () => {
        const readOnly = new Set(["db.read"]);

        await expect(
            withDb(
                async (api) => {
                    await api.insert("audit_log", { action: "created" });
                },
                readOnly,
            ),
        ).rejects.toThrow(/undeclared capability/);
    });

    it("finds rows by JSONB containment", async () => {
        await withDb(async (api) => {
            await api.insert("audit_log", {
                productId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                action: "created",
            });
            await api.insert("audit_log", {
                productId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
                action: "updated",
            });
        });

        await withDb(async (api) => {
            const rows = await api.find("audit_log", {
                productId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            });
            expect(rows).toHaveLength(1);
            expect(rows[0].action).toBe("created");
        });
    });

    it("updates matching rows and returns affected count", async () => {
        await withDb(async (api) => {
            await api.insert("audit_log", {
                productId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                action: "created",
            });
        });

        let count = 0;
        await withDb(async (api) => {
            count = await api.update(
                "audit_log",
                { productId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" },
                { action: "updated" },
            );
        });
        expect(count).toBe(1);

        await withDb(async (api) => {
            const rows = await api.find("audit_log", {
                productId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            });
            expect(rows).toHaveLength(1);
            expect(rows[0].action).toBe("updated");
        });
    });

    it("deletes matching rows and returns affected count", async () => {
        await withDb(async (api) => {
            await api.insert("audit_log", { tag: "x" });
            await api.insert("audit_log", { tag: "y" });
        });

        let count = 0;
        await withDb(async (api) => {
            count = await api.delete("audit_log", { tag: "x" });
        });
        expect(count).toBe(1);

        await withDb(async (api) => {
            const remaining = await api.find("audit_log", {});
            expect(remaining).toHaveLength(1);
            expect(remaining[0].tag).toBe("y");
        });
    });

    it("rejects an oversized single row", async () => {
        const huge = "x".repeat(200 * 1024);   // 200 KB > 100 KB cap

        await expect(
            withDb(async (api) => {
                await api.insert("audit_log", { payload: huge });
            }),
        ).rejects.toThrow(/exceeding/);
    });

    it("throws when row quota is exceeded", async () => {
        await withDb(
            async (api) => {
                await api.insert("audit_log", { idx: 1 });
            },
            FULL_CAPS,
            { rows: 1, bytes: 500 * 1024 * 1024 },
        );

        await expect(
            withDb(
                async (api) => {
                    await api.insert("audit_log", { idx: 2 });
                },
                FULL_CAPS,
                { rows: 1, bytes: 500 * 1024 * 1024 },
            ),
        ).rejects.toBeInstanceOf(ExtensionQuotaExceeded);
    });

    it("isolates installs — one install cannot see another's data", async () => {
        // Create a second install of the same extension for a different scope target.
        // Use a store id as the target to differentiate from ownerId.
        const otherInstall = await models.ExtensionInstall.create({
            extensionId: testExtId,
            versionId: (
                await models.ExtensionVersion
                    .where({ extensionId: testExtId, version: "1.0.0" })
                    .first()
            )!.id,
            scope: "user",
            scopeId: "00000000-0000-0000-0000-000000000001",
            installedById: ownerId,
        });

        await db.transaction(async (tx) => {
            const api = createExtensionDbApi({
                tx,
                installId,
                extensionId: testExtId,
                manifest,
                capabilities: FULL_CAPS,
                quotaMaxRows: 1_000_000,
                quotaMaxBytes: 500 * 1024 * 1024,
            });
            await api.insert("audit_log", { marker: "first-install" });
        });

        await db.transaction(async (tx) => {
            const api = createExtensionDbApi({
                tx,
                installId: otherInstall.id,
                extensionId: testExtId,
                manifest,
                capabilities: FULL_CAPS,
                quotaMaxRows: 1_000_000,
                quotaMaxBytes: 500 * 1024 * 1024,
            });

            const rows = await api.find("audit_log", {});
            expect(rows).toHaveLength(0);   // does not see first install's row

            await api.insert("audit_log", { marker: "second-install" });
        });

        // Clean up the second install.
        await models.ExtensionInstall
            .where({ id: otherInstall.id })
            .delete();
    });

    it("storage: set / get / delete round-trip with capability enforcement", async () => {
        await db.transaction(async (tx) => {
            const storage = createExtensionStorageApi({
                tx,
                installId,
                extensionId: testExtId,
                capabilities: FULL_CAPS,
            });

            await storage.set("counter", 42);
            expect(await storage.get<number>("counter")).toBe(42);

            await storage.delete("counter");
            expect(await storage.get("counter")).toBeNull();
        });

        await db.transaction(async (tx) => {
            const storage = createExtensionStorageApi({
                tx,
                installId,
                extensionId: testExtId,
                capabilities: new Set(["storage.read"]),
            });

            await expect(storage.set("blocked", 1)).rejects.toThrow(
                /undeclared capability/,
            );
        });
    });
});