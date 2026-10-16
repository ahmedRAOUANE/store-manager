import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { getAllProducts } from "@/actions/product.actions";
import { createSale } from "@/actions/sales.actions";
import { CreateSaleScreen } from "@/components/sales/create-sale-screen";
import { buttonVariants } from "@/components/UI/btn";
import { EmptyState, ErrorState } from "@/components/UI/state";
import { AppError } from "@/errors/base.error";
import { GetForSaleProducts } from "@/zod/product.schema";

/* ========================================================================== */
/*  Page                                                                      */
/* ========================================================================== */

const TAX_RATE = 0;

export default async function NewSalePage({
    params,
}: PageProps<"/stores/[storeId]/owner/sales/new">) {
    const { storeId } = await params;

    const tSales = await getTranslations("sales");
    const tProducts = await getTranslations("products");
    const tActions = await getTranslations("actions");

    const result = await getAllProducts(storeId);

    /* ---------- Failure: could not load products ---------- */

    if (result instanceof AppError) {
        return (
            <ErrorState
                title={tProducts("errors.loadFailed")}
                description={tSales("errors.loadCatalogFailed")}
                action={
                    <Link
                        href={`/stores/${storeId}/owner/sales/new`}
                        className={buttonVariants({ variant: "secondary", size: "md" })}
                    >
                        {tActions("tryAgain")}
                    </Link>
                }
            />
        );
    }

    /* ---------- Success but empty: nothing to sell ---------- */

    if (result.length === 0) {
        return (
            <EmptyState
                title={tProducts("empty.title")}
                description={tSales("empty.noProductsDescription")}
                action={
                    <Link
                        href={`/stores/${storeId}/owner/products/new`}
                        className={buttonVariants({ variant: "primary", size: "md" })}
                    >
                        {tProducts("createTitle")}
                    </Link>
                }
            />
        );
    }

    /* ---------- Happy path ---------- */

    const saleProducts: GetForSaleProducts[] = result.map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        unit: product.unit,
        sellingPrice: product.sellingPrice,
        stockQuantity: product.stockQuantity,
        isActive: product.isActive,
    }));

    return (
        <CreateSaleScreen
            storeId={storeId}
            currency="DZD"
            taxRate={TAX_RATE}
            products={saleProducts}
            createSaleAction={createSale}
        />
    );
}