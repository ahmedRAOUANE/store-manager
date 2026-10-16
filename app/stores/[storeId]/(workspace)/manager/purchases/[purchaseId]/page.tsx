import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ChevronRight } from "lucide-react";

import { getPurchaseById } from "@/actions/purchase.actions";
import { getAllProducts } from "@/actions/product.actions";
import { getAllSuppliers } from "@/actions/supplier.actions";
import { PageHeader } from "@/components/UI/page-header";
import { StatCard } from "@/components/UI/stats-card";
import {
    Card,
    CardHeader,
    CardTitle,
    CardBody,
} from "@/components/UI/card";
import { StatusBadge, getPaymentStatus } from "@/components/UI/status-badge";
import { AppError } from "@/errors/base.error";
import { cn } from "@/utils/jsx-classes";
import { formatCurrency, formatDateTime } from "@/utils/format";

import type { GetPurchase } from "@/zod/purchase.schema";
import type { GetPurchaseItem } from "@/zod/purchaseItem.schema";

/* ========================================================================== */
/*  Enriched types                                                            */
/* ========================================================================== */

type PurchaseItemWithProduct = GetPurchaseItem & {
    productName: string;
    productSku: string;
};

type PurchaseDetail = Omit<GetPurchase, "items"> & {
    items: PurchaseItemWithProduct[];
    supplierName: string;
    supplierPhone: string | null;
    supplierEmail: string | null;
};

/* ========================================================================== */
/*  Line items — desktop table + mobile list                                  */
/* ========================================================================== */

interface LineItemsLabels {
    product: string;
    qty: string;
    unitCost: string;
    discount: string;
    tax: string;
    lineTotal: string;
}

function LineItems({
    items,
    labels,
}: {
    items: PurchaseItemWithProduct[];
    labels: LineItemsLabels;
}) {
    const hasLineDiscount = items.some((i) => i.discountAmount > 0);
    const hasLineTax = items.some((i) => i.taxAmount > 0);

    return (
        <>
            {/* ─── Desktop table ─── */}
            <div className="hidden overflow-x-auto scrollbar-thin md:block">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b border-outline-variant">
                            <th className="px-3 py-2.5 text-start text-label-sm uppercase text-on-surface-variant">
                                {labels.product}
                            </th>
                            <th className="w-16 px-3 py-2.5 text-end text-label-sm uppercase text-on-surface-variant">
                                {labels.qty}
                            </th>
                            <th className="w-28 px-3 py-2.5 text-end text-label-sm uppercase text-on-surface-variant">
                                {labels.unitCost}
                            </th>
                            {hasLineDiscount && (
                                <th className="w-24 px-3 py-2.5 text-end text-label-sm uppercase text-on-surface-variant">
                                    {labels.discount}
                                </th>
                            )}
                            {hasLineTax && (
                                <th className="w-20 px-3 py-2.5 text-end text-label-sm uppercase text-on-surface-variant">
                                    {labels.tax}
                                </th>
                            )}
                            <th className="w-28 px-3 py-2.5 text-end text-label-sm uppercase text-on-surface-variant">
                                {labels.lineTotal}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => (
                            <tr
                                key={item.id}
                                className="border-b border-outline-variant last:border-b-0"
                            >
                                <td className="px-3 py-2.5 text-body-md text-on-surface">
                                    <Link
                                        href={`/stores/${item.purchaseId}/manager/products/${item.productId}`}
                                        className="hover:text-info"
                                    >
                                        {item.productName}
                                    </Link>
                                    <span className="ms-2 font-mono text-body-sm text-on-surface-variant">
                                        {item.productSku}
                                    </span>
                                </td>
                                <td className="px-3 py-2.5 text-end text-body-md tabular-nums text-on-surface-variant">
                                    {item.quantity}
                                </td>
                                <td className="px-3 py-2.5 text-end text-body-md tabular-nums text-on-surface-variant">
                                    {formatCurrency(item.unitCost)}
                                </td>
                                {hasLineDiscount && (
                                    <td className="px-3 py-2.5 text-end text-body-md tabular-nums text-on-surface-variant">
                                        {item.discountAmount > 0
                                            ? `−${formatCurrency(item.discountAmount)}`
                                            : "—"}
                                    </td>
                                )}
                                {hasLineTax && (
                                    <td className="px-3 py-2.5 text-end text-body-md tabular-nums text-on-surface-variant">
                                        {item.taxAmount > 0
                                            ? formatCurrency(item.taxAmount)
                                            : "—"}
                                    </td>
                                )}
                                <td className="px-3 py-2.5 text-end text-body-md font-medium tabular-nums text-on-surface">
                                    {formatCurrency(item.totalAmount)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ─── Mobile list ─── */}
            <ul className="divide-y divide-outline-variant md:hidden">
                {items.map((item) => (
                    <li key={item.id} className="px-3.5 py-3">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <Link
                                    href={`/stores/${item.purchaseId}/manager/products/${item.productId}`}
                                    className="truncate text-body-md font-medium text-on-surface"
                                >
                                    {item.productName}
                                </Link>
                                <p className="mt-0.5 text-body-sm text-on-surface-variant">
                                    {item.quantity} × {formatCurrency(item.unitCost)}
                                </p>
                            </div>
                            <span className="shrink-0 text-body-md font-medium tabular-nums text-on-surface">
                                {formatCurrency(item.totalAmount)}
                            </span>
                        </div>
                    </li>
                ))}
            </ul>
        </>
    );
}

/* ========================================================================== */
/*  Totals block                                                              */
/* ========================================================================== */

interface TotalsLabels {
    subtotal: string;
    discount: string;
    tax: string;
    shipping: string;
    other: string;
    total: string;
}

function TotalsBlock({
    purchase,
    labels,
}: {
    purchase: PurchaseDetail;
    labels: TotalsLabels;
}) {
    return (
        <dl className="ms-auto w-full max-w-xs space-y-1.5 text-body-md">
            <div className="flex items-center justify-between">
                <dt className="text-on-surface-variant">{labels.subtotal}</dt>
                <dd className="tabular-nums text-on-surface">
                    {formatCurrency(purchase.subtotal)}
                </dd>
            </div>

            {purchase.discountAmount > 0 && (
                <div className="flex items-center justify-between">
                    <dt className="text-on-surface-variant">{labels.discount}</dt>
                    <dd className="tabular-nums text-warning-fg">
                        −{formatCurrency(purchase.discountAmount)}
                    </dd>
                </div>
            )}

            {purchase.taxAmount > 0 && (
                <div className="flex items-center justify-between">
                    <dt className="text-on-surface-variant">{labels.tax}</dt>
                    <dd className="tabular-nums text-on-surface">
                        {formatCurrency(purchase.taxAmount)}
                    </dd>
                </div>
            )}

            {purchase.shippingCost > 0 && (
                <div className="flex items-center justify-between">
                    <dt className="text-on-surface-variant">{labels.shipping}</dt>
                    <dd className="tabular-nums text-on-surface">
                        {formatCurrency(purchase.shippingCost)}
                    </dd>
                </div>
            )}

            {purchase.otherCost > 0 && (
                <div className="flex items-center justify-between">
                    <dt className="text-on-surface-variant">{labels.other}</dt>
                    <dd className="tabular-nums text-on-surface">
                        {formatCurrency(purchase.otherCost)}
                    </dd>
                </div>
            )}

            <div className="flex items-center justify-between border-t border-outline-variant pt-2">
                <dt className="text-title-md text-on-surface">{labels.total}</dt>
                <dd className="text-title-md tabular-nums text-on-surface">
                    {formatCurrency(purchase.totalAmount)}
                </dd>
            </div>
        </dl>
    );
}

/* ========================================================================== */
/*  Detail row helper                                                         */
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

/* ========================================================================== */
/*  Page                                                                      */
/* ========================================================================== */

export default async function ManagerPurchaseDetailPage({
    params,
}: PageProps<"/stores/[storeId]/manager/purchases/[purchaseId]">) {
    const { storeId, purchaseId } = await params;

    const base = `/stores/${storeId}/manager/purchases`;

    const t = await getTranslations("purchases.detail");
    const tPurchases = await getTranslations("purchases");
    const tSales = await getTranslations("sales.detail");
    const tCommon = await getTranslations("common");

    /* ---------- Fetch the purchase ---------- */

    const purchaseResult = await getPurchaseById(storeId, purchaseId);

    if (purchaseResult instanceof AppError) notFound();

    const purchase = purchaseResult;

    /* ---------- Enrichments in parallel ---------- */

    const [suppliersResult, productsResult] = await Promise.all([
        getAllSuppliers(storeId),
        getAllProducts(storeId),
    ]);

    const suppliers =
        suppliersResult instanceof AppError ? [] : suppliersResult;
    const products =
        productsResult instanceof AppError ? [] : productsResult;

    const supplierById = new Map(suppliers.map((s) => [s.id, s]));
    const productById = new Map(products.map((p) => [p.id, p]));

    /* ---------- Build the enriched detail ---------- */

    const supplier = supplierById.get(purchase.supplierId);

    const items: PurchaseItemWithProduct[] = (purchase.items ?? []).map(
        (item) => {
            const product = productById.get(item.productId);
            return {
                ...item,
                productName: product?.name ?? item.productId.slice(0, 8) + "…",
                productSku: product?.sku ?? "—",
            };
        },
    );

    const detail: PurchaseDetail = {
        ...purchase,
        items,
        supplierName:
            supplier?.name ?? purchase.supplierId.slice(0, 8) + "…",
        supplierPhone: supplier?.phone ?? null,
        supplierEmail: supplier?.email ?? null,
    };

    /* ---------- Derived ---------- */

    const paymentStatus = getPaymentStatus(detail.amountPaid, detail.amountDue);
    const itemCount = detail.items.length;
    const totalUnits = detail.items.reduce((sum, i) => sum + i.quantity, 0);

    /* ---------- Translated label bundles for helper components ---------- */

    const lineItemsLabels: LineItemsLabels = {
        product: tSales("product"),
        qty: tSales("quantity"),
        unitCost: tPurchases("line.unitCost"),
        discount: tSales("discount"),
        tax: tSales("tax"),
        lineTotal: tSales("lineTotal"),
    };

    const totalsLabels: TotalsLabels = {
        subtotal: tSales("subtotal"),
        discount: tSales("discount"),
        tax: tSales("tax"),
        shipping: tPurchases("totals.shipping"),
        other: tPurchases("totals.other"),
        total: tSales("total"),
    };

    /* ---------- Render ---------- */

    const title = detail.invoiceNumber ?? t("fallbackTitle");

    return (
        <div className="space-y-6">
            {/* ─── Header ─────────────────────────────────────────────────── */}
            <PageHeader
                title={title}
                description={
                    <span className="inline-flex flex-wrap items-center gap-2">
                        <Link
                            href={`/stores/${storeId}/manager/suppliers/${detail.supplierId}`}
                            className="text-on-surface-variant hover:text-info"
                        >
                            {detail.supplierName}
                        </Link>
                        <span className="text-outline">·</span>
                        <span>{formatDateTime(detail.createdAt)}</span>
                        <span className="text-outline">·</span>
                        <StatusBadge status={paymentStatus} />
                    </span>
                }
                breadcrumbs={[
                    { label: tPurchases("title"), href: base },
                    { label: title },
                ]}
                backHref={base}
            />

            {/* ─── Headline metrics ───────────────────────────────────────── */}
            <section
                aria-label={t("summary")}
                className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4"
            >
                <StatCard
                    label={tSales("total")}
                    value={formatCurrency(detail.totalAmount)}
                />
                <StatCard
                    label={tSales("amountPaid")}
                    value={formatCurrency(detail.amountPaid)}
                    tone="success"
                />
                <StatCard
                    label={tSales("amountDue")}
                    value={formatCurrency(detail.amountDue)}
                    tone={detail.amountDue > 0 ? "danger" : "default"}
                />
                <StatCard
                    label={tSales("items")}
                    value={itemCount}
                    hint={`${totalUnits} ${tPurchases("currentPurchase.units", { count: totalUnits })}`}
                />
            </section>

            {/* ─── Body ───────────────────────────────────────────────────── */}
            <div className="grid gap-4 lg:grid-cols-3">
                {/* Main column */}
                <div className="space-y-4 lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>{tSales("items")}</CardTitle>
                        </CardHeader>
                        <CardBody flush>
                            <LineItems
                                items={detail.items}
                                labels={lineItemsLabels}
                            />

                            <div className="border-t border-outline-variant px-3.5 py-4">
                                <TotalsBlock
                                    purchase={detail}
                                    labels={totalsLabels}
                                />
                            </div>
                        </CardBody>
                    </Card>

                    {detail.notes && (
                        <Card>
                            <CardHeader>
                                <CardTitle>{tSales("notes")}</CardTitle>
                            </CardHeader>
                            <CardBody>
                                <p className="whitespace-pre-wrap text-body-md text-on-surface">
                                    {detail.notes}
                                </p>
                            </CardBody>
                        </Card>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{tPurchases("supplierBar.supplier")}</CardTitle>
                        </CardHeader>
                        <CardBody>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-body-md font-medium text-on-surface">
                                        {detail.supplierName}
                                    </p>
                                    {detail.supplierEmail && (
                                        <p className="mt-0.5 text-body-sm text-on-surface-variant">
                                            {detail.supplierEmail}
                                        </p>
                                    )}
                                    {detail.supplierPhone && (
                                        <p className="mt-0.5 text-body-sm text-on-surface-variant">
                                            {detail.supplierPhone}
                                        </p>
                                    )}
                                </div>

                                <Link
                                    href={`/stores/${storeId}/manager/suppliers/${detail.supplierId}`}
                                    className={cn(
                                        "flex items-center justify-between rounded-md border border-outline-variant px-3 py-2",
                                        "text-body-md text-on-surface transition-colors",
                                        "hover:border-outline hover:bg-slate-50",
                                    )}
                                >
                                    <span>{t("viewSupplier")}</span>
                                    <ChevronRight
                                        className="size-3.5 text-on-surface-variant rtl:rotate-180"
                                        aria-hidden="true"
                                    />
                                </Link>
                            </div>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{tSales("payment")}</CardTitle>
                        </CardHeader>
                        <CardBody>
                            <dl className="divide-y divide-outline-variant">
                                <DetailRow label={tCommon("status")}>
                                    <StatusBadge status={paymentStatus} />
                                </DetailRow>
                                <DetailRow label={tSales("total")}>
                                    <span className="tabular-nums">
                                        {formatCurrency(detail.totalAmount)}
                                    </span>
                                </DetailRow>
                                <DetailRow label={tSales("paid")}>
                                    <span className="tabular-nums text-success-fg">
                                        {formatCurrency(detail.amountPaid)}
                                    </span>
                                </DetailRow>
                                <DetailRow label={tSales("due")}>
                                    {detail.amountDue > 0 ? (
                                        <span className="tabular-nums font-medium text-danger-fg">
                                            {formatCurrency(detail.amountDue)}
                                        </span>
                                    ) : (
                                        <span className="text-on-surface-variant">—</span>
                                    )}
                                </DetailRow>
                            </dl>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{tSales("record")}</CardTitle>
                        </CardHeader>
                        <CardBody>
                            <dl className="divide-y divide-outline-variant">
                                {detail.invoiceNumber && (
                                    <DetailRow label={tSales("invoice")} mono>
                                        {detail.invoiceNumber}
                                    </DetailRow>
                                )}
                                <DetailRow label={tSales("created")}>
                                    {formatDateTime(detail.createdAt)}
                                </DetailRow>
                                <DetailRow label={tSales("updated")}>
                                    {formatDateTime(detail.updatedAt)}
                                </DetailRow>
                                <DetailRow label={t("purchaseId")} mono>
                                    <span className="truncate" title={detail.id}>
                                        {detail.id.slice(0, 8)}…
                                    </span>
                                </DetailRow>
                            </dl>
                        </CardBody>
                    </Card>
                </div>
            </div>
        </div>
    );
}