"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import {
    getMyNotifications,
    getMyUnreadNotificationCount,
    markNotificationRead,
    type SerializedNotification,
} from "@/actions/notification.actions";
import { NotificationList } from "./notification-list";

const PREVIEW_SIZE = 5;

interface NotificationBellProps {
    userId: string;
    initialUnreadCount: number;
}

export function NotificationBell({
    initialUnreadCount,
}: NotificationBellProps) {
    const t = useTranslations("notifications");
    const accessibilityT = useTranslations("accessibility");

    const [open, setOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
    const [notifications, setNotifications] = useState<
        SerializedNotification[] | null
    >(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside or Escape.
    useEffect(() => {
        if (!open) return;

        const handleMouseDown = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", handleMouseDown);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("mousedown", handleMouseDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [open]);

    const load = async () => {
        setLoading(true);
        setError(false);

        try {
            const [items, count] = await Promise.all([
                getMyNotifications(1, PREVIEW_SIZE),
                getMyUnreadNotificationCount(),
            ]);
            setNotifications(items);
            setUnreadCount(count);
        } catch (loadError) {
            console.error(
                "notification-bell > load > ",
                loadError,
            );
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    const toggle = () => {
        const next = !open;
        setOpen(next);

        if (next && notifications === null) {
            void load();
        }
    };

    const handleItemClick = async (
        notification: SerializedNotification,
    ) => {
        // Optimistically mark as read in place.
        if (notification.readAt === null) {
            setNotifications((current) =>
                current
                    ? current.map((n) =>
                        n.id === notification.id
                            ? {
                                ...n,
                                readAt: new Date().toISOString(),
                            }
                            : n,
                    )
                    : current,
            );
            setUnreadCount((current) => Math.max(0, current - 1));

            try {
                await markNotificationRead(notification.id);
            } catch (markError) {
                console.error(
                    "notification-bell > markRead > ",
                    markError,
                );
            }
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={toggle}
                className="relative inline-flex size-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high"
                aria-label={accessibilityT("notifications")}
                aria-expanded={open}
                aria-haspopup="dialog"
            >
                <Bell className="size-4" />
                {unreadCount > 0 && (
                    <span
                        aria-hidden
                        className="absolute inset-e-1 top-1 flex min-w-4 h-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-on-error tabular-nums"
                    >
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div
                    role="dialog"
                    aria-label={t("title")}
                    className="absolute -inset-e-10 top-full mt-2 w-[calc(100vw-2rem)] max-w-sm sm:w-96 rounded-lg border border-outline-variant bg-surface-lowest shadow-overlay z-50 overflow-hidden"
                >
                    <header className="flex items-center justify-between px-4 py-2 border-b border-outline-variant">
                        <h2 className="text-title-md text-on-surface">
                            {t("title")}
                        </h2>
                    </header>

                    {loading && (
                        <p className="px-4 py-6 text-center text-body-sm text-on-surface-variant">
                            {t("loading")}
                        </p>
                    )}

                    {!loading && error && (
                        <p className="px-4 py-6 text-center text-body-sm text-danger">
                            {t("errors.loadFailed")}
                        </p>
                    )}

                    {!loading && !error && notifications && (
                        <NotificationList
                            notifications={notifications}
                            onItemClick={handleItemClick}
                        />
                    )}

                    <footer className="border-t border-outline-variant">
                        <Link
                            href={`/notifications`}
                            className="block text-center px-4 py-2 text-body-sm text-secondary hover:bg-surface-container"
                            onClick={() => setOpen(false)}
                        >
                            {t("actions.viewAll")}
                        </Link>
                    </footer>
                </div>
            )}
        </div>
    );
}