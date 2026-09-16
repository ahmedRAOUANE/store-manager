import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
// import "temporal-polyfill/full/global";

import { getProductById } from "@/actions/product.actions";
import { PageHeader } from "@/components/UI/page-header";
import { StatCard } from "@/components/UI/stats-card";
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
} from "@/components/UI/card";
import { buttonVariants } from "@/components/UI/btn";
import { StatusBadge, getStockStatus } from "@/components/UI/status-badge";
import { AppError } from "@/errors/base.error";
import { cn } from "@/utils/jsx-classes";
import { formatCurrency, formatDate } from "@/utils/format";

/* ========================================================================== */
/*  Detail row                                                                */
/* ========================================================================== */

function DetailRow({
  label,
  children,
  mono = false,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-body-sm text-on-surface-variant">
        {label}
      </dt>
      <dd
        className={cn(
          "min-w-0 text-right text-body-md text-on-surface",
          mono && "font-mono text-body-sm",
        )}
      >
        {children}
      </dd>
    </div>
  );
}

function DetailList({ children }: { children: React.ReactNode }) {
  return <dl className="divide-y divide-outline-variant">{children}</dl>;
}

/* ========================================================================== */
/*  History link                                                              */
/* ========================================================================== */

function HistoryLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between rounded-md border border-outline-variant px-3 py-2",
        "text-body-md text-on-surface transition-colors",
        "hover:border-outline hover:bg-slate-50",
      )}
    >
      <span>{label}</span>
      <ChevronRight
        className="size-3.5 text-on-surface-variant"
        aria-hidden="true"
      />
    </Link>
  );
}

/* ========================================================================== */
/*  Page                                                                      */
/* ========================================================================== */

export default async function ManagerProductDetailPage({
  params,
}: PageProps<"/stores/[storeId]/manager/products/[productId]">) {
  const { storeId, productId: id } = await params;

  const result = await getProductById(storeId, id);

  /* `getProductById` returns AppError for "not found" and validation
     failures. Both mean there's nothing to render — 404. */
  if (result instanceof AppError) notFound();

  const product = result;

  const base = `/stores/${storeId}/manager/products`;
  const stockStatus = getStockStatus(
    product.stockQuantity,
    product.minimumStock,
    product.isActive,
  );

  const marginAmount = product.sellingPrice - product.averageCost;
  const marginPercent =
    product.sellingPrice > 0
      ? (marginAmount / product.sellingPrice) * 100
      : 0;

  return (
    <div className="space-y-6">
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <PageHeader
        title={product.name}
        description={
          <span className="inline-flex items-center gap-2">
            <span className="font-mono text-body-sm">{product.sku}</span>
            <span className="text-outline">·</span>
            <span>{product.unit}</span>
          </span>
        }
        breadcrumbs={[
          { label: "Products", href: base },
          { label: product.name },
        ]}
        backHref={base}
        actions={
          <Link
            href={`${base}/${product.id}/edit`}
            className={buttonVariants({ variant: "primary", size: "sm" })}
          >
            Edit Product
          </Link>
        }
      />

      {/* ─── At-a-glance metrics ────────────────────────────────────── */}
      <section
        aria-label="Key metrics"
        className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4"
      >
        <StatCard
          label="Selling Price"
          value={formatCurrency(product.sellingPrice)}
        />
        <StatCard
          label="Cost Price"
          value={formatCurrency(product.averageCost)}
          hint="Average cost"
        />
        <StatCard
          label="Current Stock"
          value={product.stockQuantity}
          hint={`Min: ${product.minimumStock}`}
          tone={
            stockStatus === "OUT_OF_STOCK"
              ? "danger"
              : stockStatus === "LOW_STOCK"
                ? "warning"
                : "default"
          }
        />
        <StatCard
          label="Margin"
          value={formatCurrency(marginAmount)}
          hint={`${marginPercent.toFixed(1)}%`}
          tone={marginAmount >= 0 ? "success" : "danger"}
        />
      </section>

      {/* ─── Body: facts + sidebar ─────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
            </CardHeader>
            <CardBody>
              <DetailList>
                <DetailRow label="Name">{product.name}</DetailRow>
                <DetailRow label="SKU" mono>
                  {product.sku}
                </DetailRow>
                <DetailRow label="Barcode" mono>
                  {product.barcode ?? (
                    <span className="text-outline">Not set</span>
                  )}
                </DetailRow>
                <DetailRow label="Unit">{product.unit}</DetailRow>
              </DetailList>

              <div className="mt-4 border-t border-outline-variant pt-4">
                <p className="text-label-sm uppercase text-on-surface-variant">
                  Description
                </p>
                <p className="mt-1.5 text-body-md text-on-surface">
                  {product.description ?? (
                    <span className="text-outline">
                      No description provided.
                    </span>
                  )}
                </p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardBody>
              <DetailList>
                <DetailRow label="Selling Price">
                  {formatCurrency(product.sellingPrice)}
                </DetailRow>
                <DetailRow label="Cost Price">
                  {formatCurrency(product.averageCost)}
                </DetailRow>
                <DetailRow label="Margin per Unit">
                  <span
                    className={cn(
                      "tabular-nums font-medium",
                      marginAmount >= 0
                        ? "text-success-fg"
                        : "text-danger-fg",
                    )}
                  >
                    {formatCurrency(marginAmount)} (
                    {marginPercent.toFixed(1)}%)
                  </span>
                </DetailRow>
              </DetailList>
            </CardBody>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock</CardTitle>
            </CardHeader>
            <CardBody>
              <DetailList>
                <DetailRow label="Current">
                  <span className="tabular-nums">
                    {product.stockQuantity}
                  </span>
                </DetailRow>
                <DetailRow label="Minimum">
                  <span className="tabular-nums">
                    {product.minimumStock}
                  </span>
                </DetailRow>
                <DetailRow label="Status">
                  <StatusBadge status={stockStatus} />
                </DetailRow>
              </DetailList>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Record</CardTitle>
            </CardHeader>
            <CardBody>
              <DetailList>
                <DetailRow label="Product ID" mono>
                  <span className="truncate" title={product.id}>
                    {product.id.slice(0, 8)}…
                  </span>
                </DetailRow>
                <DetailRow label="Created">
                  {formatDate(product.createdAt)}
                </DetailRow>
                <DetailRow label="Updated">
                  {formatDate(product.updatedAt)}
                </DetailRow>
                <DetailRow label="Visibility">
                  <StatusBadge
                    status={product.isActive ? "ACTIVE" : "INACTIVE"}
                  />
                </DetailRow>
              </DetailList>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2">
              <HistoryLink
                href={`/stores/${storeId}/manager/sales?productId=${product.id}`}
                label="Sales history"
              />
              <HistoryLink
                href={`/stores/${storeId}/manager/purchases?productId=${product.id}`}
                label="Purchase history"
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}