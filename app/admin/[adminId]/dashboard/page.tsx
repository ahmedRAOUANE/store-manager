import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { getAdminDashboard } from "@/actions/admin.actions";

export default async function AdminDashboardPage({
    params,
}: PageProps<"/admin/[adminId]/dashboard">) {
    const { adminId } = await params;

    const t = await getTranslations("admin");
    const tStatus = await getTranslations("status");
    const tActions = await getTranslations("actions");

    const result = await getAdminDashboard();

    if (!result || "message" in result) {
        return (
            <div className="flex min-h-full items-center justify-center">
                <div className="text-center">
                    <h1 className="text-lg font-semibold text-(--on-surface)">
                        {t("errors.loadFailed")}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        {t("errors.loadFailedDescription")}
                    </p>
                </div>
            </div>
        );
    }

    const { users, stores, recentStoreRequests } = result;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold text-(--on-surface)">
                    {t("dashboardTitle")}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                    {t("dashboardDescription")}
                </p>
            </div>

            {/* Overview */}
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <DashboardCard
                    label={t("stats.totalUsers")}
                    value={users.total}
                />

                <DashboardCard
                    label={t("stats.totalStores")}
                    value={stores.total}
                />

                <DashboardCard
                    label={t("stats.pendingStores")}
                    value={stores.pending}
                />

                <DashboardCard
                    label={t("stats.activeStores")}
                    value={stores.active}
                />
            </section>

            {/* Store status */}
            <section>
                <div className="mb-4">
                    <h2 className="text-lg font-semibold text-(--on-surface)">
                        {t("storeOverview.title")}
                    </h2>
                    <p className="text-sm text-gray-500">
                        {t("storeOverview.description")}
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <StatusCard
                        label={tStatus("pending")}
                        value={stores.pending}
                    />

                    <StatusCard
                        label={tStatus("active")}
                        value={stores.active}
                    />

                    <StatusCard
                        label={tStatus("suspended")}
                        value={stores.suspended}
                    />
                </div>
            </section>

            {/* Recent requests */}
            <section>
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-(--on-surface)">
                            {t("recentRequests.title")}
                        </h2>
                        <p className="text-sm text-gray-500">
                            {t("recentRequests.description")}
                        </p>
                    </div>

                    <Link
                        href={`/admin/${adminId}/stores`}
                        className="text-sm font-medium text-(--secondary) hover:underline"
                    >
                        {tActions("viewAll")}
                    </Link>
                </div>

                {recentStoreRequests.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
                        <p className="text-sm text-gray-500">
                            {t("recentRequests.empty")}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                        <div className="divide-y divide-gray-100">
                            {recentStoreRequests.map((store) => (
                                <Link
                                    key={store.id}
                                    href={`/admin/${adminId}/stores/${store.id}`}
                                    className="flex items-center justify-between gap-4 p-4 transition hover:bg-gray-50"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate font-medium text-(--on-surface)">
                                            {store.name}
                                        </p>
                                        <p className="mt-1 text-xs text-gray-500">
                                            {t("recentRequests.requestedOn", {
                                                date: store.createdAt.toLocaleString(),
                                            })}
                                        </p>
                                    </div>

                                    <span className="shrink-0 rounded-full bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-700">
                                        {tStatus("pending")}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}

function DashboardCard({
    label,
    value,
}: {
    label: string;
    value: number;
}) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-(--on-surface)">
                {value}
            </p>
        </div>
    );
}

function StatusCard({
    label,
    value,
}: {
    label: string;
    value: number;
}) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-600">{label}</p>

                <span className="text-2xl font-semibold text-(--on-surface)">
                    {value}
                </span>
            </div>
        </div>
    );
}