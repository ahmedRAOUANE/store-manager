import Link from "next/link";

import { getAllProducts } from "@/actions/product.actions";
import { getAllSuppliers } from "@/actions/supplier.actions";
import { createPurchase } from "@/actions/purchase.actions";
import {
  CreatePurchaseScreen,
  type PurchaseProduct,
  type PurchaseSupplier,
} from "@/components/purchase/create-purchase-screen";
import { buttonVariants } from "@/components/UI/btn";
import { ErrorState } from "@/components/UI/state";
import { AppError } from "@/errors/base.error";

export default async function ManagerNewPurchasePage({
  params,
}: PageProps<"/stores/[storeId]/manager/purchases/new">) {
  const { storeId } = await params;

  const [productsResult, suppliersResult] = await Promise.all([
    getAllProducts(storeId),
    getAllSuppliers(storeId),
  ]);

  if (
    productsResult instanceof AppError ||
    suppliersResult instanceof AppError
  ) {
    return (
      <ErrorState
        title="Couldn't load data"
        description="Something went wrong while fetching products or suppliers. Please try again."
        action={
          <Link
            href={`/stores/${storeId}/manager/purchases/new`}
            className={buttonVariants({
              variant: "secondary",
              size: "md",
            })}
          >
            Try Again
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
      supplierNewHref={`/stores/${storeId}/manager/suppliers/new`}
      purchaseDetailBasePath={`/stores/${storeId}/manager/purchases`}
    />
  );
}