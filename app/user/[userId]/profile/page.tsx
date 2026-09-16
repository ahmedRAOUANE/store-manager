import { ErrorState } from "@/components/UI/state";
import { AppError } from "@/errors/base.error";
import { getCurrentUser } from "@/utils/auth";
import {
    Bell,
    Check,
    ChevronRight,
    Lock,
    Mail,
    ShieldCheck,
    User,
} from "lucide-react";

export default async function ProfilePage() {
    const user = await getCurrentUser()

    if(user instanceof AppError) {
        return <ErrorState title="couldn't get the user profile" />
    }

    return (
        <main className="min-h-full bg-surface">
            <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
                {/* Page header */}
                <div className="mb-8">
                    <p className="label-caps text-secondary">Account</p>

                    <h1 className="mt-2 text-headline-lg sm:text-display-lg">
                        Profile
                    </h1>

                    <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
                        Manage your personal information, account details, and preferences.
                    </p>
                </div>

                <div className="space-y-6">
                    {/* Profile overview */}
                    <section className="overflow-hidden rounded-lg border border-outline-variant bg-surface-lowest">
                        <div className="border-b border-outline-variant bg-surface-low px-5 py-4 sm:px-6">
                            <h2 className="text-headline-sm">Profile overview</h2>
                            <p className="mt-1 text-body-sm text-on-surface-variant">
                                Your personal account information.
                            </p>
                        </div>

                        <div className="p-5 sm:p-6">
                            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                                {/* Avatar */}
                                <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-on-primary">
                                    JD
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="text-headline-md">
                                            {user.firstName} {user.lastName}
                                        </h3>

                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-success-border bg-success-bg px-2.5 py-1 text-label-sm text-success-fg">
                                            <span className="size-1.5 rounded-full bg-success" />
                                            Active
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
                                    Edit profile
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Personal information */}
                    <section className="rounded-lg border border-outline-variant bg-surface-lowest">
                        <div className="border-b border-outline-variant px-5 py-4 sm:px-6">
                            <h2 className="text-headline-sm">Personal information</h2>
                            <p className="mt-1 text-body-sm text-on-surface-variant">
                                Information associated with your account.
                            </p>
                        </div>

                        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
                            <ProfileField
                                icon={<User className="size-4" />}
                                label="First name"
                                value={user.firstName || "not set"}
                            />

                            <ProfileField
                                icon={<User className="size-4" />}
                                label="Last name"
                                value={user.lastName || "not set"}
                            />

                            <ProfileField
                                icon={<Mail className="size-4" />}
                                label="Email address"
                                value={user.email || ""}
                            />

                            <ProfileField
                                icon={<Bell className="size-4" />}
                                label="Notifications"
                                value="Enabled"
                            />
                        </div>
                    </section>

                    {/* Account */}
                    <section className="rounded-lg border border-outline-variant bg-surface-lowest">
                        <div className="border-b border-outline-variant px-5 py-4 sm:px-6">
                            <h2 className="text-headline-sm">Account</h2>
                            <p className="mt-1 text-body-sm text-on-surface-variant">
                                Account and access information.
                            </p>
                        </div>

                        <div className="divide-y divide-outline-variant">
                            <ProfileAction
                                icon={<ShieldCheck className="size-5" />}
                                title="Account status"
                                description="Your account is active and available to use."
                                value="Active"
                                status
                            />

                            <ProfileAction
                                icon={<Lock className="size-5" />}
                                title="Password"
                                description="Keep your account secure with a strong password."
                                action="Change password"
                            />

                            <ProfileAction
                                icon={<Mail className="size-5" />}
                                title="Email address"
                                description="Your email is used for account communication."
                                value={user.email || ""}
                            />
                        </div>
                    </section>

                    {/* Preferences */}
                    <section className="rounded-lg border border-outline-variant bg-surface-lowest">
                        <div className="border-b border-outline-variant px-5 py-4 sm:px-6">
                            <h2 className="text-headline-sm">Preferences</h2>
                            <p className="mt-1 text-body-sm text-on-surface-variant">
                                Customize how your account behaves.
                            </p>
                        </div>

                        <div className="divide-y divide-outline-variant">
                            <PreferenceRow
                                title="Notifications"
                                description="Receive updates about your stores and account."
                                enabled
                            />

                            <PreferenceRow
                                title="Email notifications"
                                description="Receive important account and store updates by email."
                                enabled
                            />
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
                                    More profile settings are coming
                                </h2>

                                <p className="mt-1 text-body-sm text-info-fg/80">
                                    Profile editing, notification preferences, password changes,
                                    and other account settings will be available here as the
                                    account system grows.
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
                    <ChevronRight className="size-4" />
                </button>
            )}
        </div>
    );
}

function PreferenceRow({
    title,
    description,
    enabled,
}: {
    title: string;
    description: string;
    enabled: boolean;
}) {
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
                aria-label={`${title} ${enabled ? "enabled" : "disabled"}`}
                className={`relative h-6 w-11 shrink-0 rounded-full opacity-60 ${enabled ? "bg-secondary" : "bg-outline-variant"
                    }`}
            >
                <span
                    className={`absolute top-1 size-4 rounded-full bg-white transition ${enabled ? "left-6" : "left-1"
                        }`}
                />
            </button>
        </div>
    );
}
