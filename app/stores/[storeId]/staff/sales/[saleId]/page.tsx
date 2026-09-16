import Link from "next/link";
import { notFound } from "next/navigation";
// import "temporal-polyfill/full/global";

import { getSaleById } from "@/actions/sales.actions";
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

import type { GetsaleWithItems } from "@/zod/sale.schema";

/* ========================================================================== */
/*  Line items                                                                */
/* ========================================================================== */

function LineItems({
    items,
    storeId,
}: {
    items: GetsaleWithItems['items'];
    storeId: string;
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
                            <th className="px-3 py-2.5 text-left text-label-sm uppercase text-on-surface-variant">
                                Product
                            </th>
                            <th className="w-16 px-3 py-2.5 text-right text-label-sm uppercase text-on-surface-variant">
                                Qty
                            </th>
                            <th className="w-28 px-3 py-2.5 text-right text-label-sm uppercase text-on-surface-variant">
                                Unit Price
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
                                        href={`/stores/${storeId}/staff/sales/${item.saleId}/products/${item.productId}`}
                                        className="hover:text-info"
                                    >
                                        {item.product.name}
                                    </Link>
                                </td>
                                <td className="px-3 py-2.5 text-right text-body-md tabular-nums text-on-surface-variant">
                                    {item.quantity}
                                </td>
                                <td className="px-3 py-2.5 text-right text-body-md tabular-nums text-on-surface-variant">
                                    {formatCurrency(item.unitPrice)}
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
                                <p className="truncate text-body-md font-medium text-on-surface">
                                    {item.product.name}
                                </p>
                                <p className="mt-0.5 text-body-sm text-on-surface-variant">
                                    {item.quantity} × {formatCurrency(item.unitPrice)}
                                    {item.discountAmount > 0 && (
                                        <>
                                            {" · "}
                                            <span className="text-warning-fg">
                                                −{formatCurrency(item.discountAmount)}
                                            </span>
                                        </>
                                    )}
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
/*  Totals                                                                    */
/* ========================================================================== */

function TotalsBlock({ sale }: { sale: GetsaleWithItems }) {
    return (
        <dl className="ml-auto w-full max-w-xs space-y-1.5 text-body-md">
            <div className="flex items-center justify-between">
                <dt className="text-on-surface-variant">Subtotal</dt>
                <dd className="tabular-nums text-on-surface">
                    {formatCurrency(sale.subtotal)}
                </dd>
            </div>

            {sale.discountAmount > 0 && (
                <div className="flex items-center justify-between">
                    <dt className="text-on-surface-variant">Discount</dt>
                    <dd className="tabular-nums text-warning-fg">
                        −{formatCurrency(sale.discountAmount)}
                    </dd>
                </div>
            )}

            {sale.taxAmount > 0 && (
                <div className="flex items-center justify-between">
                    <dt className="text-on-surface-variant">Tax</dt>
                    <dd className="tabular-nums text-on-surface">
                        {formatCurrency(sale.taxAmount)}
                    </dd>
                </div>
            )}

            <div className="flex items-center justify-between border-t border-outline-variant pt-2">
                <dt className="text-title-md text-on-surface">Total</dt>
                <dd className="text-title-md tabular-nums text-on-surface">
                    {formatCurrency(sale.totalAmount)}
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

export default async function StaffSaleDetailPage({
    params,
}: PageProps<"/stores/[storeId]/staff/sales/[saleId]">) {
    const { storeId, saleId } = await params;

    const base = `/stores/${storeId}/staff/sales`;

    /* ---------- Fetch the sale ---------- */

    const saleResult = await getSaleById(storeId, saleId);

    if (saleResult instanceof AppError) notFound();

    const sale: GetsaleWithItems = saleResult;

    /* ---------- Derived ---------- */

    const paymentStatus = getPaymentStatus(sale.amountPaid, sale.amountDue);
    const itemCount = sale.items.length;
    const totalUnits = sale.items.reduce((sum, i) => sum + i.quantity, 0);

    /* ---------- Render ---------- */

    return (
        <div className="space-y-6">
            <PageHeader
                title={sale.invoiceNumber}
                description={
                    <span className="inline-flex flex-wrap items-center gap-2">
                        <span>{formatDateTime(sale.saleDate)}</span>
                        <span className="text-outline">·</span>
                        <StatusBadge status={paymentStatus} />
                    </span>
                }
                breadcrumbs={[
                    { label: "My Sales", href: base },
                    { label: sale.invoiceNumber },
                ]}
                backHref={base}
            />

            <section
                aria-label="Sale summary"
                className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4"
            >
                <StatCard
                    label="Total"
                    value={formatCurrency(sale.totalAmount)}
                />
                <StatCard
                    label="Amount Paid"
                    value={formatCurrency(sale.amountPaid)}
                    tone="success"
                />
                <StatCard
                    label="Amount Due"
                    value={formatCurrency(sale.amountDue)}
                    tone={sale.amountDue > 0 ? "danger" : "default"}
                />
                <StatCard
                    label="Items"
                    value={itemCount}
                    hint={`${totalUnits} units`}
                />
            </section>

            <div className="grid gap-4 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Items</CardTitle>
                        </CardHeader>
                        <CardBody flush>
                            <LineItems items={sale.items} storeId={storeId} />

                            <div className="border-t border-outline-variant px-3.5 py-4">
                                <TotalsBlock sale={sale} />
                            </div>
                        </CardBody>
                    </Card>

                    {sale.notes && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Notes</CardTitle>
                            </CardHeader>
                            <CardBody>
                                <p className="whitespace-pre-wrap text-body-md text-on-surface">
                                    {sale.notes}
                                </p>
                            </CardBody>
                        </Card>
                    )}
                </div>

                <div className="space-y-4">
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
                                        {formatCurrency(sale.totalAmount)}
                                    </span>
                                </DetailRow>
                                <DetailRow label="Paid">
                                    <span className="tabular-nums text-success-fg">
                                        {formatCurrency(sale.amountPaid)}
                                    </span>
                                </DetailRow>
                                <DetailRow label="Due">
                                    {sale.amountDue > 0 ? (
                                        <span className="tabular-nums font-medium text-danger-fg">
                                            {formatCurrency(sale.amountDue)}
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
                                <DetailRow label="Invoice" mono>
                                    {sale.invoiceNumber}
                                </DetailRow>
                                <DetailRow label="Sale date">
                                    {formatDateTime(sale.saleDate)}
                                </DetailRow>
                                <DetailRow label="Created by">
                                    {/* {sale.createdBy.firstName} */}
                                    you
                                </DetailRow>
                                <DetailRow label="Created">
                                    {formatDateTime(sale.createdAt)}
                                </DetailRow>
                                <DetailRow label="Updated">
                                    {formatDateTime(sale.updatedAt)}
                                </DetailRow>
                                <DetailRow label="Sale ID" mono>
                                    <span className="truncate" title={sale.id}>
                                        {sale.id.slice(0, 8)}…
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