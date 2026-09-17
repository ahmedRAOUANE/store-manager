import Link from "next/link";
import { UserStore } from "./store-list";

type StoreCardProps = {
    store: UserStore;
    onRequest?: (storeId: string) => void;
    isPending: boolean;
    isRequesting: boolean;
};

export default function StoreCard({
    store,
    onRequest,
    isPending,
    isRequesting,
}: StoreCardProps) {
    const canRequest =
        store.membershipStatus === null ||
        store.membershipStatus === "REJECTED" ||
        store.membershipStatus === "INVALIDATED";

    return (
        <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div>
                <h3 className="font-semibold">
                    {store.name}
                </h3>

                {store.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {store.description}
                    </p>
                )}
            </div>

            {store.address && (
                <p className="mt-3 text-sm text-muted-foreground">
                    {store.address}
                </p>
            )}

            {canRequest && onRequest && (
                <button
                    type="button"
                    disabled={isPending}
                    onClick={() => onRequest(store.id)}
                    className="mt-5 w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isRequesting
                        ? "Sending request..."
                        : store.membershipStatus === "REJECTED"
                            ? "Request again"
                            : "Request to join"}
                </button>
            )}

            {store.membershipStatus === "PENDING" && (
                <div className="mt-5 rounded-lg border px-4 py-2 text-center text-sm text-muted-foreground">
                    Request pending
                </div>
            )}

            {(store.membershipStatus === "ACTIVE" && store.role) && (
                <Link href={`/stores/${store.id}/${store.role.toLowerCase()}/dashboard/`} className="block mt-5 rounded-lg border px-4 py-2 text-center text-sm">
                    dashboard
                </Link>
            )}
        </div>
    );
}