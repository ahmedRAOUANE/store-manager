import Link from "next/link";

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

    const result = await getAllProducts(storeId);

    /* ---------- Failure: could not load products ---------- */

    if (result instanceof AppError) {
        return (
            <ErrorState
                title="Couldn't load products"
                description="Something went wrong while fetching your catalog. Please try again."
                action={
                    <Link
                        href={`/stores/${storeId}/owner/sales/new`}
                        className={buttonVariants({ variant: "secondary", size: "md" })}
                    >
                        Try Again
                    </Link>
                }
            />
        );
    }

    /* ---------- Success but empty: nothing to sell ---------- */

    if (result.length === 0) {
        return (
            <EmptyState
                title="No products yet"
                description="Add products to your catalog before recording a sale."
                action={
                    <Link
                        href={`/stores/${storeId}/owner/products/new`}
                        className={buttonVariants({ variant: "primary", size: "md" })}
                    >
                        Add Product
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