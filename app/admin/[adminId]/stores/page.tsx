import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { getAllStores } from "@/actions/admin.actions";

export default async function AdminStoresPage({
    params,
}: PageProps<"/admin/[adminId]/stores">) {
    const { adminId } = await params;

    const t = await getTranslations("admin.stores");
    const tStores = await getTranslations("stores");
    const tCommon = await getTranslations("common");
    const tStatus = await getTranslations("status");

    const result = await getAllStores();

    if (!result || !result.ok) {
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

    const stores = result.data;

    /* ---------- Translated labels for the helper components ---------- */

    const statusLabels: StoreStatusLabels = {
        PENDING: tStatus("pending"),
        ACTIVE: tStatus("active"),
        SUSPENDED: tStatus("suspended"),
    };

    const actionLabels: StoreActionLabels = {
        review: t("actions.review"),
        manage: t("actions.manage"),
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold text-(--on-surface)">
                    {tStores("title")}
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                    {t("description")}
                </p>
            </div>

            {/* Stores */}
            {(stores && stores.length === 0) ? (
                <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
                    <h2 className="font-medium text-(--on-surface)">
                        {t("empty.title")}
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                        {t("empty.description")}
                    </p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-200 text-start">
                            <thead className="border-b border-gray-200 bg-gray-50">
                                <tr>
                                    <th className="px-5 py-3 text-sm font-medium text-gray-600">
                                        {t("columns.store")}
                                    </th>

                                    <th className="px-5 py-3 text-sm font-medium text-gray-600">
                                        {t("columns.contact")}
                                    </th>

                                    <th className="px-5 py-3 text-sm font-medium text-gray-600">
                                        {tCommon("address")}
                                    </th>

                                    <th className="px-5 py-3 text-sm font-medium text-gray-600">
                                        {tCommon("status")}
                                    </th>

                                    <th className="px-5 py-3 text-end text-sm font-medium text-gray-600">
                                        {t("columns.action")}
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
                                            <StoreStatus
                                                status={store.status}
                                                labels={statusLabels}
                                            />
                                        </td>

                                        <td className="px-5 py-4 text-end">
                                            <StoreAction
                                                adminId={adminId}
                                                store={store}
                                                labels={actionLabels}
                                            />
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

/* ========================================================================== */
/*  StoreStatus                                                               */
/* ========================================================================== */

interface StoreStatusLabels {
    PENDING: string;
    ACTIVE: string;
    SUSPENDED: string;
}

function StoreStatus({
    status,
    labels,
}: {
    status: "PENDING" | "ACTIVE" | "SUSPENDED";
    labels: StoreStatusLabels;
}) {
    const styles = {
        PENDING: "bg-yellow-50 text-yellow-700",
        ACTIVE: "bg-green-50 text-green-700",
        SUSPENDED: "bg-red-50 text-red-700",
    };

    return (
        <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${styles[status]}`}
        >
            {labels[status]}
        </span>
    );
}

/* ========================================================================== */
/*  StoreAction                                                               */
/* ========================================================================== */

interface StoreActionLabels {
    review: string;
    manage: string;
}

function StoreAction({
    store,
    adminId,
    labels,
}: {
    adminId: string;
    store: {
        id: string;
        status: "PENDING" | "ACTIVE" | "SUSPENDED";
    };
    labels: StoreActionLabels;
}) {
    if (store.status === "PENDING") {
        return (
            <Link
                href={`/admin/${adminId}/stores/${store.id}`}
                className="text-sm font-medium text-(--secondary) hover:underline"
            >
                {labels.review}
            </Link>
        );
    }

    if (store.status === "ACTIVE") {
        return (
            <Link
                href={`/admin/${adminId}/stores/${store.id}`}
                className="text-sm font-medium text-red-600 hover:underline"
            >
                {labels.manage}
            </Link>
        );
    }

    return (
        <Link
            href={`/admin/${adminId}/stores/${store.id}`}
            className="text-sm font-medium text-(--secondary) hover:underline"
        >
            {labels.manage}
        </Link>
    );
}