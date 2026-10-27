import { describe, it, expect } from "vitest";
import { models } from "../prisma/db";
import {
    getMyNotificationsService,
    getMyUnreadNotificationCountService,
    markMyNotificationReadService,
    markAllMyNotificationsReadService,
    markMyNotificationUnreadService,
} from "../services/notification.services";
import { Temporal } from "temporal-polyfill";
import "temporal-polyfill/full/global";

describe("notification read-side services", () => {
    /**
     * Each test creates its own recipient so count assertions are not
     * affected by notifications left behind by other test files.
     */
    const createRecipient = async () => {
        return models.User.create({
            kindeId: `test-notifications-${crypto.randomUUID()}`,
        });
    };

    const createNotification = async (
        recipientId: string,
        overrides: {
            type?: string;
            payload?: Record<string, unknown>;
            storeId?: string | null;
            readAt?: Temporal.Instant | null;
        } = {},
    ) => {
        return models.Notification.create({
            recipientId,
            storeId: overrides.storeId ?? null,
            type: overrides.type ?? "STORE_ACTIVATED",
            payload: JSON.stringify(overrides.payload) ?? JSON.stringify({ storeName: "Test store" }),
            readAt: overrides.readAt ?? null,
        });
    };

    const fetchNotification = async (id: string) => {
        return models.Notification.where({ id }).first();
    };

    // ──────────────────────────────────────────────────────────
    // getMyNotificationsService
    // ──────────────────────────────────────────────────────────

    describe("getMyNotificationsService", () => {
        it(
            "returns only the caller's notifications",
            { tags: ["get", "notification"] },
            async () => {
                const recipient = await createRecipient();
                const other = await createRecipient();

                await createNotification(recipient.id);
                await createNotification(recipient.id);
                await createNotification(other.id);

                const result = await getMyNotificationsService(
                    recipient.id,
                );

                expect(result).toHaveLength(2);

                for (const notification of result) {
                    expect(notification.recipientId).toBe(recipient.id);
                }
            },
        );

        it(
            "paginates correctly",
            { tags: ["get", "notification"] },
            async () => {
                const recipient = await createRecipient();

                for (let i = 0; i < 5; i++) {
                    await createNotification(recipient.id);
                }

                const page1 = await getMyNotificationsService(
                    recipient.id,
                    1,
                    2,
                );
                const page2 = await getMyNotificationsService(
                    recipient.id,
                    2,
                    2,
                );
                const page3 = await getMyNotificationsService(
                    recipient.id,
                    3,
                    2,
                );
                const page4 = await getMyNotificationsService(
                    recipient.id,
                    4,
                    2,
                );

                expect(page1).toHaveLength(2);
                expect(page2).toHaveLength(2);
                expect(page3).toHaveLength(1);
                expect(page4).toHaveLength(0);

                const seen = new Set<string>([
                    ...page1.map((n: { id: string }) => n.id),
                    ...page2.map((n: { id: string }) => n.id),
                    ...page3.map((n: { id: string }) => n.id),
                ]);

                expect(seen.size).toBe(5);
            },
        );

        it(
            "returns an empty array when the caller has no notifications",
            { tags: ["get", "notification"] },
            async () => {
                const recipient = await createRecipient();

                const result = await getMyNotificationsService(
                    recipient.id,
                );

                expect(result).toEqual([]);
            },
        );

        it(
            "rejects an invalid recipient id",
            { tags: ["get", "notification"] },
            async () => {
                await expect(
                    getMyNotificationsService("not-a-uuid"),
                ).rejects.toThrow("Invalid notification recipient ID");
            },
        );

        it(
            "rejects an invalid page",
            { tags: ["get", "notification"] },
            async () => {
                const recipient = await createRecipient();

                await expect(
                    getMyNotificationsService(recipient.id, 0),
                ).rejects.toThrow("Invalid notification pagination");

                await expect(
                    getMyNotificationsService(recipient.id, 1.5),
                ).rejects.toThrow("Invalid notification pagination");
            },
        );

        it(
            "rejects an invalid page size",
            { tags: ["get", "notification"] },
            async () => {
                const recipient = await createRecipient();

                await expect(
                    getMyNotificationsService(recipient.id, 1, 0),
                ).rejects.toThrow("Invalid notification pagination");

                await expect(
                    getMyNotificationsService(recipient.id, 1, 101),
                ).rejects.toThrow("Invalid notification pagination");
            },
        );
    });

    // ──────────────────────────────────────────────────────────
    // getMyUnreadNotificationCountService
    // ──────────────────────────────────────────────────────────

    describe("getMyUnreadNotificationCountService", () => {
        it(
            "returns the count of unread notifications only",
            { tags: ["get", "notification"] },
            async () => {
                const recipient = await createRecipient();

                await createNotification(recipient.id);
                await createNotification(recipient.id);
                await createNotification(recipient.id, {
                    readAt: Temporal.Instant.fromEpochMilliseconds(
                        Date.now(),
                    ),
                });

                const count =
                    await getMyUnreadNotificationCountService(
                        recipient.id,
                    );

                expect(count).toBe(2);
            },
        );

        it(
            "returns 0 when there are no unread notifications",
            { tags: ["get", "notification"] },
            async () => {
                const recipient = await createRecipient();

                await createNotification(recipient.id, {
                    readAt: Temporal.Instant.fromEpochMilliseconds(
                        Date.now(),
                    ),
                });

                const count =
                    await getMyUnreadNotificationCountService(
                        recipient.id,
                    );

                expect(count).toBe(0);
            },
        );

        it(
            "returns 0 for a recipient with no notifications at all",
            { tags: ["get", "notification"] },
            async () => {
                const recipient = await createRecipient();

                const count =
                    await getMyUnreadNotificationCountService(
                        recipient.id,
                    );

                expect(count).toBe(0);
            },
        );

        it(
            "does not count other recipients' unread notifications",
            { tags: ["get", "notification"] },
            async () => {
                const recipient = await createRecipient();
                const other = await createRecipient();

                await createNotification(other.id);
                await createNotification(other.id);
                await createNotification(other.id);

                const count =
                    await getMyUnreadNotificationCountService(
                        recipient.id,
                    );

                expect(count).toBe(0);
            },
        );

        it(
            "rejects an invalid recipient id",
            { tags: ["get", "notification"] },
            async () => {
                await expect(
                    getMyUnreadNotificationCountService("not-a-uuid"),
                ).rejects.toThrow("Invalid notification recipient ID");
            },
        );
    });

    // ──────────────────────────────────────────────────────────
    // markMyNotificationReadService
    // ──────────────────────────────────────────────────────────

    describe("markMyNotificationReadService", () => {
        it(
            "marks an unread notification as read and returns true",
            { tags: ["update", "notification"] },
            async () => {
                const recipient = await createRecipient();
                const notification = await createNotification(
                    recipient.id,
                );

                const result = await markMyNotificationReadService(
                    recipient.id,
                    notification.id,
                );

                expect(result).toBe(true);

                const after = await fetchNotification(notification.id);
                expect(after?.readAt).not.toBeNull();
            },
        );

        it(
            "returns false when the notification is already read",
            { tags: ["update", "notification"] },
            async () => {
                const recipient = await createRecipient();
                const notification = await createNotification(
                    recipient.id,
                    {
                        readAt: Temporal.Instant.fromEpochMilliseconds(
                            Date.now(),
                        ),
                    },
                );

                const result = await markMyNotificationReadService(
                    recipient.id,
                    notification.id,
                );

                expect(result).toBe(false);
            },
        );

        it(
            "returns false when the notification belongs to another user",
            { tags: ["update", "notification"] },
            async () => {
                const recipient = await createRecipient();
                const other = await createRecipient();

                const notification = await createNotification(other.id);

                const result = await markMyNotificationReadService(
                    recipient.id,
                    notification.id,
                );

                expect(result).toBe(false);

                const after = await fetchNotification(notification.id);
                expect(after?.readAt).toBeNull();
            },
        );

        it(
            "returns false when the notification does not exist",
            { tags: ["update", "notification"] },
            async () => {
                const recipient = await createRecipient();

                const result = await markMyNotificationReadService(
                    recipient.id,
                    crypto.randomUUID(),
                );

                expect(result).toBe(false);
            },
        );

        it(
            "rejects invalid notification ids",
            { tags: ["update", "notification"] },
            async () => {
                const recipient = await createRecipient();

                await expect(
                    markMyNotificationReadService(
                        "not-a-uuid",
                        crypto.randomUUID(),
                    ),
                ).rejects.toThrow("Invalid notification ID");

                await expect(
                    markMyNotificationReadService(
                        recipient.id,
                        "not-a-uuid",
                    ),
                ).rejects.toThrow("Invalid notification ID");
            },
        );
    });

    // ──────────────────────────────────────────────────────────
    // markAllMyNotificationsReadService
    // ──────────────────────────────────────────────────────────

    describe("markAllMyNotificationsReadService", () => {
        it(
            "marks all unread notifications and returns the affected count",
            { tags: ["update", "notification"] },
            async () => {
                const recipient = await createRecipient();

                await createNotification(recipient.id);
                await createNotification(recipient.id);
                await createNotification(recipient.id, {
                    readAt: Temporal.Instant.fromEpochMilliseconds(
                        Date.now(),
                    ),
                });

                const count =
                    await markAllMyNotificationsReadService(recipient.id);

                expect(count).toBe(2);

                const remainingUnread =
                    await getMyUnreadNotificationCountService(
                        recipient.id,
                    );

                expect(remainingUnread).toBe(0);
            },
        );

        it(
            "returns 0 when there are no unread notifications",
            { tags: ["update", "notification"] },
            async () => {
                const recipient = await createRecipient();

                const count =
                    await markAllMyNotificationsReadService(recipient.id);

                expect(count).toBe(0);
            },
        );

        it(
            "does not affect other recipients' notifications",
            { tags: ["update", "notification"] },
            async () => {
                const recipient = await createRecipient();
                const other = await createRecipient();

                await createNotification(recipient.id);
                await createNotification(other.id);

                await markAllMyNotificationsReadService(recipient.id);

                const otherUnread =
                    await getMyUnreadNotificationCountService(other.id);

                expect(otherUnread).toBe(1);
            },
        );

        it(
            "rejects an invalid recipient id",
            { tags: ["update", "notification"] },
            async () => {
                await expect(
                    markAllMyNotificationsReadService("not-a-uuid"),
                ).rejects.toThrow("Invalid notification recipient ID");
            },
        );
    });

    // ──────────────────────────────────────────────────────────
    // markMyNotificationUnreadService
    // ──────────────────────────────────────────────────────────

    describe("markMyNotificationUnreadService", () => {
        it(
            "marks a read notification as unread and returns true",
            { tags: ["update", "notification"] },
            async () => {
                const recipient = await createRecipient();
                const notification = await createNotification(
                    recipient.id,
                    {
                        readAt: Temporal.Instant.fromEpochMilliseconds(
                            Date.now(),
                        ),
                    },
                );

                const result = await markMyNotificationUnreadService(
                    recipient.id,
                    notification.id,
                );

                expect(result).toBe(true);

                const after = await fetchNotification(notification.id);
                expect(after?.readAt).toBeNull();
            },
        );

        it(
            "returns false when the notification belongs to another user",
            { tags: ["update", "notification"] },
            async () => {
                const recipient = await createRecipient();
                const other = await createRecipient();

                const notification = await createNotification(other.id, {
                    readAt: Temporal.Instant.fromEpochMilliseconds(
                        Date.now(),
                    ),
                });

                const result = await markMyNotificationUnreadService(
                    recipient.id,
                    notification.id,
                );

                expect(result).toBe(false);

                const after = await fetchNotification(notification.id);
                expect(after?.readAt).not.toBeNull();
            },
        );

        it(
            "returns false when the notification does not exist",
            { tags: ["update", "notification"] },
            async () => {
                const recipient = await createRecipient();

                const result = await markMyNotificationUnreadService(
                    recipient.id,
                    crypto.randomUUID(),
                );

                expect(result).toBe(false);
            },
        );

        it(
            "rejects invalid notification ids",
            { tags: ["update", "notification"] },
            async () => {
                const recipient = await createRecipient();

                await expect(
                    markMyNotificationUnreadService(
                        "not-a-uuid",
                        crypto.randomUUID(),
                    ),
                ).rejects.toThrow("Invalid notification ID");

                await expect(
                    markMyNotificationUnreadService(
                        recipient.id,
                        "not-a-uuid",
                    ),
                ).rejects.toThrow("Invalid notification ID");
            },
        );
    });
});