import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
    versionSatisfies,
    buildCapabilitySet,
    isExtensionExportedDefault,
} from "../../../extensions/runner/validation";
import { ManifestSchema } from "../../../extensions/runner/manifest";

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// versionSatisfies
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe("versionSatisfies", () => {
    it("^1.0.0 accepts 1.0.0", () => {
        expect(versionSatisfies("1.0.0", "^1.0.0")).toBe(true);
    });
    it("^1.0.0 accepts 1.5.2", () => {
        expect(versionSatisfies("1.5.2", "^1.0.0")).toBe(true);
    });
    it("^1.0.0 rejects 2.0.0", () => {
        expect(versionSatisfies("2.0.0", "^1.0.0")).toBe(false);
    });
    it("^1.0.0 rejects 0.9.0", () => {
        expect(versionSatisfies("0.9.0", "^1.0.0")).toBe(false);
    });
    it("~1.2.0 accepts 1.2.5", () => {
        expect(versionSatisfies("1.2.5", "~1.2.0")).toBe(true);
    });
    it("~1.2.0 rejects 1.3.0", () => {
        expect(versionSatisfies("1.3.0", "~1.2.0")).toBe(false);
    });
    it("exact range only matches exact version", () => {
        expect(versionSatisfies("1.0.0", "1.0.0")).toBe(true);
        expect(versionSatisfies("1.0.1", "1.0.0")).toBe(false);
    });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// buildCapabilitySet
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const BASE_MANIFEST = {
    id: "test-ext",
    version: "1.0.0",
    name: "Test",
    author: { name: "Test" },
    scope: "user" as const,
    eligibility: { minimumGlobalRole: "USER" as const },
    libraryVersion: "^1.0.0",
    capabilities: {
        "db.read": true,
        "db.write": true,
        "storage.read": false,
        "storage.write": false,
        "notifications.publish": ["EVENT_A"] as string[],
        "http.fetch": [] as string[],
        "logs.write": false,
    },
    hooks: ["product.created"] as const,
    tables: {},
    notifications: {
        EVENT_A: {
            titleKey: "ext.test.EVENT_A.title",
            bodyKey: "ext.test.EVENT_A.body",
        },
    },
    translations: {
        en: {
            notifications: { EVENT_A: { title: "A", body: "B" } },
        },
        ar: {
            notifications: { EVENT_A: { title: "Ø£", body: "Ø¨" } },
        },
    },
};

describe("buildCapabilitySet", () => {
    it("includes declared booleans and non-empty arrays", () => {
        const manifest = ManifestSchema.parse(BASE_MANIFEST);
        const set = buildCapabilitySet(manifest);
        expect(set.has("db.read")).toBe(true);
        expect(set.has("db.write")).toBe(true);
        expect(set.has("notifications.publish")).toBe(true);
        expect(set.has("storage.read")).toBe(false);
        expect(set.has("http.fetch")).toBe(false);
    });

    it("excludes capabilities declared as false or empty array", () => {
        const manifest = ManifestSchema.parse(BASE_MANIFEST);
        const set = buildCapabilitySet(manifest);
        expect(set.has("storage.read")).toBe(false);
        expect(set.has("storage.write")).toBe(false);
        expect(set.has("logs.write")).toBe(false);
        expect(set.has("http.fetch")).toBe(false);
    });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// isExtensionExportedDefault
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const VALID_DEF = {
    payloadSchema: z.object({ name: z.string() }).strict(),
    presentation: { titleKey: "ext.test.E.title", bodyKey: "ext.test.E.body" },
    recipients: { scope: "store" as const, roles: ["OWNER"] as const },
};

describe("isExtensionExportedDefault", () => {
    it("accepts a well-formed export", () => {
        expect(
            isExtensionExportedDefault({
                notifications: { E: VALID_DEF },
                hooks: { "product.created": () => {} },
            }),
        ).toBe(true);
    });

    it("accepts an export with empty notifications and hooks", () => {
        // Manifest schema requires at least one hook, but the runtime
        // shape validator doesn't enforce that â€” cross-checks against
        // the manifest happen in the loader.
        expect(
            isExtensionExportedDefault({
                notifications: {},
                hooks: {},
            }),
        ).toBe(true);
    });

    it("rejects an export missing notifications", () => {
        expect(
            isExtensionExportedDefault({ hooks: {} }),
        ).toBe(false);
    });

    it("rejects a notification with invalid recipients.scope", () => {
        expect(
            isExtensionExportedDefault({
                notifications: {
                    E: {
                        ...VALID_DEF,
                        recipients: { scope: "global" },
                    },
                },
                hooks: {},
            }),
        ).toBe(false);
    });

    it("rejects an unknown hook name", () => {
        expect(
            isExtensionExportedDefault({
                notifications: {},
                hooks: { "product.flying": () => {} },
            }),
        ).toBe(false);
    });

    it("rejects a non-function hook handler", () => {
        expect(
            isExtensionExportedDefault({
                notifications: {},
                hooks: { "product.created": "not a function" },
            }),
        ).toBe(false);
    });

    it("rejects a payloadSchema without safeParse", () => {
        expect(
            isExtensionExportedDefault({
                notifications: {
                    E: {
                        ...VALID_DEF,
                        payloadSchema: {},
                    },
                },
                hooks: {},
            }),
        ).toBe(false);
    });
});