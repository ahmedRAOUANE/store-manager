"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { markAllNotificationsRead } from "@/actions/notification.actions";

export function MarkAllReadButton() {
    const t = useTranslations("notifications");
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [error, setError] = useState(false);

    const onClick = () => {
        setError(false);
        startTransition(async () => {
            try {
                await markAllNotificationsRead();
                router.refresh();
            } catch (markError) {
                console.error(
                    "mark-all-read-button > markAll > ",
                    markError,
                );
                setError(true);
            }
        });
    };

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={isPending}
            className="text-body-sm text-secondary hover:underline disabled:opacity-50"
        >
            {t("actions.markAllRead")}
        </button>
    );
}