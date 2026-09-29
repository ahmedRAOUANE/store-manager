import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { getAllProducts } from "@/actions/product.actions";
import { getAllSuppliers } from "@/actions/supplier.actions";
import { createPurchase } from "@/actions/purchase.actions";
import { CreatePurchaseScreen } from "@/components/purchase/create-purchase-screen";
import {
  type PurchaseProduct,
  type PurchaseSupplier,
} from "@/components/purchase/create-purchase-screen";
import { buttonVariants } from "@/components/UI/btn";
import { ErrorState } from "@/components/UI/state";
import { AppError } from "@/errors/base.error";

export default async function NewPurchasePage({
  params,
}: PageProps<"/stores/[storeId]/owner/purchases/new">) {
  const { storeId } = await params;

  const t = await getTranslations("purchases.errors");
  const tErrors = await getTranslations("errors");
  const tActions = await getTranslations("actions");

  const [productsResult, suppliersResult] = await Promise.all([
    getAllProducts(storeId),
    getAllSuppliers(storeId),
  ]);

  if (productsResult instanceof AppError || suppliersResult instanceof AppError) {
    return (
      <ErrorState
        title={tErrors("failedToLoad")}
        description={t("loadDataFailed")}
        action={
          <Link
            href={`/stores/${storeId}/owner/purchases/new`}
            className={buttonVariants({ variant: "secondary", size: "md" })}
          >
            {tActions("tryAgain")}
          </Link>
        }
      />
    );
  }

  const products: PurchaseProduct[] = productsResult.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    unit: p.unit,
    averageCost: p.averageCost,
    isActive: p.isActive,
  }));

  const suppliers: PurchaseSupplier[] = suppliersResult.map((s) => ({
    id: s.id,
    name: s.name,
  }));

  return (
    <CreatePurchaseScreen
      storeId={storeId}
      currency="DZD"
      products={products}
      suppliers={suppliers}
      createPurchaseAction={createPurchase}
      supplierNewHref={`/stores/${storeId}/owner/suppliers/new`}
      purchaseDetailBasePath={`/stores/${storeId}/owner/purchases`}
    />
  );
}