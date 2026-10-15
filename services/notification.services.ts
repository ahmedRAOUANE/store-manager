
import { models, TransactionClient } from "@/prisma/db";
import { NotificationEventSchema } from "@/zod/notification.schema";
import { isUuid } from "@/utils/uuid";

/**
 * Insert one notification inside the transaction that performed
 * the corresponding business mutation.
 *
 * The recipient ID must come from trusted server-side authorization
 * or recipient resolution, never directly from client input.
 *
 * Database errors intentionally propagate so the surrounding
 * transaction can roll back.
 */
export const createNotificationInTransaction = async (
    tx: TransactionClient,
    recipientId: string,
    storeId: string | null,
    input: unknown,
) => {
    if (!isUuid(recipientId)) {
        throw new Error("Invalid notification recipient ID");
    }

    if (storeId !== null && !isUuid(storeId)) {
        throw new Error("Invalid notification store ID");
    }

    const parsedEvent = NotificationEventSchema.safeParse(input);

    if (!parsedEvent.success) {
        throw new Error("Invalid notification event payload");
    }

    return tx.orm.public.Notification.create({
        recipientId,
        storeId,
        type: parsedEvent.data.type,
        payload: parsedEvent.data.payload,
    });
};


/**
 * Resolve the recipients for PRODUCT_LOW_STOCK notifications.
 *
 * This function deliberately excludes STAFF and only considers
 * active memberships. It must be called inside the same transaction
 * as the stock mutation and notification inserts.
 */
export const getLowStockRecipientIdsInTransaction = async (
    tx: TransactionClient,
    storeId: string,
): Promise<string[]> => {
    if (!isUuid(storeId)) {
        throw new Error("Invalid notification store ID");
    }

    const memberships = await tx.orm.public.StoreMembership
        .where({
            storeId,
            status: "ACTIVE",
        })
        .all();

    const recipientIds = memberships
        .filter(
            (membership) =>
                membership.role === "OWNER" ||
                membership.role === "MANAGER",
        )
        .map((membership) => membership.userId);

    // Defensive deduplication in case recipient resolution changes later.
    return [...new Set(recipientIds)];
};

/**
 * Create the same event for several trusted recipients.
 *
 * Recipient IDs must be resolved by server-side code, not supplied
 * directly by a request body.
 */
export const createNotificationsForRecipientsInTransaction = async (
    tx: TransactionClient,
    recipientIds: string[],
    storeId: string | null,
    input: unknown,
) => {
    const uniqueRecipientIds = [...new Set(recipientIds)];

    const createdNotifications = [];

    for (const recipientId of uniqueRecipientIds) {
        const notification = await createNotificationInTransaction(
            tx,
            recipientId,
            storeId,
            input,
        );

        createdNotifications.push(notification);
    }

    return createdNotifications;
};

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