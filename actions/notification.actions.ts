"use server";

import { withAuth } from "@/utils/auth";
import {
    getMyNotificationsService,
    getMyUnreadNotificationCountService,
    markMyNotificationReadService,
    markAllMyNotificationsReadService,
    markMyNotificationUnreadService,
} from "@/services/notification.services";

/**
 * Client-safe representation of a notification.
 *
 * `Temporal.Instant` cannot cross the RSC boundary, so timestamps are
 * serialized to ISO strings. Everything else is passed through unchanged.
 *
 * The `type` field is a raw string: it may be a core type (validate with
 * `isCoreNotificationType` from `@/notifications/registry`) or an
 * extension type. `payload` is opaque to the transport layer — the
 * consumer narrows it against the appropriate payload schema.
 */
export interface SerializedNotification {
    id: string;
    type: string;
    payload: unknown;
    storeId: string | null;
    readAt: string | null;
    createdAt: string;
}

type NotificationRow = Awaited<
    ReturnType<typeof getMyNotificationsService>
>[number];

const serializeNotification = (
    notification: NotificationRow,
): SerializedNotification => ({
    id: notification.id,
    type: notification.type,
    payload: notification.payload,
    storeId: notification.storeId,
    readAt: notification.readAt ? notification.readAt.toString() : null,
    createdAt: notification.createdAt.toString(),
});

/**
 * Return one page of the authenticated user's notifications, newest first.
 *
 * `recipientId` is taken from the authenticated session, never from the
 * caller. `page` is 1-based; `pageSize` is capped at 100 by the service.
 */
export const getMyNotifications = withAuth(
    async (
        user,
        page: number = 1,
        pageSize: number = 20,
    ): Promise<SerializedNotification[]> => {
        const notifications = await getMyNotificationsService(
            user.id,
            page,
            pageSize,
        );

        return notifications.map(serializeNotification);
    },
);

/**
 * Return the count of unread notifications for the authenticated user.
 */
export const getMyUnreadNotificationCount = withAuth(
    async (user): Promise<number> =>
        getMyUnreadNotificationCountService(user.id),
);

/**
 * Mark one of the authenticated user's notifications as read.
 *
 * Returns false if the notification does not belong to the user, does
 * not exist, or was already read.
 */
export const markNotificationRead = withAuth(
    async (user, notificationId: string): Promise<boolean> =>
        markMyNotificationReadService(user.id, notificationId),
);

/**
 * Mark all unread notifications belonging to the authenticated user as
 * read. Returns the number of affected rows.
 */
export const markAllNotificationsRead = withAuth(
    async (user): Promise<number> =>
        markAllMyNotificationsReadService(user.id),
);

/**
 * Mark one of the authenticated user's notifications as unread.
 *
 * Returns false if the notification does not belong to the user or does
 * not exist.
 */
export const markNotificationUnread = withAuth(
    async (user, notificationId: string): Promise<boolean> =>
        markMyNotificationUnreadService(user.id, notificationId),
);