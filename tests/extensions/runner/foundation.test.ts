import { describe, it, expect } from "vitest";
import { ManifestSchema } from "../extensions/runner/manifest";
import {
    CAPABILITY_NAMES,
    hasCapability,
    assertCapability,
} from "../extensions/runner/capability";
import { ExtensionCapabilityError } from "../extensions/runner/types";

const validStoreManifest = {
    id: "product-audit",
    version: "1.0.0",
    name: "Product Audit Log",
    description: "Logs product changes",
    author: { name: "Test" },
    scope: "store",
    eligibility: {
        minimumGlobalRole: "USER",
        requiresStoreRole: ["OWNER", "MANAGER"],
    },
    libraryVersion: "^1.0.0",
    capabilities: {
        "db.read": true,
        "db.write": true,
        "notifications.publish": ["LOG_CHANGED"],
        "logs.write": true,
    },
    hooks: ["product.created", "product.updated"],
    tables: {
        audit_log: {
            columns: {
                productId: "uuid",
                action: "text",
            },
        },
    },
    notifications: {
        LOG_CHANGED: {
            titleKey: "ext.product-audit.LOG_CHANGED.title",
            bodyKey: "ext.product-audit.LOG_CHANGED.body",
        },
    },
    translations: {
        en: {
            notifications: {
                LOG_CHANGED: {
                    title: "Changed",
                    body: "Product {name} changed",
                },
            },
        },
        ar: {
            notifications: {
                LOG_CHANGED: {
                    title: "تم التعديل",
                    body: "تم تعديل {name}",
                },
            },
        },
    },
};

describe("extension manifest schema", () => {
    it("accepts a valid store-scoped manifest", () => {
        const result = ManifestSchema.safeParse(validStoreManifest);
        expect(result.success).toBe(true);
    });

    it("accepts a valid user-scoped manifest", () => {
        const manifest = {
            ...validStoreManifest,
            scope: "user",
            eligibility: { minimumGlobalRole: "USER" },
        };
        const result = ManifestSchema.safeParse(manifest);
        expect(result.success).toBe(true);
    });

    it("accepts a valid admin-scoped manifest", () => {
        const manifest = {
            ...validStoreManifest,
            scope: "admin",
            eligibility: { minimumGlobalRole: "ADMIN" },
        };
        const result = ManifestSchema.safeParse(manifest);
        expect(result.success).toBe(true);
    });

    it("rejects store-scoped without requiresStoreRole", () => {
        const manifest = {
            ...validStoreManifest,
            eligibility: { minimumGlobalRole: "USER" },
        };
        const result = ManifestSchema.safeParse(manifest);
        expect(result.success).toBe(false);
    });

    it("rejects user-scoped with requiresStoreRole", () => {
        const manifest = {
            ...validStoreManifest,
            scope: "user",
        };
        const result = ManifestSchema.safeParse(manifest);
        expect(result.success).toBe(false);
    });

    it("rejects admin-scoped without minimumGlobalRole ADMIN", () => {
        const manifest = {
            ...validStoreManifest,
            scope: "admin",
            eligibility: { minimumGlobalRole: "USER" },
        };
        const result = ManifestSchema.safeParse(manifest);
        expect(result.success).toBe(false);
    });

    it("rejects invalid extension ID", () => {
        const manifest = { ...validStoreManifest, id: "Product-Audit" };
        const result = ManifestSchema.safeParse(manifest);
        expect(result.success).toBe(false);
    });

    it("rejects capability granting undeclared notification", () => {
        const manifest = {
            ...validStoreManifest,
            capabilities: {
                ...validStoreManifest.capabilities,
                "notifications.publish": ["LOG_CHANGED", "UNDECLARED"],
            },
        };
        const result = ManifestSchema.safeParse(manifest);
        expect(result.success).toBe(false);
    });

    it("rejects declared notification not in capabilities", () => {
        const manifest = {
            ...validStoreManifest,
            capabilities: {
                ...validStoreManifest.capabilities,
                "notifications.publish": [],
            },
        };
        const result = ManifestSchema.safeParse(manifest);
        expect(result.success).toBe(false);
    });

    it("rejects missing translation in Arabic", () => {
        const manifest = {
            ...validStoreManifest,
            translations: {
                en: validStoreManifest.translations.en,
                ar: { notifications: {} },
            },
        };
        const result = ManifestSchema.safeParse(manifest);
        expect(result.success).toBe(false);
    });

    it("rejects unknown hook name", () => {
        const manifest = {
            ...validStoreManifest,
            hooks: ["product.flying"],
        };
        const result = ManifestSchema.safeParse(manifest);
        expect(result.success).toBe(false);
    });

    it("rejects manifest with notifications but no hooks", () => {
        const manifest = {
            ...validStoreManifest,
            hooks: [],
        };
        const result = ManifestSchema.safeParse(manifest);
        expect(result.success).toBe(false);
    });
});

describe("capability helpers", () => {
    it("hasCapability returns true for granted capabilities", () => {
        const caps = new Set(["db.read", "logs.write"]);
        expect(hasCapability(caps, "db.read")).toBe(true);
        expect(hasCapability(caps, "logs.write")).toBe(true);
    });

    it("hasCapability returns false for ungranted capabilities", () => {
        const caps = new Set(["db.read"]);
        expect(hasCapability(caps, "db.write")).toBe(false);
        expect(hasCapability(caps, "notifications.publish")).toBe(false);
    });

    it("assertCapability throws when capability not granted", () => {
        const caps = new Set(["db.read"]);
        expect(() =>
            assertCapability("test-ext", caps, "db.write"),
        ).toThrow(ExtensionCapabilityError);
    });

    it("assertCapability is a no-op when capability granted", () => {
        const caps = new Set(["db.read", "db.write"]);
        expect(() =>
            assertCapability("test-ext", caps, "db.read"),
        ).not.toThrow();
    });

    it("capability names list has the expected size and members", () => {
        expect(CAPABILITY_NAMES).toHaveLength(7);
        expect(CAPABILITY_NAMES).toContain("db.read");
        expect(CAPABILITY_NAMES).toContain("notifications.publish");
        expect(CAPABILITY_NAMES).toContain("http.fetch");
    });
});
