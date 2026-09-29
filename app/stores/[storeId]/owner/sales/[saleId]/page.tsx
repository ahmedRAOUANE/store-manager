import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/UI/page-header";
import { StatCard } from "@/components/UI/stats-card";
import {
    Card,
    CardHeader,
    CardTitle,
    CardBody,
} from "@/components/UI/card";
import {
    StatusBadge,
    getPaymentStatus,
} from "@/components/UI/status-badge";
import { EmptyState } from "@/components/UI/state";
import { cn } from "@/utils/jsx-classes";
import { formatCurrency, formatDateTime } from "@/utils/format";

import type { GetsaleWithItems } from "@/zod/sale.schema";
import { getSaleById } from "@/actions/sales.actions";
import { AppError } from "@/errors/base.error";

/* ========================================================================== */
/*  Detail type                                                               */
/* ========================================================================== */

type SaleDetail = GetsaleWithItems;

/* ========================================================================== */
/*  Line items                                                                */
/* ========================================================================== */

interface LineItemsLabels {
    product: string;
    qty: string;
    unitPrice: string;
    discount: string;
    tax: string;
    lineTotal: string;
}

function LineItems({
    items,
    labels,
}: {
    items: SaleDetail["items"];
    labels: LineItemsLabels;
}) {
    /*
     * Per-line discount/tax are rare; only render those columns when present.
     */
    const hasLineDiscount = items.some(
        (item) => item.discountAmount > 0,
    );

    const hasLineTax = items.some(
        (item) => item.taxAmount > 0,
    );

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
                                {labels.unitPrice}
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
                                    {item.product.name}
                                </td>

                                <td className="px-3 py-2.5 text-end text-body-md tabular-nums text-on-surface-variant">
                                    {item.quantity}
                                </td>

                                <td className="px-3 py-2.5 text-end text-body-md tabular-nums text-on-surface-variant">
                                    {formatCurrency(item.unitPrice)}
                                </td>

                                {hasLineDiscount && (
                                    <td className="px-3 py-2.5 text-end text-body-md tabular-nums text-on-surface-variant">
                                        {item.discountAmount > 0
                                            ? `−${formatCurrency(
                                                item.discountAmount,
                                            )}`
                                            : "—"}
                                    </td>
                                )}

                                {hasLineTax && (
                                    <td className="px-3 py-2.5 text-end text-body-md tabular-nums text-on-surface-variant">
                                        {item.taxAmount > 0
                                            ? formatCurrency(
                                                item.taxAmount,
                                            )
                                            : "—"}
                                    </td>
                                )}

                                <td className="px-3 py-2.5 text-end text-body-md font-medium tabular-nums text-on-surface">
                                    {formatCurrency(
                                        item.totalAmount,
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ─── Mobile list ─── */}
            <ul className="divide-y divide-outline-variant md:hidden">
                {items.map((item) => (
                    <li
                        key={item.id}
                        className="px-3.5 py-3"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <span className="truncate text-body-md font-medium text-on-surface">
                                    {item.productId}
                                </span>

                                <p className="mt-0.5 text-body-sm text-on-surface-variant">
                                    {item.quantity} ×{" "}
                                    {formatCurrency(
                                        item.unitPrice,
                                    )}

                                    {item.discountAmount > 0 && (
                                        <>
                                            {" · "}
                                            <span className="text-warning-fg">
                                                −
                                                {formatCurrency(
                                                    item.discountAmount,
                                                )}
                                            </span>
                                        </>
                                    )}
                                </p>
                            </div>

                            <span className="shrink-0 text-body-md font-medium tabular-nums text-on-surface">
                                {formatCurrency(
                                    item.totalAmount,
                                )}
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

interface TotalsLabels {
    subtotal: string;
    discount: string;
    tax: string;
    total: string;
}

function TotalsBlock({
    sale,
    labels,
}: {
    sale: SaleDetail;
    labels: TotalsLabels;
}) {
    return (
        <dl className="ms-auto w-full max-w-xs space-y-1.5 text-body-md">
            <div className="flex items-center justify-between">
                <dt className="text-on-surface-variant">
                    {labels.subtotal}
                </dt>

                <dd className="tabular-nums text-on-surface">
                    {formatCurrency(sale.subtotal)}
                </dd>
            </div>

            {sale.discountAmount > 0 && (
                <div className="flex items-center justify-between">
                    <dt className="text-on-surface-variant">
                        {labels.discount}
                    </dt>

                    <dd className="tabular-nums text-warning-fg">
                        −
                        {formatCurrency(
                            sale.discountAmount,
                        )}
                    </dd>
                </div>
            )}

            {sale.taxAmount > 0 && (
                <div className="flex items-center justify-between">
                    <dt className="text-on-surface-variant">
                        {labels.tax}
                    </dt>

                    <dd className="tabular-nums text-on-surface">
                        {formatCurrency(sale.taxAmount)}
                    </dd>
                </div>
            )}

            <div className="flex items-center justify-between border-t border-outline-variant pt-2">
                <dt className="text-title-md text-on-surface">
                    {labels.total}
                </dt>

                <dd className="text-title-md tabular-nums text-on-surface">
                    {formatCurrency(sale.totalAmount)}
                </dd>
            </div>
        </dl>
    );
}

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

/* ========================================================================== */
/*  Page                                                                      */
/* ========================================================================== */

export default async function SaleDetailPage({
    params,
}: PageProps<"/stores/[storeId]/owner/sales/[saleId]">) {
    const { storeId, saleId } = await params;

    const tSales = await getTranslations("sales");
    const tDetail = await getTranslations("sales.detail");
    const tCommon = await getTranslations("common");

    const sale = await getSaleById(
        storeId,
        saleId,
    );

    /*
     * AppError is handled at the UI boundary.
     */
    if (sale instanceof AppError) {
        return (
            <EmptyState
                size="sm"
                title={tSales("errors.loadFailed")}
                description={sale.message}
            />
        );
    }

    /*
     * The service already scopes the query by storeId, but keeping
     * this check makes the page boundary explicit.
     */
    if (sale.storeId !== storeId) {
        return (
            <EmptyState
                size="sm"
                title={tSales("errors.notFound")}
                description={tSales("errors.notFoundDescription")}
            />
        );
    }

    const base = `/stores/${storeId}/owner/sales`;

    const paymentStatus = getPaymentStatus(
        sale.amountPaid,
        sale.amountDue,
    );

    const itemCount = sale.items.length;

    const totalUnits = sale.items.reduce(
        (sum, item) => sum + item.quantity,
        0,
    );

    /* ---------- Translated label bundles for helper components ---------- */

    const lineItemsLabels: LineItemsLabels = {
        product: tDetail("product"),
        qty: tDetail("quantity"),
        unitPrice: tDetail("unitPrice"),
        discount: tDetail("discount"),
        tax: tDetail("tax"),
        lineTotal: tDetail("lineTotal"),
    };

    const totalsLabels: TotalsLabels = {
        subtotal: tDetail("subtotal"),
        discount: tDetail("discount"),
        tax: tDetail("tax"),
        total: tDetail("total"),
    };

    return (
        <div className="space-y-6">
            {/* ─── Header ──────────────────────────────────────────────── */}
            <PageHeader
                title={sale.invoiceNumber}
                description={
                    <span className="inline-flex flex-wrap items-center gap-2">
                        <span>
                            {formatDateTime(
                                sale.saleDate,
                            )}
                        </span>

                        <span className="text-outline">
                            ·
                        </span>

                        <StatusBadge
                            status={paymentStatus}
                        />
                    </span>
                }
                breadcrumbs={[
                    {
                        label: tSales("title"),
                        href: base,
                    },
                    {
                        label: sale.invoiceNumber,
                    },
                ]}
                backHref={base}
            />

            {/* ─── Headline metrics ────────────────────────────────────── */}
            <section
                aria-label={tDetail("summary")}
                className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4"
            >
                <StatCard
                    label={tDetail("total")}
                    value={formatCurrency(
                        sale.totalAmount,
                    )}
                />

                <StatCard
                    label={tDetail("amountPaid")}
                    value={formatCurrency(
                        sale.amountPaid,
                    )}
                    tone="success"
                />

                <StatCard
                    label={tDetail("amountDue")}
                    value={formatCurrency(
                        sale.amountDue,
                    )}
                    tone={
                        sale.amountDue > 0
                            ? "danger"
                            : "default"
                    }
                />

                <StatCard
                    label={tDetail("items")}
                    value={itemCount}
                    hint={`${totalUnits} ${tDetail("units", { count: totalUnits })}`}
                />
            </section>

            {/* ─── Body ───────────────────────────────────────────────── */}
            <div className="grid gap-4 lg:grid-cols-3">
                {/* Main column */}
                <div className="space-y-4 lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {tDetail("items")}
                            </CardTitle>
                        </CardHeader>

                        <CardBody flush>
                            <LineItems
                                items={sale.items}
                                labels={lineItemsLabels}
                            />

                            <div className="border-t border-outline-variant px-3.5 py-4">
                                <TotalsBlock
                                    sale={sale}
                                    labels={totalsLabels}
                                />
                            </div>
                        </CardBody>
                    </Card>

                    {sale.notes && (
                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    {tDetail("notes")}
                                </CardTitle>
                            </CardHeader>

                            <CardBody>
                                <p className="whitespace-pre-wrap text-body-md text-on-surface">
                                    {sale.notes}
                                </p>
                            </CardBody>
                        </Card>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {tDetail("payment")}
                            </CardTitle>
                        </CardHeader>

                        <CardBody>
                            <dl className="divide-y divide-outline-variant">
                                <DetailRow label={tCommon("status")}>
                                    <StatusBadge
                                        status={
                                            paymentStatus
                                        }
                                    />
                                </DetailRow>

                                <DetailRow label={tDetail("total")}>
                                    <span className="tabular-nums">
                                        {formatCurrency(
                                            sale.totalAmount,
                                        )}
                                    </span>
                                </DetailRow>

                                <DetailRow label={tDetail("paid")}>
                                    <span className="tabular-nums text-success-fg">
                                        {formatCurrency(
                                            sale.amountPaid,
                                        )}
                                    </span>
                                </DetailRow>

                                <DetailRow label={tDetail("due")}>
                                    {sale.amountDue > 0 ? (
                                        <span className="tabular-nums font-medium text-danger-fg">
                                            {formatCurrency(
                                                sale.amountDue,
                                            )}
                                        </span>
                                    ) : (
                                        <span className="text-on-surface-variant">
                                            —
                                        </span>
                                    )}
                                </DetailRow>
                            </dl>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {tDetail("record")}
                            </CardTitle>
                        </CardHeader>

                        <CardBody>
                            <dl className="divide-y divide-outline-variant">
                                <DetailRow
                                    label={tDetail("invoice")}
                                    mono
                                >
                                    {
                                        sale.invoiceNumber
                                    }
                                </DetailRow>

                                <DetailRow label={tDetail("saleDate")}>
                                    {formatDateTime(
                                        sale.saleDate,
                                    )}
                                </DetailRow>

                                <DetailRow label={tDetail("createdBy")}>
                                    <span className="font-mono text-body-sm">
                                        {sale.createdBy.firstName}
                                    </span>
                                </DetailRow>

                                <DetailRow label={tDetail("created")}>
                                    {formatDateTime(
                                        sale.createdAt,
                                    )}
                                </DetailRow>

                                <DetailRow label={tDetail("updated")}>
                                    {formatDateTime(
                                        sale.updatedAt,
                                    )}
                                </DetailRow>

                                <DetailRow
                                    label={tDetail("saleId")}
                                    mono
                                >
                                    <span
                                        className="truncate"
                                        title={sale.id}
                                    >
                                        {sale.id.slice(
                                            0,
                                            8,
                                        )}
                                        …
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