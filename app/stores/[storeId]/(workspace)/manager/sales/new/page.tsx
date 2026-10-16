import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { getAllProducts } from "@/actions/product.actions";
import { createSale } from "@/actions/sales.actions";
import {
    CreateSaleScreen,
    type SaleProduct,
} from "@/components/sales/create-sale-screen";
import { buttonVariants } from "@/components/UI/btn";
import { ErrorState } from "@/components/UI/state";
import { AppError } from "@/errors/base.error";

export default async function ManagerNewSalePage({
    params,
}: PageProps<"/stores/[storeId]/manager/sales/new">) {
    const { storeId } = await params;

    const tProducts = await getTranslations("products");
    const tActions = await getTranslations("actions");

    const result = await getAllProducts(storeId);

    if (result instanceof AppError) {
        return (
            <ErrorState
                title={tProducts("errors.loadFailed")}
                description={result.message}
                action={
                    <Link
                        href={`/stores/${storeId}/manager/sales/new`}
                        className={buttonVariants({
                            variant: "secondary",
                            size: "md",
                        })}
                    >
                        {tActions("tryAgain")}
                    </Link>
                }
            />
        );
    }

    const saleProducts: SaleProduct[] = result.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        unit: p.unit,
        sellingPrice: p.sellingPrice,
        stockQuantity: p.stockQuantity,
        isActive: p.isActive,
    }));

    return (
        <CreateSaleScreen
            storeId={storeId}
            currency="DZD"
            taxRate={0}
            products={saleProducts}
            createSaleAction={createSale}
        />
    );
}