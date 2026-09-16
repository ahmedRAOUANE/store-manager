import Link from "next/link";

import { getAllStores } from "@/actions/admin.actions";

export default async function AdminStoresPage({ params }: PageProps<"/admin/[adminId]/stores">) {
    const { adminId } = await params;
    const result = await getAllStores();

    if (!result || !result.ok) {
        return (
            <div className="flex min-h-full items-center justify-center">
                <div className="text-center">
                    <h1 className="text-lg font-semibold text-(--on-surface)">
                        Unable to load stores
                    </h1>

                    <p className="mt-1 text-sm text-gray-500">
                        Something went wrong while loading the stores.
                    </p>
                </div>
            </div>
        );
    }

    const stores = result.data;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold text-(--on-surface)">
                    Stores
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                    Manage store status and review store information.
                </p>
            </div>

            {/* Stores */}
            {(stores && stores.length === 0) ? (
                <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
                    <h2 className="font-medium text-(--on-surface)">
                        No stores
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                        There are currently no stores in the system.
                    </p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-200 text-left">
                            <thead className="border-b border-gray-200 bg-gray-50">
                                <tr>
                                    <th className="px-5 py-3 text-sm font-medium text-gray-600">
                                        Store
                                    </th>

                                    <th className="px-5 py-3 text-sm font-medium text-gray-600">
                                        Contact
                                    </th>

                                    <th className="px-5 py-3 text-sm font-medium text-gray-600">
                                        Address
                                    </th>

                                    <th className="px-5 py-3 text-sm font-medium text-gray-600">
                                        Status
                                    </th>

                                    <th className="px-5 py-3 text-right text-sm font-medium text-gray-600">
                                        Action
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100">
                                {stores && stores.map((store) => (
                                    <tr
                                        key={store.id}
                                        className="hover:bg-gray-50"
                                    >
                                        <td className="px-5 py-4">
                                            <Link
                                                href={`/admin/${adminId}/stores/${store.id}`}
                                                className="font-medium text-(--on-surface) hover:text-(--secondary)"
                                            >
                                                {store.name}
                                            </Link>

                                            {store.description && (
                                                <p className="mt-1 max-w-xs truncate text-xs text-gray-500">
                                                    {store.description}
                                                </p>
                                            )}
                                        </td>

                                        <td className="px-5 py-4 text-sm text-gray-600">
                                            <div>{store.email || "—"}</div>
                                            <div>{store.phone || "—"}</div>
                                        </td>

                                        <td className="px-5 py-4 text-sm text-gray-600">
                                            {store.address || "—"}
                                        </td>

                                        <td className="px-5 py-4">
                                            <StoreStatus status={store.status} />
                                        </td>

                                        <td className="px-5 py-4 text-right">
                                            <StoreAction adminId={adminId} store={store} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

function StoreStatus({
    status,
}: {
    status: "PENDING" | "ACTIVE" | "SUSPENDED";
}) {
    const styles = {
        PENDING: "bg-yellow-50 text-yellow-700",
        ACTIVE: "bg-green-50 text-green-700",
        SUSPENDED: "bg-red-50 text-red-700",
    };

    const labels = {
        PENDING: "Pending",
        ACTIVE: "Active",
        SUSPENDED: "Suspended",
    };

    return (
        <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${styles[status]}`}
        >
            {labels[status]}
        </span>
    );
}

function StoreAction({
    store,
    adminId
}: {
    adminId: string;
    store: {
        id: string;
        status: "PENDING" | "ACTIVE" | "SUSPENDED";
    };
}) {
    if (store.status === "PENDING") {
        return (
            <Link
                href={`/admin/${adminId}/stores/${store.id}`}
                className="text-sm font-medium text-(--secondary) hover:underline"
            >
                Review
            </Link>
        );
    }

    if (store.status === "ACTIVE") {
        return (
            <Link
                href={`/admin/${adminId}/stores/${store.id}`}
                className="text-sm font-medium text-red-600 hover:underline"
            >
                Manage
            </Link>
        );
    }

    return (
        <Link
            href={`/admin/${adminId}/stores/${store.id}`}
            className="text-sm font-medium text-(--secondary) hover:underline"
        >
            Manage
        </Link>
    );
}