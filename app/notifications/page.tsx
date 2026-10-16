import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/utils/auth";
import { AppError } from "@/errors/base.error";
import { getMyNotifications } from "@/actions/notification.actions";
import { NotificationList } from "@/components/notifications/notification-list";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read-button";

export default async function NotificationsPage() {

    const user = await getCurrentUser();
    if (!user || user instanceof AppError) {
        redirect("/");
    }

    const t = await getTranslations("notifications");
    const notifications = await getMyNotifications(1, 50);

    return (
        <div className="mx-auto max-w-3xl">
            <header className="flex items-center justify-between mb-6">
                <h1 className="text-headline-md text-on-surface">
                    {t("title")}
                </h1>
                <MarkAllReadButton />
            </header>

            <div className="rounded-lg border border-outline-variant bg-surface-lowest overflow-hidden">
                <NotificationList notifications={notifications} />
            </div>
        </div>
    );
}