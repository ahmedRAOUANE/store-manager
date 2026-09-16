import Link from "next/link";

import { getAdminDashboard } from "@/actions/admin.actions";

export default async function AdminDashboardPage({params}: PageProps<"/admin/[adminId]/dashboard">) {
    const {adminId} = await params;

    const result = await getAdminDashboard();

    if (!result || "message" in result) {
        return (
            <div className="flex min-h-full items-center justify-center">
                <div className="text-center">
                    <h1 className="text-lg font-semibold text-(--on-surface)">
                        Unable to load dashboard
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Something went wrong while loading the admin dashboard.
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
                    Admin Dashboard
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                    Overview of your users and stores.
                </p>
            </div>

            {/* Overview */}
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <DashboardCard
                    label="Total Users"
                    value={users.total}
                />

                <DashboardCard
                    label="Total Stores"
                    value={stores.total}
                />

                <DashboardCard
                    label="Pending Stores"
                    value={stores.pending}
                />

                <DashboardCard
                    label="Active Stores"
                    value={stores.active}
                />
            </section>

            {/* Store status */}
            <section>
                <div className="mb-4">
                    <h2 className="text-lg font-semibold text-(--on-surface)">
                        Store Overview
                    </h2>
                    <p className="text-sm text-gray-500">
                        Current status of all stores.
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <StatusCard
                        label="Pending"
                        value={stores.pending}
                    />

                    <StatusCard
                        label="Active"
                        value={stores.active}
                    />

                    <StatusCard
                        label="Suspended"
                        value={stores.suspended}
                    />
                </div>
            </section>

            {/* Recent requests */}
            <section>
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-(--on-surface)">
                            Recent Store Requests
                        </h2>
                        <p className="text-sm text-gray-500">
                            The latest stores waiting for review.
                        </p>
                    </div>

                    <Link
                        href={`/admin/${adminId}/stores`}
                        className="text-sm font-medium text-(--secondary) hover:underline"
                    >
                        View all
                    </Link>
                </div>

                {recentStoreRequests.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
                        <p className="text-sm text-gray-500">
                            No pending store requests.
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
                                            Requested{" "}
                                            {store.createdAt.toLocaleString()}
                                        </p>
                                    </div>

                                    <span className="shrink-0 rounded-full bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-700">
                                        Pending
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