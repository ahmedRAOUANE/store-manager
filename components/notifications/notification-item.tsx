"use client";

import type { SerializedNotification } from "@/actions/notification.actions";
import {
    CORE_NOTIFICATION_REGISTRY,
    isCoreNotificationType,
} from "@/notifications/registry";
import { useFormatter, useTranslations } from "next-intl";
import { cn } from "@/utils/jsx-classes";

interface NotificationItemProps {
    notification: SerializedNotification;
    onClick?: (notification: SerializedNotification) => void;
}

/**
 * Render one notification row.
 *
 * The `type` field is narrowed against the core registry; if it is a
 * core type, the payload is parsed against that definition's schema and
 * the presentation keys are resolved through next-intl. Unknown or
 * extension types fall back to a neutral row showing the raw type.
 *
 * Translation keys are dynamically composed by `derivePresentation`, so
 * they are not part of the compile-time message catalog. The cast below
 * reflects that; if a future version of next-intl supports template
 * literal keys, the cast can be removed.
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

    if (isCoreNotificationType(notification.type)) {
        const definition = CORE_NOTIFICATION_REGISTRY[notification.type];
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