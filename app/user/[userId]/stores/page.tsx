import { getDiscoveryStores } from "@/actions/user.actions";
import StoreList from "@/components/stores/store-list";
import { ErrorState } from "@/components/UI/state";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function StoresPage({
    params,
}: PageProps<"/user/[userId]/stores">) {
    const { userId } = await params;

    
    const result = await getDiscoveryStores();
    
    const t = await getTranslations("stores");
    const errorsT = await getTranslations("errors");
    
    if (!result.ok) {
        return <ErrorState title={errorsT("generic")} />;
    }

    return (
        <div className="mx-auto max-w-6xl p-6">
            <div className="mb-8 flex w-full justify-between">
                <div>
                    <h1 className="text-2xl font-bold">
                        {t("availableStores")}
                    </h1>

                    <p className="mt-1 text-muted-foreground">
                        {t("discoverDescription")}
                    </p>
                </div>

                <Link href={`/user/${ userId }/stores/request`}>
                    {t("requestNew")}
                </Link>
            </div>

            <StoreList stores={result.data} />
        </div>
    );
}
