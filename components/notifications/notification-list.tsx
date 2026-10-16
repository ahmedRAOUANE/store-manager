"use client";

import type { SerializedNotification } from "@/actions/notification.actions";
import { useTranslations } from "next-intl";
import { NotificationItem } from "./notification-item";

interface NotificationListProps {
    notifications: SerializedNotification[];
    onItemClick?: (notification: SerializedNotification) => void;
    className?: string;
}

export function NotificationList({
    notifications,
    onItemClick,
    className,
}: NotificationListProps) {
    const t = useTranslations("notifications");

    if (notifications.length === 0) {
        return (
            <div className={className}>
                <div className="px-4 py-8 text-center">
                    <p className="text-title-md text-on-surface">
                        {t("empty.title")}
                    </p>
                    <p className="text-body-sm text-on-surface-variant mt-1">
                        {t("empty.description")}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <ul className={className}>
            {notifications.map((notification) => (
                <li key={notification.id}>
                    <NotificationItem
                        notification={notification}
                        onClick={onItemClick}
                    />
                </li>
            ))}
        </ul>
    );
}