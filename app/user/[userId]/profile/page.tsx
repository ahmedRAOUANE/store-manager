import { ErrorState } from "@/components/UI/state";
import { LanguageSelector } from "@/components/user/language-selectore";
import { AppError } from "@/errors/base.error";
import { getCurrentUser } from "@/utils/auth";
import { cn } from "@/utils/jsx-classes";
import {
    Bell,
    Check,
    ChevronRight,
    Lock,
    Mail,
    ShieldCheck,
    User,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function ProfilePage() {
    const user = await getCurrentUser()

    const t = await getTranslations("profile");
    const statusT = await getTranslations("status");

    if(user instanceof AppError) {
        return <ErrorState title={t("loadError")} />
    }

    return (
        <main className="min-h-full bg-surface">
            <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
                {/* Page header */}
                <div className="mb-8">
                    <p className="label-caps text-secondary">{t("account")}</p>

                    <h1 className="mt-2 text-headline-lg sm:text-display-lg">
                        {t("title")}
                    </h1>

                    <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
                        {t("description")}
                    </p>
                </div>

                <div className="space-y-6">
                    {/* Profile overview */}
                    <section className="overflow-hidden rounded-lg border border-outline-variant bg-surface-lowest">
                        <div className="border-b border-outline-variant bg-surface-low px-5 py-4 sm:px-6">
                            <h2 className="text-headline-sm">{t("overview.title")}</h2>
                            <p className="mt-1 text-body-sm text-on-surface-variant">
                                {t("overview.description")}
                            </p>
                        </div>

                        <div className="p-5 sm:p-6">
                            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                                {/* Avatar */}
                                <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-on-primary">
                                    {`${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase()}
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="text-headline-md">
                                            {user.firstName} {user.lastName}
                                        </h3>

                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-success-border bg-success-bg px-2.5 py-1 text-label-sm text-success-fg">
                                            <span className="size-1.5 rounded-full bg-success" />
                                            {statusT("active")}
                                        </span>
                                    </div>

                                    <p className="mt-1 text-body-md text-on-surface-variant">
                                        {user.email}
                                    </p>

                                    {/* <p className="mt-3 text-body-sm text-on-surface-variant">
                                        Store manager account
                                    </p> */}
                                </div>

                                <button
                                    type="button"
                                    disabled
                                    className="inline-flex h-10 shrink-0 items-center justify-center rounded-md border border-outline-variant bg-surface-low px-4 text-sm font-medium text-on-surface-variant opacity-60"
                                >
                                    {t("editProfile")}
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Personal information */}
                    <section className="rounded-lg border border-outline-variant bg-surface-lowest">
                        <div className="border-b border-outline-variant px-5 py-4 sm:px-6">
                            <h2 className="text-headline-sm">{t("personalInfo.title")}</h2>
                            <p className="mt-1 text-body-sm text-on-surface-variant">
                                {t("personalInfo.description")}
                            </p>
                        </div>

                        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
                            <ProfileField
                                icon={<User className="size-4" />}
                                label={t("fields.firstName")}
                                value={user.firstName || t("notSet")}
                            />

                            <ProfileField
                                icon={<User className="size-4" />}
                                label={t("fields.lastName")}
                                value={user.lastName || t("notSet")}
                            />

                            <ProfileField
                                icon={<Mail className="size-4" />}
                                label={t("fields.email")}
                                value={user.email || ""}
                            />

                            <ProfileField
                                icon={<Bell className="size-4" />}
                                label={t("fields.notifications")}
                                value={t("enabled")}
                            />
                        </div>
                    </section>

                    {/* Account */}
                    <section className="rounded-lg border border-outline-variant bg-surface-lowest">
                        <div className="border-b border-outline-variant px-5 py-4 sm:px-6">
                            <h2 className="text-headline-sm">{t("accountSection.title")}</h2>
                            <p className="mt-1 text-body-sm text-on-surface-variant">
                                {t("accountSection.description")}
                            </p>
                        </div>

                        <div className="divide-y divide-outline-variant">
                            <ProfileAction
                                icon={<ShieldCheck className="size-5" />}
                                title={t("accountStatus.title")}
                                description={t("accountStatus.description")}
                                value={statusT("active")}
                                status
                            />

                            <ProfileAction
                                icon={<Lock className="size-5" />}
                                title={t("password.title")}
                                description={t("password.description")}
                                action={t("password.action")}
                            />

                            <ProfileAction
                                icon={<Mail className="size-5" />}
                                title={t("email.title")}
                                description={t("email.description")}
                                value={user.email || ""}
                            />
                        </div>
                    </section>

                    {/* Preferences */}
                    <section className="rounded-lg border border-outline-variant bg-surface-lowest">
                        <div className="border-b border-outline-variant px-5 py-4 sm:px-6">
                            <h2 className="text-headline-sm">{t("preferences.title")}</h2>
                            <p className="mt-1 text-body-sm text-on-surface-variant">
                                {t("preferences.description")}
                            </p>
                        </div>

                        <div className="divide-y divide-outline-variant">
                            <PreferenceRow
                                title={t("notifications.title")}
                                description={t("notifications.description")}
                                enabled
                            />

                            <PreferenceRow
                                title={t("emailNotifications.title")}
                                description={t("emailNotifications.description")}
                                enabled
                            />

                            <LanguageSelector />
                        </div>
                    </section>

                    {/* Coming soon */}
                    <section className="rounded-lg border border-info-border bg-info-bg p-5 sm:p-6">
                        <div className="flex gap-4">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-lowest text-info">
                                <Check className="size-4" />
                            </div>

                            <div>
                                <h2 className="text-title-md text-info-fg">
                                    {t("comingSoon.title")}
                                </h2>

                                <p className="mt-1 text-body-sm text-info-fg/80">
                                    {t("comingSoon.description")}
                                </p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}

function ProfileField({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-md border border-outline-variant bg-surface-low p-4">
            <div className="flex items-center gap-2 text-on-surface-variant">
                {icon}
                <span className="text-label-md">{label}</span>
            </div>

            <p className="mt-3 truncate text-body-md font-medium text-on-surface">
                {value}
            </p>
        </div>
    );
}

function ProfileAction({
    icon,
    title,
    description,
    value,
    action,
    status = false,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    value?: string;
    action?: string;
    status?: boolean;
}) {
    return (
        <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-container text-on-surface">
                {icon}
            </div>

            <div className="min-w-0 flex-1">
                <h3 className="text-title-md">{title}</h3>

                <p className="mt-1 text-body-sm text-on-surface-variant">
                    {description}
                </p>
            </div>

            {status && (
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-success-border bg-success-bg px-2.5 py-1 text-label-sm text-success-fg">
                    <span className="size-1.5 rounded-full bg-success" />
                    {value}
                </span>
            )}

            {!status && value && (
                <span className="max-w-full truncate text-body-sm text-on-surface-variant sm:max-w-52">
                    {value}
                </span>
            )}

            {action && (
                <button
                    type="button"
                    disabled
                    className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-secondary opacity-60"
                >
                    {action}
                    <ChevronRight className="size-4 rtl:rotate-180" />
                </button>
            )}
        </div>
    );
}

async function PreferenceRow({
    title,
    description,
    enabled,
}: {
    title: string;
    description: string;
    enabled: boolean;
}) {
    const t = await getTranslations("profile");

    return (
        <div className="flex items-center gap-4 px-5 py-4 sm:px-6">
            <div className="min-w-0 flex-1">
                <h3 className="text-title-md">{title}</h3>

                <p className="mt-1 text-body-sm text-on-surface-variant">
                    {description}
                </p>
            </div>

            <button
                type="button"
                disabled
                aria-label={`${title} ${enabled ? t("enabled") : t("disabled")
                    }`}
                className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full opacity-60",
                    enabled ? "bg-secondary" : "bg-outline-variant",
                )}
            >
                <span
                    className={cn(
                        "absolute top-1 size-4 rounded-full bg-white transition",
                        enabled ? "inset-e-1" : "inset-s-1",
                    )}
                />
            </button>
        </div>
    );
}
