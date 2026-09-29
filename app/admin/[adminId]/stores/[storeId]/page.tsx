import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";

import {
    activateStore,
    getStoreById,
    suspendStore,
} from "@/actions/admin.actions";

export default async function AdminStoreDetailsPage({
    params,
}: PageProps<"/admin/[adminId]/stores/[storeId]">) {
    const { adminId, storeId } = await params;

    const t = await getTranslations("admin.storeDetail");
    const tStores = await getTranslations("stores");
    const tCommon = await getTranslations("common");
    const tStatus = await getTranslations("status");

    const store = await getStoreById(storeId);

    if (!store || store instanceof Error) {
        notFound();
    }

    /* ---------- Translated labels for helper components ---------- */

    const statusLabels: StoreStatusLabels = {
        PENDING: tStatus("pending"),
        ACTIVE: tStatus("active"),
        SUSPENDED: tStatus("suspended"),
    };

    const statusActionLabels: StoreStatusActionLabels = {
        activate: t("actions.activate"),
        suspend: t("actions.suspend"),
    };

    const statusDescriptionKey = getStatusDescriptionKey(store.status);

    return (
        <div className="mx-auto max-w-5xl space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <Link
                        href={`/admin/${adminId}/stores`}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-(--secondary) hover:underline"
                    >
                        <ArrowLeft
                            className="size-3.5 rtl:rotate-180"
                            aria-hidden="true"
                        />
                        {t("backToStores")}
                    </Link>

                    <h1 className="mt-4 text-2xl font-semibold text-(--on-surface)">
                        {store.name}
                    </h1>

                    {store.description && (
                        <p className="mt-1 max-w-2xl text-sm text-gray-500">
                            {store.description}
                        </p>
                    )}
                </div>

                <StoreStatus status={store.status} labels={statusLabels} />
            </div>

            {/* Main information */}
            <section className="rounded-xl border border-gray-200 bg-white">
                <div className="border-b border-gray-200 px-6 py-4">
                    <h2 className="font-semibold text-(--on-surface)">
                        {t("storeInformation")}
                    </h2>
                </div>

                <div className="grid gap-6 p-6 sm:grid-cols-2">
                    <InfoItem label={tStores("name")} value={store.name} />

                    <InfoItem label={tCommon("email")} value={store.email} />

                    <InfoItem label={tCommon("phone")} value={store.phone} />

                    <InfoItem label={tCommon("address")} value={store.address} />

                    <InfoItem label={tStores("currency")} value={store.currency} />

                    <InfoItem label={tStores("timezone")} value={store.timezone} />
                </div>
            </section>

            {/* Store status management */}
            <section className="rounded-xl border border-gray-200 bg-white">
                <div className="border-b border-gray-200 px-6 py-4">
                    <h2 className="font-semibold text-(--on-surface)">
                        {t("storeManagement")}
                    </h2>
                </div>

                <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="font-medium text-(--on-surface)">
                            {t("storeStatus")}
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                            {t(`statusDescriptions.${statusDescriptionKey}`)}
                        </p>
                    </div>

                    <StoreStatusAction
                        storeId={store.id}
                        status={store.status}
                        labels={statusActionLabels}
                    />
                </div>
            </section>
        </div>
    );
}

/* ========================================================================== */
/*  InfoItem                                                                  */
/* ========================================================================== */

function InfoItem({
    label,
    value,
}: {
    label: string;
    value: string | null | undefined;
}) {
    return (
        <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {label}
            </p>

            <p className="mt-1 text-sm text-(--on-surface)">
                {value || "—"}
            </p>
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
            className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${styles[status]}`}
        >
            {labels[status]}
        </span>
    );
}

/* ========================================================================== */
/*  Status description key                                                    */
/* ========================================================================== */

function getStatusDescriptionKey(
    status: "PENDING" | "ACTIVE" | "SUSPENDED",
): "pending" | "active" | "suspended" {
    switch (status) {
        case "PENDING":
            return "pending";
        case "ACTIVE":
            return "active";
        case "SUSPENDED":
            return "suspended";
    }
}

/* ========================================================================== */
/*  StoreStatusAction                                                         */
/* ========================================================================== */

interface StoreStatusActionLabels {
    activate: string;
    suspend: string;
}

function StoreStatusAction({
    storeId,
    status,
    labels,
}: {
    storeId: string;
    status: "PENDING" | "ACTIVE" | "SUSPENDED";
    labels: StoreStatusActionLabels;
}) {
    if (status === "PENDING") {
        return (
            <form
                action={async () => {
                    "use server";
                    await activateStore(storeId);
                }}
            >
                <input type="hidden" name="storeId" value={storeId} />

                <button
                    type="submit"
                    className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-background hover:opacity-90"
                >
                    {labels.activate}
                </button>
            </form>
        );
    }

    if (status === "ACTIVE") {
        return (
            <form
                action={async () => {
                    "use server";
                    await suspendStore(storeId);
                }}
            >
                <input type="hidden" name="storeId" value={storeId} />

                <button
                    type="submit"
                    className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                    {labels.suspend}
                </button>
            </form>
        );
    }

    return (
        <form
            action={async () => {
                "use server";
                await activateStore(storeId);
            }}
        >
            <input type="hidden" name="storeId" value={storeId} />

            <button
                type="submit"
                className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
                {labels.activate}
            </button>
        </form>
    );
}