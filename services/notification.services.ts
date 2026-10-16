import { models } from "@/prisma/db";
import { isUuid } from "@/utils/uuid";

/**
 * Return one page of notifications belonging to the authenticated user.
 *
 * The caller must obtain recipientId from the trusted server-side
 * authentication context, never from an untrusted request body.
 */
export const getMyNotificationsService = async (
    recipientId: string,
    page = 1,
    pageSize = 20,
) => {
    if (!isUuid(recipientId)) {
        throw new Error("Invalid notification recipient ID");
    }

    if (
        !Number.isInteger(page) ||
        page < 1 ||
        !Number.isInteger(pageSize) ||
        pageSize < 1 ||
        pageSize > 100
    ) {
        throw new Error("Invalid notification pagination");
    }

    const notifications = await models.Notification
        .where({ recipientId })
        .orderBy([
            (notification) => notification.createdAt.desc(),
            (notification) => notification.id.desc(),
        ])
        .limit(pageSize)
        .offset((page - 1) * pageSize)
        .all();

    return notifications;
};

/**
 * Return the unread notification count for the authenticated user.
 */
export const getMyUnreadNotificationCountService = async (
    recipientId: string,
): Promise<number> => {
    if (!isUuid(recipientId)) {
        throw new Error("Invalid notification recipient ID");
    }

    const result = await models.Notification
        .where({
            recipientId,
            readAt: null,
        })
        .aggregate((aggregate) => ({
            count: aggregate.count(),
        }));

    return result.count;
};

/**
 * Mark one notification as read, but only if it belongs to the user.
 *
 * Returns false when the notification is absent, belongs to someone
 * else, or was already read.
 */
export const markMyNotificationReadService = async (
    recipientId: string,
    notificationId: string,
): Promise<boolean> => {
    if (!isUuid(recipientId) || !isUuid(notificationId)) {
        throw new Error("Invalid notification ID");
    }

    const updated = await models.Notification
        .where({
            id: notificationId,
            recipientId,
            readAt: null,
        })
        .update({
            readAt: Temporal.Instant.fromEpochMilliseconds(Date.now()),
        });

    return updated !== null;
};

/**
 * Mark all unread notifications belonging to the user as read.
 */
export const markAllMyNotificationsReadService = async (
    recipientId: string,
): Promise<number> => {
    if (!isUuid(recipientId)) {
        throw new Error("Invalid notification recipient ID");
    }

    return models.Notification
        .where({
            recipientId,
            readAt: null,
        })
        .updateAndCount({
            // Convert current time to a Temporal.Instant explicitly
            readAt: Temporal.Instant.fromEpochMilliseconds(Date.now()),
        });
};

/**
 * Mark one of the recipient's notifications as unread.
 *
 * The recipient scope is enforced in the database query.
 * Returns false if the notification does not belong to the recipient
 * or does not exist.
 */
export const markMyNotificationUnreadService = async (
    recipientId: string,
    notificationId: string,
): Promise<boolean> => {
    if (!isUuid(recipientId) || !isUuid(notificationId)) {
        throw new Error("Invalid notification ID");
    }

    const updated = await models.Notification
        .where({
            id: notificationId,
            recipientId,
        })
        .update({
            readAt: null,
        });

    return updated !== null;
};