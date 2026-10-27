import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";

import { models } from "../../../prisma/db";
import {
    emitHook,
    startRunner,
    stopRunner,
    flushHooks,
} from "../../../extensions/runner";
import {
    installExtension,
    uninstallExtension,
} from "../../../extensions/install";
import {
    createProductsService,
    updateProductService,
} from "../../../services/product.services";
import {
    activateStoreService,
    createStoreService,
} from "../../../services/store.services";
import { lookupNotificationDefinition } from "../../../notifications/registry";
import { AppError } from "../../../errors/base.error";
import type { CreateStoreInput } from "../../../zod/store.schema";

const ownerId = "52b45375-ce27-4859-8839-d991d3634330";
const FIXTURE_PATH = "extensions/fixtures/product-audit";
const EXT_NOTIFICATION_TYPE = "ext.product-audit.LOG_CHANGED";

async function createActiveStore() {
    const storeData: CreateStoreInput = {
        name: `E2E test store ${crypto.randomUUID()}`,
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

async function getSecondUserId(): Promise<string> {
    const users = await models.User.all();
    const user = users.find((c) => c.id !== ownerId);
    if (!user) {
        throw new Error(
            "E2E tests require an existing user other than the owner",
        );
    }
    return user.id;
}

describe("extensions e2e", () => {
    let storeId: string;
    let otherStoreId: string;
    let installId: string;
    let secondUserId: string;

    beforeAll(async () => {
        // A second user is needed for the notification recipient tests.
        // The fixture declares recipients = OWNER/MANAGER, excludeActor=true.
        // With only the owner in the store, actor exclusion leaves zero
        // recipients and no notification is written. Adding a second
        // MANAGER gives the notification a recipient.
        secondUserId = await getSecondUserId();

        const store = await createActiveStore();
        storeId = store.id;

        const otherStore = await createActiveStore();
        otherStoreId = otherStore.id;

        await models.StoreMembership.create({
            userId: secondUserId,
            storeId,
            role: "MANAGER",
            status: "ACTIVE",
        });

        const result = await installExtension({
            sourcePath: FIXTURE_PATH,
            scope: "store",
            scopeId: storeId,
            installedByUserId: ownerId,
        });
        installId = result.installId;

        await startRunner();
    });

    afterAll(async () => {
        stopRunner();
        try {
            await uninstallExtension(installId);
        } catch {
            // Already uninstalled by the cleanup test.
        }
    });

    beforeEach(async () => {
        // Clear extension notifications between tests so assertions are
        // isolated. Audit rows are filtered by productId in each test,
        // so they don't need clearing (each test creates its own product).
        await models.Notification
            .where({ type: EXT_NOTIFICATION_TYPE })
            .deleteAll();
    });

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // 1. product.created fires and writes an audit row
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    it("fires product.created and writes an audit row", async () => {
        const product = await createProductsService(storeId, {
            name: `E2E product ${crypto.randomUUID()}`,
            unit: "piece",
            minimumStock: 5,
            sellingPrice: 10,
        });
        if (product instanceof AppError) throw product;

        emitHook(
            "product.created",
            {
                id: product.id,
                name: product.name,
                sku: product.sku,
                stockQuantity: product.stockQuantity,
                minimumStock: product.minimumStock,
                sellingPrice: product.sellingPrice,
                isActive: product.isActive,
                createdAt: product.createdAt,
            },
            { userId: ownerId, storeId },
        );

        await flushHooks();

        const rows = await models.ExtensionData
            .where({ installId, tableName: "audit_log" })
            .all();
        const matching = rows.filter(
            (r) =>
                (r.data as Record<string, unknown>).productId ===
                product.id,
        );

        expect(matching).toHaveLength(1);
        expect(matching[0].data).toMatchObject({
            productId: product.id,
            action: "created",
            actorId: ownerId,
        });
    });

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // 2. product.updated fires and writes an audit row
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    it("fires product.updated and writes an audit row", async () => {
        const product = await createProductsService(storeId, {
            name: `E2E update product ${crypto.randomUUID()}`,
            unit: "piece",
            minimumStock: 5,
            sellingPrice: 10,
        });
        if (product instanceof AppError) throw product;

        const updated = await updateProductService(
            storeId,
            product.id,
            { name: "Updated name" },
        );
        if (updated instanceof AppError) throw updated;

        emitHook(
            "product.updated",
            {
                id: updated.id,
                name: updated.name,
                sku: updated.sku,
                stockQuantity: updated.stockQuantity,
                minimumStock: updated.minimumStock,
                sellingPrice: updated.sellingPrice,
                isActive: updated.isActive,
                createdAt: updated.createdAt,
                changes: {
                    name: {
                        previous: product.name,
                        next: "Updated name",
                    },
                },
            },
            { userId: ownerId, storeId },
        );

        await flushHooks();

        const rows = await models.ExtensionData
            .where({ installId, tableName: "audit_log" })
            .all();
        const matching = rows.filter(
            (r) =>
                (r.data as Record<string, unknown>).productId ===
                product.id,
        );

        expect(matching).toHaveLength(1);
        expect(matching[0].data).toMatchObject({
            productId: product.id,
            action: "updated",
            actorId: ownerId,
        });
    });

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // 3. LOG_CHANGED fires when sellingPrice changes
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    it("publishes LOG_CHANGED notification when sellingPrice changes", async () => {
        const product = await createProductsService(storeId, {
            name: `E2E price change ${crypto.randomUUID()}`,
            unit: "piece",
            minimumStock: 5,
            sellingPrice: 10,
        });
        if (product instanceof AppError) throw product;

        const updated = await updateProductService(
            storeId,
            product.id,
            { sellingPrice: 15 },
        );
        if (updated instanceof AppError) throw updated;

        emitHook(
            "product.updated",
            {
                id: updated.id,
                name: updated.name,
                sku: updated.sku,
                stockQuantity: updated.stockQuantity,
                minimumStock: updated.minimumStock,
                sellingPrice: updated.sellingPrice,
                isActive: updated.isActive,
                createdAt: updated.createdAt,
                changes: {
                    sellingPrice: { previous: 10, next: 15 },
                },
            },
            { userId: ownerId, storeId },
        );

        await flushHooks();

        const notifications = await models.Notification
            .where({ type: EXT_NOTIFICATION_TYPE, storeId })
            .all();

        expect(notifications).toHaveLength(1);
        expect(notifications[0].recipientId).toBe(secondUserId);
        expect(notifications[0].payload).toMatchObject({
            productName: product.name,
            field: "sellingPrice",
        });
    });

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // 4. LOG_CHANGED does NOT fire for non-price updates
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    it("does NOT publish LOG_CHANGED when only non-price fields change", async () => {
        const product = await createProductsService(storeId, {
            name: `E2E no-notification ${crypto.randomUUID()}`,
            unit: "piece",
            minimumStock: 5,
            sellingPrice: 10,
        });
        if (product instanceof AppError) throw product;

        const updated = await updateProductService(
            storeId,
            product.id,
            { name: "Renamed but price unchanged" },
        );
        if (updated instanceof AppError) throw updated;

        emitHook(
            "product.updated",
            {
                id: updated.id,
                name: updated.name,
                sku: updated.sku,
                stockQuantity: updated.stockQuantity,
                minimumStock: updated.minimumStock,
                sellingPrice: updated.sellingPrice,
                isActive: updated.isActive,
                createdAt: updated.createdAt,
                changes: {
                    name: {
                        previous: product.name,
                        next: "Renamed but price unchanged",
                    },
                },
            },
            { userId: ownerId, storeId },
        );

        await flushHooks();

        // Audit row should exist (every update is audited).
        const auditRows = await models.ExtensionData
            .where({ installId, tableName: "audit_log" })
            .all();
        const matching = auditRows.filter(
            (r) =>
                (r.data as Record<string, unknown>).productId ===
                product.id,
        );
        expect(matching).toHaveLength(1);

        // But no notification should fire (sellingPrice was not in changes).
        const notifications = await models.Notification
            .where({ type: EXT_NOTIFICATION_TYPE, storeId })
            .all();
        expect(notifications).toHaveLength(0);
    });

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // 5. Notification recipients exclude the actor
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    it("excludes the triggering actor from notification recipients", async () => {
        const product = await createProductsService(storeId, {
            name: `E2E exclude actor ${crypto.randomUUID()}`,
            unit: "piece",
            minimumStock: 5,
            sellingPrice: 10,
        });
        if (product instanceof AppError) throw product;

        const updated = await updateProductService(
            storeId,
            product.id,
            { sellingPrice: 20 },
        );
        if (updated instanceof AppError) throw updated;

        // Owner is the actor.
        emitHook(
            "product.updated",
            {
                id: updated.id,
                name: updated.name,
                sku: updated.sku,
                stockQuantity: updated.stockQuantity,
                minimumStock: updated.minimumStock,
                sellingPrice: updated.sellingPrice,
                isActive: updated.isActive,
                createdAt: updated.createdAt,
                changes: {
                    sellingPrice: { previous: 10, next: 20 },
                },
            },
            { userId: ownerId, storeId },
        );

        await flushHooks();

        const toSecond = await models.Notification
            .where({
                type: EXT_NOTIFICATION_TYPE,
                recipientId: secondUserId,
            })
            .all();
        expect(toSecond).toHaveLength(1);

        // Actor gets nothing â€” excludeActor: true in the fixture.
        const toOwner = await models.Notification
            .where({
                type: EXT_NOTIFICATION_TYPE,
                recipientId: ownerId,
            })
            .all();
        expect(toOwner).toHaveLength(0);
    });

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // 6. Store-scope isolation
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    it("does NOT fire for product events in other stores", async () => {
        const product = await createProductsService(otherStoreId, {
            name: `Other store product ${crypto.randomUUID()}`,
            unit: "piece",
            minimumStock: 5,
            sellingPrice: 10,
        });
        if (product instanceof AppError) throw product;

        // Same payload shape, but storeId points to a store where the
        // extension is NOT installed. The dispatcher should not match.
        emitHook(
            "product.created",
            {
                id: product.id,
                name: product.name,
                sku: product.sku,
                stockQuantity: product.stockQuantity,
                minimumStock: product.minimumStock,
                sellingPrice: product.sellingPrice,
                isActive: product.isActive,
                createdAt: product.createdAt,
            },
            { userId: ownerId, storeId: otherStoreId },
        );

        await flushHooks();

        // Nothing in the audit table should reference this product.
        const rows = await models.ExtensionData
            .where({ installId, tableName: "audit_log" })
            .all();
        const matching = rows.filter(
            (r) =>
                (r.data as Record<string, unknown>).productId ===
                product.id,
        );
        expect(matching).toHaveLength(0);
    });

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // 7. Uninstall removes data but preserves notification history
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    it("uninstall removes audit data, preserves notification history, and clears the runtime registry", async () => {
        // â”€â”€ Setup: fire a notification so there's history to preserve â”€â”€
        const product = await createProductsService(storeId, {
            name: `E2E cleanup ${crypto.randomUUID()}`,
            unit: "piece",
            minimumStock: 5,
            sellingPrice: 10,
        });
        if (product instanceof AppError) throw product;

        const updated = await updateProductService(
            storeId,
            product.id,
            { sellingPrice: 30 },
        );
        if (updated instanceof AppError) throw updated;

        emitHook(
            "product.updated",
            {
                id: updated.id,
                name: updated.name,
                sku: updated.sku,
                stockQuantity: updated.stockQuantity,
                minimumStock: updated.minimumStock,
                sellingPrice: updated.sellingPrice,
                isActive: updated.isActive,
                createdAt: updated.createdAt,
                changes: {
                    sellingPrice: { previous: 10, next: 30 },
                },
            },
            { userId: ownerId, storeId },
        );

        await flushHooks();

        // â”€â”€ Pre-uninstall checks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        const preAudit = await models.ExtensionData
            .where({ installId })
            .all();
        expect(preAudit.length).toBeGreaterThan(0);

        const preNotifications = await models.Notification
            .where({ type: EXT_NOTIFICATION_TYPE, storeId })
            .all();
        expect(preNotifications.length).toBeGreaterThan(0);
        const preservedNotificationId = preNotifications[0].id;

        expect(
            lookupNotificationDefinition(EXT_NOTIFICATION_TYPE),
        ).not.toBeNull();

        // â”€â”€ Uninstall + stop runner (mirrors "restart server" in dev) â”€
        await uninstallExtension(installId);
        stopRunner();

        // â”€â”€ Post-uninstall checks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        // 1. All audit rows for the install are gone (cascade).
        const postAudit = await models.ExtensionData
            .where({ installId })
            .all();
        expect(postAudit).toHaveLength(0);

        // 2. All storage rows for the install are gone.
        const postStorage = await models.ExtensionStorage
            .where({ installId })
            .all();
        expect(postStorage).toHaveLength(0);

        // 3. The install row itself is gone.
        const postInstall = await models.ExtensionInstall
            .where({ id: installId })
            .first();
        expect(postInstall).toBeNull();

        // 4. The notification row is preserved (user history).
        const preserved = await models.Notification
            .where({ id: preservedNotificationId })
            .first();
        expect(preserved).not.toBeNull();

        // 5. The runtime registry no longer has the extension type.
        expect(
            lookupNotificationDefinition(EXT_NOTIFICATION_TYPE),
        ).toBeNull();

        // 6. Catalog rows (Extension / ExtensionVersion) remain.
        const ext = await models.Extension
            .where({ id: "product-audit" })
            .first();
        expect(ext).not.toBeNull();
    });
});