"use client";

import type { SerializedNotification } from "@/actions/notification.actions";
import { lookupNotificationDefinition } from "@/notifications/registry";
import { useFormatter, useTranslations } from "next-intl";
import { cn } from "@/utils/jsx-classes";

interface NotificationItemProps {
    notification: SerializedNotification;
    onClick?: (notification: SerializedNotification) => void;
}

/**
 * Render one notification row.
 *
 * Uses `lookupNotificationDefinition` to resolve the stored type ID to
 * a definition — either core or extension-provided. Unknown types
 * (unregistered extension types, historical rows from uninstalled
 * extensions, or tampered data) fall back to a neutral row showing the
 * raw type ID.
 */
export function NotificationItem({
    notification,
    onClick,
}: NotificationItemProps) {
    const t = useTranslations() as (
        key: string,
        values?: Record<string, unknown>,
    ) => string;
    const format = useFormatter();

    const isRead = notification.readAt !== null;

    let title = notification.type;
    let body = "";

    const definition = lookupNotificationDefinition(notification.type);

    if (definition) {
        const parsed = definition.payloadSchema.safeParse(
            notification.payload,
        );

        if (parsed.success) {
            title = t(definition.presentation.titleKey);
            body = t(definition.presentation.bodyKey, parsed.data);
        }
    }

    const formattedDate = format.dateTime(
        new Date(notification.createdAt),
        { dateStyle: "medium", timeStyle: "short" },
    );

    return (
        <button
            type="button"
            onClick={() => onClick?.(notification)}
            className={cn(
                "w-full text-start px-4 py-3 flex gap-3 transition-colors",
                "hover:bg-surface-container-high focus-visible:bg-surface-container-high",
                !isRead && "bg-surface-container",
            )}
        >
            <span
                aria-hidden
                className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    isRead ? "bg-transparent" : "bg-primary",
                )}
            />
            <span className="flex-1 min-w-0">
                <span className="block text-title-md text-on-surface truncate">
                    {title}
                </span>
                {body && (
                    <span className="block text-body-sm text-on-surface-variant mt-0.5 line-clamp-2">
                        {body}
                    </span>
                )}
                <span className="block text-body-sm text-on-surface-variant mt-1">
                    {formattedDate}
                </span>
            </span>
        </button>
    );
}