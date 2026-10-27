import { describe, it, expect, beforeEach } from "vitest";
import { z } from "zod";
import {
    CORE_NOTIFICATION_REGISTRY,
    isCoreNotificationType,
    lookupNotificationDefinition,
    registerExtensionNotification,
    unregisterExtensionNotification,
} from "../notifications/registry";
import { defineNotification } from "../notifications/definition";

const sampleExtensionDefinition = defineNotification({
    type: "ext.test.EVENT",
    payloadSchema: z.object({ message: z.string() }).strict(),
    presentation: {
        titleKey: "notifications.ext.test.EVENT.title",
        bodyKey: "notifications.ext.test.EVENT.body",
    },
    resolveRecipients: async () => [],
});

describe("notification registry", () => {
    beforeEach(() => {
        // Ensure each test starts clean
        unregisterExtensionNotification("ext.test.EVENT");
    });

    it("isCoreNotificationType recognizes core types", () => {
        expect(isCoreNotificationType("STORE_ACTIVATED")).toBe(true);
        expect(isCoreNotificationType("PRODUCT_LOW_STOCK")).toBe(true);
        expect(isCoreNotificationType("ext.test.EVENT")).toBe(false);
        expect(isCoreNotificationType("UNKNOWN_TYPE")).toBe(false);
    });

    it("lookupNotificationDefinition returns core definitions", () => {
        const definition = lookupNotificationDefinition("STORE_ACTIVATED");
        expect(definition).toBe(CORE_NOTIFICATION_REGISTRY.STORE_ACTIVATED);
    });

    it("lookupNotificationDefinition returns null for unknown types", () => {
        expect(lookupNotificationDefinition("UNKNOWN_TYPE")).toBeNull();
        expect(lookupNotificationDefinition("ext.unregistered.EVENT")).toBeNull();
    });

    it("registers and looks up extension definitions", () => {
        expect(lookupNotificationDefinition("ext.test.EVENT")).toBeNull();

        registerExtensionNotification(sampleExtensionDefinition);

        const fetched = lookupNotificationDefinition("ext.test.EVENT");
        expect(fetched).toBe(sampleExtensionDefinition);
        expect(fetched?.type).toBe("ext.test.EVENT");
    });

    // it("rejects re-registering the same type", () => {
    //     registerExtensionNotification(sampleExtensionDefinition);
    //     expect(() =>
    //         registerExtensionNotification(sampleExtensionDefinition),
    //     ).toThrow(/already registered/);
    // });
    it("re-registering the same type is idempotent (no-op)", () => {
        registerExtensionNotification(sampleExtensionDefinition);

        expect(() =>
            registerExtensionNotification(sampleExtensionDefinition),
        ).not.toThrow();

        // Still registered with the original definition.
        expect(lookupNotificationDefinition("ext.test.EVENT")).toBe(
            sampleExtensionDefinition,
        );
    });

    it("rejects registering a type that collides with a core type", () => {
        const colliding = defineNotification({
            type: "STORE_ACTIVATED",
            payloadSchema: z.object({}).strict(),
            presentation: {
                titleKey: "x.title",
                bodyKey: "x.body",
            },
            resolveRecipients: async () => [],
        });

        expect(() => registerExtensionNotification(colliding)).toThrow(
            /core type ID/,
        );
    });

    it("unregisters extension definitions", () => {
        registerExtensionNotification(sampleExtensionDefinition);
        expect(lookupNotificationDefinition("ext.test.EVENT")).not.toBeNull();

        unregisterExtensionNotification("ext.test.EVENT");
        expect(lookupNotificationDefinition("ext.test.EVENT")).toBeNull();
    });

    it("unregistering an unregistered type is a silent no-op", () => {
        expect(() =>
            unregisterExtensionNotification("ext.never.registered"),
        ).not.toThrow();
    });

    it("rejects unregistering a core type", () => {
        expect(() =>
            unregisterExtensionNotification("STORE_ACTIVATED"),
        ).toThrow(/core notification type/);
    });
});