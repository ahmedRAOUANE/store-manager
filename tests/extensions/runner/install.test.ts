import { describe, it, expect, afterEach } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { models } from "../../../prisma/db";
import {
    installExtension,
    uninstallExtension,
} from "../../../extensions/install";
import {
    activateStoreService,
    createStoreService,
} from "../../../services/store.services";
import { AppError } from "../../../errors/base.error";
import type { CreateStoreInput } from "../../../zod/store.schema";

const ownerId = "52b45375-ce27-4859-8839-d991d3634330";
const FIXTURE_PATH = "extensions/fixtures/product-audit";
// owner Id: cc0a75fe-5817-46b6-a157-377ad5aa7891
// store Id: 36c03886-58f3-421d-9b35-960affd30d18

async function createActiveStore() {
    const storeData: CreateStoreInput = {
        name: `Extension install test ${crypto.randomUUID()}`,
        description: null,
        phone: null,
        email: null,
        address: null,
        currency: "DZ",
        timezone: "UTC",
    };
    const store = await createStoreService(ownerId, storeData);
    if (store instanceof AppError) throw store;

    const activated = await activateStoreService(store.id);
    if (activated instanceof AppError) throw activated;

    return store;
}

describe("extensions install CLI", () => {
    const installsToCleanup: string[] = [];

    afterEach(async () => {
        for (const id of installsToCleanup) {
            try {
                await uninstallExtension(id);
            } catch {
                // Already gone; ignore.
            }
        }
        installsToCleanup.length = 0;
    });

    it(
        "installs the fixture and creates the three DB rows",
        { tags: ["extensions", "install"] },
        async () => {
            const store = await createActiveStore();

            const result = await installExtension({
                sourcePath: FIXTURE_PATH,
                scope: "store",
                scopeId: store.id,
                installedByUserId: ownerId,
            });
            installsToCleanup.push(result.installId);

            const extension = await models.Extension
                .where({ id: "product-audit" })
                .first();
            expect(extension).not.toBeNull();
            expect(extension!.name).toBe("Product Audit Log");

            const version = await models.ExtensionVersion
                .where({
                    extensionId: "product-audit",
                    version: "1.0.0",
                })
                .first();
            expect(version).not.toBeNull();
            expect(version!.artifactChecksum).toMatch(/^sha256:/);

            const install = await models.ExtensionInstall
                .where({ id: result.installId })
                .first();
            expect(install).not.toBeNull();
            expect(install!.scope).toBe("store");
            expect(install!.scopeId).toBe(store.id);
            expect(install!.status).toBe("active");
        },
    );

    it(
        "copies the fixture files to the installed directory",
        { tags: ["extensions", "install"] },
        async () => {
            const store = await createActiveStore();
            const result = await installExtension({
                sourcePath: FIXTURE_PATH,
                scope: "store",
                scopeId: store.id,
                installedByUserId: ownerId,
            });
            installsToCleanup.push(result.installId);

            expect(
                existsSync(join(result.artifactPath, "manifest.json")),
            ).toBe(true);
            expect(
                existsSync(join(result.artifactPath, "index.js")),
            ).toBe(true);
            expect(
                existsSync(join(result.artifactPath, "README.md")),
            ).toBe(true);
        },
    );

    it(
        "rejects a duplicate install for the same (id, scope, scopeId)",
        { tags: ["extensions", "install"] },
        async () => {
            const store = await createActiveStore();
            const first = await installExtension({
                sourcePath: FIXTURE_PATH,
                scope: "store",
                scopeId: store.id,
                installedByUserId: ownerId,
            });
            installsToCleanup.push(first.installId);

            await expect(
                installExtension({
                    sourcePath: FIXTURE_PATH,
                    scope: "store",
                    scopeId: store.id,
                    installedByUserId: ownerId,
                }),
            ).rejects.toThrow(/already installed/);
        },
    );

    it(
        "rejects when the store is not ACTIVE",
        { tags: ["extensions", "install"] },
        async () => {
            const storeData: CreateStoreInput = {
                name: `Pending store ${crypto.randomUUID()}`,
                description: null,
                phone: null,
                email: null,
                address: null,
                currency: "DZ",
                timezone: "UTC",
            };
            const pendingStore = await createStoreService(
                ownerId,
                storeData,
            );
            if (pendingStore instanceof AppError) throw pendingStore;

            await expect(
                installExtension({
                    sourcePath: FIXTURE_PATH,
                    scope: "store",
                    scopeId: pendingStore.id,
                    installedByUserId: ownerId,
                }),
            ).rejects.toThrow(/not ACTIVE/);
        },
    );

    it(
        "rejects when the installer has no active membership",
        { tags: ["extensions", "install"] },
        async () => {
            const store = await createActiveStore();

            await expect(
                installExtension({
                    sourcePath: FIXTURE_PATH,
                    scope: "store",
                    scopeId: store.id,
                    installedByUserId: "cc0a75fe-5817-46b6-a157-377ad5aa7891",
                }),
            ).rejects.toThrow(/not found|no ACTIVE membership/);
        },
    );

    it(
        "rejects when the CLI scope does not match the manifest scope",
        { tags: ["extensions", "install"] },
        async () => {
            await expect(
                installExtension({
                    sourcePath: FIXTURE_PATH,
                    scope: "user",
                    scopeId: ownerId,
                    installedByUserId: ownerId,
                }),
            ).rejects.toThrow(/Scope mismatch/);
        },
    );

    it(
        "uninstall removes the install and cascades data + storage",
        { tags: ["extensions", "install", "uninstall"] },
        async () => {
            const store = await createActiveStore();
            const result = await installExtension({
                sourcePath: FIXTURE_PATH,
                scope: "store",
                scopeId: store.id,
                installedByUserId: ownerId,
            });

            // Manually seed data + storage rows to prove cascade.
            await models.ExtensionData.create({
                installId: result.installId,
                tableName: "audit_log",
                data: { test: true },
            });
            await models.ExtensionStorage.create({
                installId: result.installId,
                key: "test-key",
                value: { test: true },
            });

            await uninstallExtension(result.installId);

            const install = await models.ExtensionInstall
                .where({ id: result.installId })
                .first();
            expect(install).toBeNull();

            const data = await models.ExtensionData
                .where({ installId: result.installId })
                .all();
            expect(data).toHaveLength(0);

            const storage = await models.ExtensionStorage
                .where({ installId: result.installId })
                .all();
            expect(storage).toHaveLength(0);

            // Catalog is preserved.
            const ext = await models.Extension
                .where({ id: "product-audit" })
                .first();
            expect(ext).not.toBeNull();

            const version = await models.ExtensionVersion
                .where({
                    extensionId: "product-audit",
                    version: "1.0.0",
                })
                .first();
            expect(version).not.toBeNull();
        },
    );

    it(
        "uninstall rejects an unknown installId",
        { tags: ["extensions", "uninstall"] },
        async () => {
            await expect(
                uninstallExtension(crypto.randomUUID()),
            ).rejects.toThrow(/not found/);
        },
    );
});