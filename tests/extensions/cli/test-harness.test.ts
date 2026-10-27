import { describe, it, expect } from "vitest";

import {
    createTestContext,
    fireHook,
    type TestContext,
} from "@store-manager/extensions/test";
import type { HookPayloads } from "@store-manager/extensions";

/* ==========================================================================
 * Fixtures
 * ========================================================================== */

const TEST_USER = {
    id: "u1",
    firstName: "Alice",
    lastName: "Smith",
};

const TEST_STORE = {
    id: "s1",
    name: "Test Store",
};

const PRODUCT_CREATED_PAYLOAD: HookPayloads["product.created"] = {
    id: "p1",
    name: "Widget",
    sku: "SKU-1",
    stockQuantity: 10,
    minimumStock: 5,
    sellingPrice: 15,
    isActive: true,
    createdAt: {
        epochMilliseconds: 1_700_000_000_000,
        toString: () => "2023-11-14T22:13:20Z",
    },
};

/* ==========================================================================
 * createTestContext — user and store passthrough
 * ========================================================================== */

describe("createTestContext: user and store", () => {
    it("copies the user object into ctx.user", () => {
        const ctx = createTestContext({ user: TEST_USER });
        expect(ctx.user).toEqual(TEST_USER);
    });

    it("defaults store to null when not provided", () => {
        const ctx = createTestContext({ user: TEST_USER });
        expect(ctx.store).toBeNull();
    });

    it("preserves store when provided", () => {
        const ctx = createTestContext({
            user: TEST_USER,
            store: TEST_STORE,
        });
        expect(ctx.store).toEqual(TEST_STORE);
    });
});

/* ==========================================================================
 * createTestContext — capability guard
 * ========================================================================== */

describe("createTestContext: capability guard", () => {
    const TRIGGERS: ReadonlyArray<{
        trigger: string;
        call: (ctx: TestContext) => Promise<unknown>;
    }> = [
            { trigger: "db.find", call: async (ctx) => ctx.extensions.db.find("t", {}) },
            { trigger: "db.insert", call: async (ctx) => ctx.extensions.db.insert("t", {}) },
            { trigger: "db.update", call: async (ctx) => ctx.extensions.db.update("t", {}, {}) },
            { trigger: "db.delete", call: async (ctx) => ctx.extensions.db.delete("t", {}) },
            { trigger: "storage.get", call: async (ctx) => ctx.extensions.storage.get("k") },
            { trigger: "storage.set", call: async (ctx) => ctx.extensions.storage.set("k", 1) },
            { trigger: "storage.delete", call: async (ctx) => ctx.extensions.storage.delete("k") },
            { trigger: "notifications.publish", call: async (ctx) => ctx.notifications.publish("E", {}) },
            { trigger: "http.fetch", call: async (ctx) => ctx.http.fetch("https://x") },
            { trigger: "log.info", call: async (ctx) => ctx.log.info("m") },
            { trigger: "log.warn", call: async (ctx) => ctx.log.warn("m") },
            { trigger: "log.error", call: async (ctx) => ctx.log.error("m") },
        ];

    for (const { trigger, call } of TRIGGERS) {
        it(`throws when ${trigger} is used without a granted capability`, async () => {
            const ctx = createTestContext({ user: TEST_USER });
            await expect(call(ctx)).rejects.toThrow(/not granted in this test context/);
        });
    }

    it("thrown error has name ExtensionCapabilityError", async () => {
        const ctx = createTestContext({ user: TEST_USER });
        try {
            await ctx.extensions.db.insert("t", {});
            expect.fail("should have thrown");
        } catch (error) {
            expect((error as Error).name).toBe("ExtensionCapabilityError");
        }
    });

    it("allows the call when the capability is granted", async () => {
        const ctx = createTestContext({
            user: TEST_USER,
            capabilities: ["db.write"],
        });
        await expect(
            ctx.extensions.db.insert("t", { x: 1 }),
        ).resolves.toBeUndefined();
    });

    it("does not extend grants across capabilities", async () => {
        // db.read granted, db.write not — the write guard must fire.
        const ctx = createTestContext({
            user: TEST_USER,
            capabilities: ["db.read"],
        });
        await expect(
            ctx.extensions.db.insert("t", {}),
        ).rejects.toThrow(/not granted/);
    });

    it('"all" grants every capability', async () => {
        const ctx = createTestContext({
            user: TEST_USER,
            capabilities: "all",
        });
        await expect(ctx.extensions.db.insert("t", {})).resolves.toBeUndefined();
        await expect(ctx.extensions.db.find("t", {})).resolves.toEqual([]);
        await expect(ctx.extensions.db.update("t", {}, {})).resolves.toBe(0);
        await expect(ctx.extensions.db.delete("t", {})).resolves.toBe(0);
        await expect(ctx.extensions.storage.get("k")).resolves.toBeNull();
        await expect(ctx.extensions.storage.set("k", 1)).resolves.toBeUndefined();
        await expect(ctx.extensions.storage.delete("k")).resolves.toBeUndefined();
        await expect(ctx.notifications.publish("E", {})).resolves.toBeUndefined();
        expect(() => ctx.log.info("m")).not.toThrow();
        expect(() => ctx.log.warn("m")).not.toThrow();
        expect(() => ctx.log.error("m")).not.toThrow();
    });
});

/* ==========================================================================
 * createTestContext — default return values
 * ========================================================================== */

describe("createTestContext: default return values", () => {
    it("db.find returns []", async () => {
        const ctx = createTestContext({ user: TEST_USER, capabilities: "all" });
        await expect(ctx.extensions.db.find("t", {})).resolves.toEqual([]);
    });

    it("db.update returns 0", async () => {
        const ctx = createTestContext({ user: TEST_USER, capabilities: "all" });
        await expect(ctx.extensions.db.update("t", {}, {})).resolves.toBe(0);
    });

    it("db.delete returns 0", async () => {
        const ctx = createTestContext({ user: TEST_USER, capabilities: "all" });
        await expect(ctx.extensions.db.delete("t", {})).resolves.toBe(0);
    });

    it("storage.get returns null", async () => {
        const ctx = createTestContext({ user: TEST_USER, capabilities: "all" });
        await expect(ctx.extensions.storage.get("k")).resolves.toBeNull();
    });

    it("http.fetch throws with a configuration hint", async () => {
        const ctx = createTestContext({ user: TEST_USER, capabilities: "all" });
        await expect(ctx.http.fetch("https://example.com")).rejects.toThrow(
            /mockResolvedValue/,
        );
    });
});

/* ==========================================================================
 * createTestContext — overrides
 * ========================================================================== */

describe("createTestContext: overrides", () => {
    it("mockResolvedValue replaces the default implementation", async () => {
        const ctx = createTestContext({
            user: TEST_USER,
            capabilities: ["storage.read"],
        });
        ctx.extensions.storage.get.mockResolvedValue(42);
        await expect(ctx.extensions.storage.get("k")).resolves.toBe(42);
    });

    it("override bypasses the capability guard (intentional)", async () => {
        // No storage.read granted. Overriding is an explicit act — the
        // author is taking responsibility. This is documented behavior
        // in context.ts (D4).
        const ctx = createTestContext({ user: TEST_USER });
        ctx.extensions.storage.get.mockResolvedValue("x");
        await expect(ctx.extensions.storage.get("k")).resolves.toBe("x");
    });

    it("records every call for later assertions", async () => {
        const ctx = createTestContext({ user: TEST_USER, capabilities: "all" });
        await ctx.extensions.db.insert("audit_log", { productId: "p1" });
        await ctx.extensions.db.insert("audit_log", { productId: "p2" });
        expect(ctx.extensions.db.insert.mock.calls).toHaveLength(2);
        expect(ctx.extensions.db.insert).toHaveBeenNthCalledWith(
            1,
            "audit_log",
            { productId: "p1" },
        );
        expect(ctx.extensions.db.insert).toHaveBeenNthCalledWith(
            2,
            "audit_log",
            { productId: "p2" },
        );
    });
});

/* ==========================================================================
 * fireHook — successful invocation
 * ========================================================================== */

describe("fireHook: successful invocation", () => {
    it("passes ctx and payload through unchanged", async () => {
        const ctx = createTestContext({ user: TEST_USER, capabilities: "all" });
        let receivedCtx: unknown = null;
        let receivedPayload: unknown = null;
        const handler = async (
            c: TestContext,
            p: HookPayloads["product.created"],
        ) => {
            receivedCtx = c;
            receivedPayload = p;
        };
        await fireHook(
            { hooks: { "product.created": handler } },
            "product.created",
            PRODUCT_CREATED_PAYLOAD,
            ctx,
        );
        expect(receivedCtx).toBe(ctx);
        expect(receivedPayload).toEqual(PRODUCT_CREATED_PAYLOAD);
    });

    it("awaits async handler completion before resolving", async () => {
        const ctx = createTestContext({ user: TEST_USER, capabilities: "all" });
        let completed = false;
        const handler = async () => {
            await new Promise((r) => setTimeout(r, 10));
            completed = true;
        };
        await fireHook(
            { hooks: { "product.created": handler } },
            "product.created",
            PRODUCT_CREATED_PAYLOAD,
            ctx,
        );
        expect(completed).toBe(true);
    });

    it("resolves when the handler returns a plain void (sync)", async () => {
        const ctx = createTestContext({ user: TEST_USER });
        const handler = () => {
            /* sync, returns void */
        };
        await expect(
            fireHook(
                { hooks: { "product.created": handler } },
                "product.created",
                PRODUCT_CREATED_PAYLOAD,
                ctx,
            ),
        ).resolves.toBeUndefined();
    });
});

/* ==========================================================================
 * fireHook — errors
 * ========================================================================== */

describe("fireHook: errors", () => {
    it("throws when the extension doesn't subscribe to the hook", async () => {
        const ctx = createTestContext({ user: TEST_USER });
        await expect(
            fireHook(
                { hooks: {} },
                "product.created",
                PRODUCT_CREATED_PAYLOAD,
                ctx,
            ),
        ).rejects.toThrow(/does not subscribe to hook "product\.created"/);
    });

    it("names the subscribed hooks in the error message", async () => {
        const ctx = createTestContext({ user: TEST_USER });
        await expect(
            fireHook(
                { hooks: { "product.updated": async () => { } } },
                "product.created",
                PRODUCT_CREATED_PAYLOAD,
                ctx,
            ),
        ).rejects.toThrow(/Subscribed hooks: \[product\.updated\]/);
    });

    it("propagates handler-thrown errors unchanged", async () => {
        const ctx = createTestContext({ user: TEST_USER });
        const handler = async () => {
            throw new Error("handler failed deliberately");
        };
        await expect(
            fireHook(
                { hooks: { "product.created": handler } },
                "product.created",
                PRODUCT_CREATED_PAYLOAD,
                ctx,
            ),
        ).rejects.toThrow("handler failed deliberately");
    });
});

/* ==========================================================================
 * End-to-end — the pattern extension authors actually write
 * ========================================================================== */

describe("end-to-end: create, fire, assert", () => {
    it("supports the full unit-test workflow", async () => {
        const ctx = createTestContext({
            user: TEST_USER,
            store: TEST_STORE,
            capabilities: ["db.write", "logs.write"],
        });

        const handler = async (
            c: TestContext,
            p: HookPayloads["product.created"],
        ) => {
            await c.extensions.db.insert("audit_log", {
                productId: p.id,
                action: "created",
                actorId: c.user.id,
            });
            c.log.info(`audited ${p.name}`);
        };

        await fireHook(
            { hooks: { "product.created": handler } },
            "product.created",
            PRODUCT_CREATED_PAYLOAD,
            ctx,
        );

        expect(ctx.extensions.db.insert).toHaveBeenCalledTimes(1);
        expect(ctx.extensions.db.insert).toHaveBeenCalledWith("audit_log", {
            productId: "p1",
            action: "created",
            actorId: "u1",
        });
        expect(ctx.log.info).toHaveBeenCalledWith("audited Widget");
    });
});