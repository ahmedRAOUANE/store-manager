import { describe, it, expect, afterEach } from "vitest";
import { z } from "zod";
import { toCoreNotificationDefinition } from "../extensions/runner/notification-bridge";
import {
    registerExtensionNotification,
    unregisterExtensionNotification,
    lookupNotificationDefinition,
} from "../notifications/registry";
import type { NotificationPublishContext } from "../notifications/definition";
import type { ExtensionNotificationDefinition } from "../extensions/runner/types";

const sampleExt: ExtensionNotificationDefinition = {
    payloadSchema: z.object({ productName: z.string() }).strict(),
    presentation: {
        titleKey: "ext.test.LOG_CHANGED.title",
        bodyKey: "ext.test.LOG_CHANGED.body",
    },
    recipients: {
        scope: "store",
        roles: ["OWNER", "MANAGER"],
        excludeActor: true,
    },
};

const makeFakeTx = (
    memberships: Array<{ userId: string; role: string }>,
) =>
    ({
        orm: {
            public: {
                StoreMembership: {
                    where: () => ({
                        all: async () => memberships,
                    }),
                },
            },
        },
    }) as never;

const ctx = (partial: Partial<NotificationPublishContext>): NotificationPublishContext => ({
    storeId: null,
    ...partial,
});

describe("notification bridge", () => {
    afterEach(() => {
        unregisterExtensionNotification("ext.test.LOG_CHANGED");
    });

    it("namespaces the type as ext.<id>.<EVENT>", () => {
        const core = toCoreNotificationDefinition(
            "test",
            "LOG_CHANGED",
            sampleExt,
        );
        expect(core.type).toBe("ext.test.LOG_CHANGED");
        expect(core.payloadSchema).toBe(sampleExt.payloadSchema);
        expect(core.presentation).toBe(sampleExt.presentation);
    });

    it("store scope: filters by declared roles", async () => {
        const core = toCoreNotificationDefinition("test", "LOG_CHANGED", {
            ...sampleExt,
            recipients: { scope: "store", roles: ["OWNER"] },
        });

        const tx = makeFakeTx([
            { userId: "u1", role: "OWNER" },
            { userId: "u2", role: "MANAGER" },
            { userId: "u3", role: "STAFF" },
        ]);

        const recipients = await core.resolveRecipients(
            tx,
            ctx({ storeId: "s1", actorId: "u1" }),
            { productName: "x" },
        );
        expect(recipients).toEqual(["u1"]);
    });

    it("store scope: excludes the actor when excludeActor is true", async () => {
        const core = toCoreNotificationDefinition(
            "test",
            "LOG_CHANGED",
            sampleExt,
        );

        const tx = makeFakeTx([
            { userId: "u1", role: "OWNER" },
            { userId: "u2", role: "OWNER" },
        ]);

        const recipients = await core.resolveRecipients(
            tx,
            ctx({ storeId: "s1", actorId: "u1" }),
            { productName: "x" },
        );
        expect(recipients).toEqual(["u2"]);
    });

    it("store scope: includes the actor when excludeActor is absent", async () => {
        const core = toCoreNotificationDefinition("test", "LOG_CHANGED", {
            ...sampleExt,
            recipients: { scope: "store", roles: ["OWNER"] },
        });

        const tx = makeFakeTx([{ userId: "u1", role: "OWNER" }]);

        const recipients = await core.resolveRecipients(
            tx,
            ctx({ storeId: "s1", actorId: "u1" }),
            { productName: "x" },
        );
        expect(recipients).toEqual(["u1"]);
    });

    it("store scope: no roles means all ACTIVE members", async () => {
        const core = toCoreNotificationDefinition("test", "LOG_CHANGED", {
            ...sampleExt,
            recipients: { scope: "store" },
        });

        const tx = makeFakeTx([
            { userId: "u1", role: "OWNER" },
            { userId: "u2", role: "MANAGER" },
            { userId: "u3", role: "STAFF" },
        ]);

        const recipients = await core.resolveRecipients(
            tx,
            ctx({ storeId: "s1" }),
            { productName: "x" },
        );
        expect(recipients).toEqual(["u1", "u2", "u3"]);
    });

    it("store scope: throws when ctx.storeId is null", async () => {
        const core = toCoreNotificationDefinition(
            "test",
            "LOG_CHANGED",
            sampleExt,
        );

        await expect(
            core.resolveRecipients(
                makeFakeTx([]),
                ctx({ storeId: null, actorId: "u1" }),
                { productName: "x" },
            ),
        ).rejects.toThrow(/requires a store context/);
    });

    it("user scope: returns the actor", async () => {
        const core = toCoreNotificationDefinition("test", "LOG_CHANGED", {
            ...sampleExt,
            recipients: { scope: "user" },
        });

        const recipients = await core.resolveRecipients(
            makeFakeTx([]),
            ctx({ actorId: "u9" }),
            { productName: "x" },
        );
        expect(recipients).toEqual(["u9"]);
    });

    it("user scope: throws when ctx.actorId is missing", async () => {
        const core = toCoreNotificationDefinition("test", "LOG_CHANGED", {
            ...sampleExt,
            recipients: { scope: "user" },
        });

        await expect(
            core.resolveRecipients(makeFakeTx([]), ctx({}), {
                productName: "x",
            }),
        ).rejects.toThrow(/requires ctx\.actorId/);
    });

    it("round-trips through the runtime registry", () => {
        const core = toCoreNotificationDefinition(
            "test",
            "LOG_CHANGED",
            sampleExt,
        );
        registerExtensionNotification(core);

        expect(lookupNotificationDefinition("ext.test.LOG_CHANGED")).toBe(
            core,
        );

        unregisterExtensionNotification("ext.test.LOG_CHANGED");
        expect(
            lookupNotificationDefinition("ext.test.LOG_CHANGED"),
        ).toBeNull();
    });
});