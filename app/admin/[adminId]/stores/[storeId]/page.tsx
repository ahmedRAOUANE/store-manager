import Link from "next/link";
import { notFound } from "next/navigation";

import {
    activateStore,
    getStoreById,
    suspendStore,
} from "@/actions/admin.actions";

export default async function AdminStoreDetailsPage({
    params,
}: PageProps<"/admin/[adminId]/stores/[storeId]">) {
    const { adminId, storeId } = await params;

    const store = await getStoreById(storeId);

    if (!store || store instanceof Error) {
        notFound();
    }

    return (
        <div className="mx-auto max-w-5xl space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <Link
                        href={`/admin/${adminId}/stores`}
                        className="text-sm font-medium text-(--secondary) hover:underline"
                    >
                        ← Back to stores
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

                <StoreStatus status={store.status} />
            </div>

            {/* Main information */}
            <section className="rounded-xl border border-gray-200 bg-white">
                <div className="border-b border-gray-200 px-6 py-4">
                    <h2 className="font-semibold text-(--on-surface)">
                        Store Information
                    </h2>
                </div>

                <div className="grid gap-6 p-6 sm:grid-cols-2">
                    <InfoItem
                        label="Store name"
                        value={store.name}
                    />

                    <InfoItem
                        label="Email"
                        value={store.email}
                    />

                    <InfoItem
                        label="Phone"
                        value={store.phone}
                    />

                    <InfoItem
                        label="Address"
                        value={store.address}
                    />

                    <InfoItem
                        label="Currency"
                        value={store.currency}
                    />

                    <InfoItem
                        label="Timezone"
                        value={store.timezone}
                    />
                </div>
            </section>

            {/* Store status management */}
            <section className="rounded-xl border border-gray-200 bg-white">
                <div className="border-b border-gray-200 px-6 py-4">
                    <h2 className="font-semibold text-(--on-surface)">
                        Store Management
                    </h2>
                </div>

                <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="font-medium text-(--on-surface)">
                            Store status
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                            {getStatusDescription(store.status)}
                        </p>
                    </div>

                    <StoreStatusAction
                        // adminId={adminId}
                        storeId={store.id}
                        status={store.status}
                    />
                </div>
            </section>
        </div>
    );
}

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
            className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${styles[status]}`}
        >
            {labels[status]}
        </span>
    );
}

function getStatusDescription(
    status: "PENDING" | "ACTIVE" | "SUSPENDED",
) {
    switch (status) {
        case "PENDING":
            return "This store is waiting for admin approval.";

        case "ACTIVE":
            return "This store is currently active and available to its members.";

        case "SUSPENDED":
            return "This store is currently suspended.";
    }
}

function StoreStatusAction({
    // adminId,
    storeId,
    status,
}: {
    // adminId?: string;
    storeId: string;
    status: "PENDING" | "ACTIVE" | "SUSPENDED";
}) {
    if (status === "PENDING") {
        return (
            <form action={async () => {
                "use server";
                await activateStore(storeId)
            }}>
                <input
                    type="hidden"
                    name="storeId"
                    value={storeId}
                />

                <button
                    type="submit"
                    className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-background hover:opacity-90"
                >
                    Activate Store
                </button>
            </form>
        );
    }

    if (status === "ACTIVE") {
        return (
            <form action={async () => {
                "use server";
                await suspendStore(storeId)
            }}>
                <input
                    type="hidden"
                    name="storeId"
                    value={storeId}
                />

                <button
                    type="submit"
                    className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                    Suspend Store
                </button>
            </form>
        );
    }

    return (
        <form action={async () => {
            "use server";
            await activateStore(storeId)
        }}>
            <input
                type="hidden"
                name="storeId"
                value={storeId}
            />

            <button
                type="submit"
                className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
                Activate Store
            </button>
        </form>
    );
}