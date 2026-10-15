
"use server";

import { withAuth } from "@/utils/auth";
import {
    getMyNotificationsService,
    getMyUnreadNotificationCountService,
    markMyNotificationReadService,
    markMyNotificationUnreadService,
    markAllMyNotificationsReadService,
} from "@/services/notification.services";
import { UuidSchema } from "@/zod/general.schema";
import { z } from "zod";

const NotificationPageSchema = z.object({
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(20),
});

const NotificationIdSchema = UuidSchema;

const invalidInput = {
    ok: false as const,
    message: "Invalid notification input",
};

/**
 * Fetch a page of the signed-in user's notifications.
 * Use pageSize=5 for the recent-notifications dropdown.
 */
export const getMyNotifications = withAuth(
    async (user, page: unknown = 1, pageSize: unknown = 20) => {
        const parsed = NotificationPageSchema.safeParse({
            page,
            pageSize,
        });

        if (!parsed.success) return invalidInput;

        return {
            ok: true as const,
            data: await getMyNotificationsService(
                user.id,
                parsed.data.page,
                parsed.data.pageSize,
            ),
        };
    },
);

/**
 * Fetch the signed-in user's unread notification count.
 */
export const getMyUnreadNotificationCount = withAuth(
    async (user) => ({
        ok: true as const,
        count: await getMyUnreadNotificationCountService(user.id),
    }),
);

/**
 * Mark one of the signed-in user's notifications as read.
 */
export const markMyNotificationRead = withAuth(
    async (user, notificationId: unknown) => {
        const parsedId = NotificationIdSchema.safeParse(notificationId);

        if (!parsedId.success) return invalidInput;

        const updated = await markMyNotificationReadService(
            user.id,
            parsedId.data,
        );

        if (!updated) {
            return {
                ok: false as const,
                message: "Notification not found or already read",
            };
        }

        return { ok: true as const };
    },
);

/**
 * Mark one of the signed-in user's notifications as unread.
 */
export const markMyNotificationUnread = withAuth(
    async (user, notificationId: unknown) => {
        const parsedId = NotificationIdSchema.safeParse(notificationId);

        if (!parsedId.success) return invalidInput;

        const updated = await markMyNotificationUnreadService(
            user.id,
            parsedId.data,
        );

        if (!updated) {
            return {
                ok: false as const,
                message: "Notification not found",
            };
        }

        return { ok: true as const };
    },
);

/**
 * Mark all of the signed-in user's notifications as read.
 */
export const markAllMyNotificationsRead = withAuth(
    async (user) => {
        const updatedCount =
            await markAllMyNotificationsReadService(user.id);

        return {
            ok: true as const,
            updatedCount,
        };
    },
);

