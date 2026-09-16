import { getDiscoveryStores } from "@/actions/user.actions";
import StoreList, { UserStore } from "@/components/stores/store-list";
import { ErrorState } from "@/components/UI/state";
import Link from "next/link";

export default async function StoresPage({ params }: PageProps<"/user/[userId]/stores/request">) {
    const { userId } = await params;
    const result = await getDiscoveryStores();

    if (!result.ok) {
        return <ErrorState title="Something went wrong" />;
    }

    return (
        <div className="mx-auto max-w-6xl p-6">
            <div className="mb-8 flex justify-between w-full">
                <div>
                    <h1 className="text-2xl font-bold">
                        Available Stores
                    </h1>

                    <p className="mt-1 text-muted-foreground">
                        Discover stores and request membership.
                    </p>
                </div>

                <Link href={`/user/${userId}/stores/request`}>request a new store</Link>
            </div>

            <StoreList stores={result.data as UserStore[]} />
        </div>
    );
}