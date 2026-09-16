import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
// import "temporal-polyfill/full/global";

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
/*  Local extensions — enrichments applied in the page                        */
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

function LineItems({ items }: { items: PurchaseItemWithProduct[] }) {
    const hasLineDiscount = items.some((i) => i.discountAmount > 0);
    const hasLineTax = items.some((i) => i.taxAmount > 0);

    return (
        <>
            {/* ─── Desktop table ─── */}
            <div className="hidden overflow-x-auto scrollbar-thin md:block">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b border-outline-variant">
                            <th className="px-3 py-2.5 text-left text-label-sm uppercase text-on-surface-variant">
                                Product
                            </th>
                            <th className="w-16 px-3 py-2.5 text-right text-label-sm uppercase text-on-surface-variant">
                                Qty
                            </th>
                            <th className="w-28 px-3 py-2.5 text-right text-label-sm uppercase text-on-surface-variant">
                                Unit Cost
                            </th>
                            {hasLineDiscount && (
                                <th className="w-24 px-3 py-2.5 text-right text-label-sm uppercase text-on-surface-variant">
                                    Discount
                                </th>
                            )}
                            {hasLineTax && (
                                <th className="w-20 px-3 py-2.5 text-right text-label-sm uppercase text-on-surface-variant">
                                    Tax
                                </th>
                            )}
                            <th className="w-28 px-3 py-2.5 text-right text-label-sm uppercase text-on-surface-variant">
                                Line Total
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
                                        href={`/stores/${item.purchaseId}/owner/products/${item.productId}`}
                                        className="hover:text-info"
                                    >
                                        {item.productName}
                                    </Link>
                                    <span className="ml-2 font-mono text-body-sm text-on-surface-variant">
                                        {item.productSku}
                                    </span>
                                </td>
                                <td className="px-3 py-2.5 text-right text-body-md tabular-nums text-on-surface-variant">
                                    {item.quantity}
                                </td>
                                <td className="px-3 py-2.5 text-right text-body-md tabular-nums text-on-surface-variant">
                                    {formatCurrency(item.unitCost)}
                                </td>
                                {hasLineDiscount && (
                                    <td className="px-3 py-2.5 text-right text-body-md tabular-nums text-on-surface-variant">
                                        {item.discountAmount > 0
                                            ? `−${formatCurrency(item.discountAmount)}`
                                            : "—"}
                                    </td>
                                )}
                                {hasLineTax && (
                                    <td className="px-3 py-2.5 text-right text-body-md tabular-nums text-on-surface-variant">
                                        {item.taxAmount > 0
                                            ? formatCurrency(item.taxAmount)
                                            : "—"}
                                    </td>
                                )}
                                <td className="px-3 py-2.5 text-right text-body-md font-medium tabular-nums text-on-surface">
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
                                    href={`/stores/${item.purchaseId}/owner/products/${item.productId}`}
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

function TotalsBlock({ purchase }: { purchase: PurchaseDetail }) {
    return (
        <dl className="ml-auto w-full max-w-xs space-y-1.5 text-body-md">
            <div className="flex items-center justify-between">
                <dt className="text-on-surface-variant">Subtotal</dt>
                <dd className="tabular-nums text-on-surface">
                    {formatCurrency(purchase.subtotal)}
                </dd>
            </div>

            {purchase.discountAmount > 0 && (
                <div className="flex items-center justify-between">
                    <dt className="text-on-surface-variant">Discount</dt>
                    <dd className="tabular-nums text-warning-fg">
                        −{formatCurrency(purchase.discountAmount)}
                    </dd>
                </div>
            )}

            {purchase.taxAmount > 0 && (
                <div className="flex items-center justify-between">
                    <dt className="text-on-surface-variant">Tax</dt>
                    <dd className="tabular-nums text-on-surface">
                        {formatCurrency(purchase.taxAmount)}
                    </dd>
                </div>
            )}

            {purchase.shippingCost > 0 && (
                <div className="flex items-center justify-between">
                    <dt className="text-on-surface-variant">Shipping</dt>
                    <dd className="tabular-nums text-on-surface">
                        {formatCurrency(purchase.shippingCost)}
                    </dd>
                </div>
            )}

            {purchase.otherCost > 0 && (
                <div className="flex items-center justify-between">
                    <dt className="text-on-surface-variant">Other</dt>
                    <dd className="tabular-nums text-on-surface">
                        {formatCurrency(purchase.otherCost)}
                    </dd>
                </div>
            )}

            <div className="flex items-center justify-between border-t border-outline-variant pt-2">
                <dt className="text-title-md text-on-surface">Total</dt>
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
                    "min-w-0 text-right text-body-md text-on-surface",
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

export default async function PurchaseDetailPage({
    params,
}: PageProps<"/stores/[storeId]/owner/purchases/[purchaseId]">) {
    const { storeId, purchaseId } = await params;

    /* ---------- Phase 1: fetch the purchase ---------- */

    const purchaseResult = await getPurchaseById(storeId, purchaseId);

    if (purchaseResult instanceof AppError) notFound();

    const purchase = purchaseResult;

    /* ---------- Phase 2: fetch enrichments in parallel ---------- */

    const [suppliersResult, productsResult] = await Promise.all([
        getAllSuppliers(storeId),
        getAllProducts(storeId),
    ]);

    const suppliers = suppliersResult instanceof AppError ? [] : suppliersResult;
    const products = productsResult instanceof AppError ? [] : productsResult;

    const supplierById = new Map(suppliers.map((s) => [s.id, s]));
    const productById = new Map(products.map((p) => [p.id, p]));

    /* ---------- Enrich ---------- */

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
        supplierName: supplier?.name ?? purchase.supplierId.slice(0, 8) + "…",
        supplierPhone: supplier?.phone ?? null,
        supplierEmail: supplier?.email ?? null,
    };

    /* ---------- Derived ---------- */

    const base = `/stores/${storeId}/owner/purchases`;
    const paymentStatus = getPaymentStatus(detail.amountPaid, detail.amountDue);
    const itemCount = detail.items.length;
    const totalUnits = detail.items.reduce((sum, i) => sum + i.quantity, 0);

    /* ---------- Render ---------- */

    return (
        <div className="space-y-6">
            <PageHeader
                title={detail.invoiceNumber ?? "Purchase"}
                description={
                    <span className="inline-flex flex-wrap items-center gap-2">
                        <Link
                            href={`/stores/${storeId}/owner/suppliers/${detail.supplierId}`}
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
                    { label: "Purchases", href: base },
                    { label: detail.invoiceNumber ?? "Purchase" },
                ]}
                backHref={base}
            />

            <section
                aria-label="Purchase summary"
                className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4"
            >
                <StatCard
                    label="Total"
                    value={formatCurrency(detail.totalAmount)}
                />
                <StatCard
                    label="Amount Paid"
                    value={formatCurrency(detail.amountPaid)}
                    tone="success"
                />
                <StatCard
                    label="Amount Due"
                    value={formatCurrency(detail.amountDue)}
                    tone={detail.amountDue > 0 ? "danger" : "default"}
                />
                <StatCard
                    label="Items"
                    value={itemCount}
                    hint={`${totalUnits} units`}
                />
            </section>

            <div className="grid gap-4 lg:grid-cols-3">
                {/* Main column */}
                <div className="space-y-4 lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Items</CardTitle>
                        </CardHeader>
                        <CardBody flush>
                            <LineItems items={detail.items} />
                            <div className="border-t border-outline-variant px-3.5 py-4">
                                <TotalsBlock purchase={detail} />
                            </div>
                        </CardBody>
                    </Card>

                    {detail.notes && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Notes</CardTitle>
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
                            <CardTitle>Supplier</CardTitle>
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
                                    href={`/stores/${storeId}/owner/suppliers/${detail.supplierId}`}
                                    className={cn(
                                        "flex items-center justify-between rounded-md border border-outline-variant px-3 py-2",
                                        "text-body-md text-on-surface transition-colors",
                                        "hover:border-outline hover:bg-slate-50",
                                    )}
                                >
                                    <span>View supplier</span>
                                    <ChevronRight
                                        className="size-3.5 text-on-surface-variant"
                                        aria-hidden="true"
                                    />
                                </Link>
                            </div>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Payment</CardTitle>
                        </CardHeader>
                        <CardBody>
                            <dl className="divide-y divide-outline-variant">
                                <DetailRow label="Status">
                                    <StatusBadge status={paymentStatus} />
                                </DetailRow>
                                <DetailRow label="Total">
                                    <span className="tabular-nums">
                                        {formatCurrency(detail.totalAmount)}
                                    </span>
                                </DetailRow>
                                <DetailRow label="Paid">
                                    <span className="tabular-nums text-success-fg">
                                        {formatCurrency(detail.amountPaid)}
                                    </span>
                                </DetailRow>
                                <DetailRow label="Due">
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
                            <CardTitle>Record</CardTitle>
                        </CardHeader>
                        <CardBody>
                            <dl className="divide-y divide-outline-variant">
                                {detail.invoiceNumber && (
                                    <DetailRow label="Invoice" mono>
                                        {detail.invoiceNumber}
                                    </DetailRow>
                                )}
                                <DetailRow label="Created">
                                    {formatDateTime(detail.createdAt)}
                                </DetailRow>
                                <DetailRow label="Updated">
                                    {formatDateTime(detail.updatedAt)}
                                </DetailRow>
                                <DetailRow label="Purchase ID" mono>
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