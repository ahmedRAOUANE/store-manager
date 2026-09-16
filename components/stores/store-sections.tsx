import StoreCard from "./store-card";
import { UserStore } from "./store-list";

type StoreSectionProps = {
    title: string;
    stores: UserStore[];
    onRequest?: (storeId: string) => void;
    isPending?: boolean;
    selectedStoreId?: string | null;
};

export default function StoreSection({
    title,
    stores,
    onRequest,
    isPending = false,
    selectedStoreId = null,
}: StoreSectionProps) {
    return (
        <section>
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                    {title}
                </h2>

                {stores.length > 3 && (
                    <button
                        type="button"
                        className="text-sm text-muted-foreground hover:text-foreground"
                    >
                        See more
                    </button>
                )}
            </div>

            {stores.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center">
                    <p className="text-sm text-muted-foreground">
                        No stores here yet.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {stores.slice(0, 3).map((store) => (
                        <StoreCard
                            key={store.id}
                            store={store}
                            onRequest={onRequest}
                            isPending={isPending}
                            isRequesting={
                                isPending &&
                                selectedStoreId === store.id
                            }
                        />
                    ))}
                </div>
            )}
        </section>
    );
}