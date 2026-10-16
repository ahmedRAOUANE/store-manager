import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ChevronRight } from "lucide-react";

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
          "min-w-0 text-end text-body-md text-on-surface",
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
        className="size-3.5 text-on-surface-variant rtl:rotate-180"
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

  const t = await getTranslations("products.detail");
  const tProducts = await getTranslations("products");
  const tCommon = await getTranslations("common");
  const tSalesDetail = await getTranslations("sales.detail");

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
          { label: tProducts("title"), href: base },
          { label: product.name },
        ]}
        backHref={base}
        actions={
          <Link
            href={`${base}/${product.id}/edit`}
            className={buttonVariants({ variant: "primary", size: "sm" })}
          >
            {tProducts("editTitle")}
          </Link>
        }
      />

      {/* ─── At-a-glance metrics ────────────────────────────────────── */}
      <section
        aria-label={t("keyMetrics")}
        className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4"
      >
        <StatCard
          label={tProducts("fields.sellingPrice.label")}
          value={formatCurrency(product.sellingPrice)}
        />
        <StatCard
          label={tProducts("fields.costPrice.label")}
          value={formatCurrency(product.averageCost)}
          hint={t("averageCost")}
        />
        <StatCard
          label={tProducts("fields.currentStock.label")}
          value={product.stockQuantity}
          hint={t("minimumStockHint", { value: product.minimumStock })}
          tone={
            stockStatus === "OUT_OF_STOCK"
              ? "danger"
              : stockStatus === "LOW_STOCK"
                ? "warning"
                : "default"
          }
        />
        <StatCard
          label={t("margin")}
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
              <CardTitle>{t("productInformation")}</CardTitle>
            </CardHeader>
            <CardBody>
              <DetailList>
                <DetailRow label={tCommon("name")}>{product.name}</DetailRow>
                <DetailRow label={tProducts("fields.sku.label")} mono>
                  {product.sku}
                </DetailRow>
                <DetailRow label={tProducts("fields.barcode.label")} mono>
                  {product.barcode ?? (
                    <span className="text-outline">{tCommon("notSet")}</span>
                  )}
                </DetailRow>
                <DetailRow label={tProducts("fields.unit.label")}>
                  {product.unit}
                </DetailRow>
              </DetailList>

              <div className="mt-4 border-t border-outline-variant pt-4">
                <p className="text-label-sm uppercase text-on-surface-variant">
                  {tProducts("fields.description.label")}
                </p>
                <p className="mt-1.5 text-body-md text-on-surface">
                  {product.description ?? (
                    <span className="text-outline">
                      {t("noDescription")}
                    </span>
                  )}
                </p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{tProducts("pricing")}</CardTitle>
            </CardHeader>
            <CardBody>
              <DetailList>
                <DetailRow label={tProducts("fields.sellingPrice.label")}>
                  {formatCurrency(product.sellingPrice)}
                </DetailRow>
                <DetailRow label={tProducts("fields.costPrice.label")}>
                  {formatCurrency(product.averageCost)}
                </DetailRow>
                <DetailRow label={t("marginPerUnit")}>
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
              <CardTitle>{tCommon("stock")}</CardTitle>
            </CardHeader>
            <CardBody>
              <DetailList>
                <DetailRow label={t("current")}>
                  <span className="tabular-nums">
                    {product.stockQuantity}
                  </span>
                </DetailRow>
                <DetailRow label={t("minimum")}>
                  <span className="tabular-nums">
                    {product.minimumStock}
                  </span>
                </DetailRow>
                <DetailRow label={tCommon("status")}>
                  <StatusBadge status={stockStatus} />
                </DetailRow>
              </DetailList>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{tSalesDetail("record")}</CardTitle>
            </CardHeader>
            <CardBody>
              <DetailList>
                <DetailRow label={t("productId")} mono>
                  <span className="truncate" title={product.id}>
                    {product.id.slice(0, 8)}…
                  </span>
                </DetailRow>
                <DetailRow label={tSalesDetail("created")}>
                  {formatDate(product.createdAt)}
                </DetailRow>
                <DetailRow label={tSalesDetail("updated")}>
                  {formatDate(product.updatedAt)}
                </DetailRow>
                <DetailRow label={t("visibility")}>
                  <StatusBadge
                    status={product.isActive ? "ACTIVE" : "INACTIVE"}
                  />
                </DetailRow>
              </DetailList>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("history")}</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2">
              <HistoryLink
                href={`/stores/${storeId}/manager/sales?productId=${product.id}`}
                label={t("salesHistory")}
              />
              <HistoryLink
                href={`/stores/${storeId}/manager/purchases?productId=${product.id}`}
                label={t("purchaseHistory")}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}