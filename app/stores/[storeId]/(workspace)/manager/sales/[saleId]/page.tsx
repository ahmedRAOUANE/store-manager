import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { getSaleById } from "@/actions/sales.actions";
import { getAllProducts } from "@/actions/product.actions";
import { getAllMembers } from "@/actions/storeManagement.actions";
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
import type { GetMembershipWithUser } from "@/zod/membership.schema";

/* ========================================================================== */
/*  Enriched types                                                            */
/* ========================================================================== */

type SaleItemWithProduct = GetsaleWithItems["items"][number] & {
    productName: string;
};

type SaleDetail = Omit<GetsaleWithItems, "items"> & {
    items: SaleItemWithProduct[];
    createdByName: string;
};

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
    storeId,
    labels,
}: {
    items: SaleItemWithProduct[];
    storeId: string;
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
                                    <Link
                                        href={`/stores/${storeId}/manager/products/${item.productId}`}
                                        className="hover:text-info"
                                    >
                                        {item.productName}
                                    </Link>
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
                                    href={`/stores/${storeId}/manager/products/${item.productId}`}
                                    className="truncate text-body-md font-medium text-on-surface"
                                >
                                    {item.productName}
                                </Link>
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
                <dt className="text-on-surface-variant">{labels.subtotal}</dt>
                <dd className="tabular-nums text-on-surface">
                    {formatCurrency(sale.subtotal)}
                </dd>
            </div>

            {sale.discountAmount > 0 && (
                <div className="flex items-center justify-between">
                    <dt className="text-on-surface-variant">{labels.discount}</dt>
                    <dd className="tabular-nums text-warning-fg">
                        −{formatCurrency(sale.discountAmount)}
                    </dd>
                </div>
            )}

            {sale.taxAmount > 0 && (
                <div className="flex items-center justify-between">
                    <dt className="text-on-surface-variant">{labels.tax}</dt>
                    <dd className="tabular-nums text-on-surface">
                        {formatCurrency(sale.taxAmount)}
                    </dd>
                </div>
            )}

            <div className="flex items-center justify-between border-t border-outline-variant pt-2">
                <dt className="text-title-md text-on-surface">{labels.total}</dt>
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

export default async function ManagerSaleDetailPage({
    params,
}: PageProps<"/stores/[storeId]/manager/sales/[saleId]">) {
    const { storeId, saleId } = await params;

    const base = `/stores/${storeId}/manager/sales`;

    const t = await getTranslations("sales.detail");
    const tSales = await getTranslations("sales");
    const tCommon = await getTranslations("common");
    const tMembers = await getTranslations("members");

    /* ---------- Fetch the sale ---------- */

    const saleResult = await getSaleById(storeId, saleId);

    if (saleResult instanceof AppError) notFound();

    const sale = saleResult;

    /* ---------- Enrichments in parallel ---------- */

    const [productsResult, membersResult] = await Promise.all([
        getAllProducts(storeId),
        getAllMembers(storeId),
    ]);

    const products =
        productsResult instanceof AppError ? [] : productsResult;
    const members: GetMembershipWithUser[] =
        membersResult instanceof AppError ? [] : membersResult;

    const productById = new Map(products.map((p) => [p.id, p]));
    const unnamedFallback = tMembers("unnamed");
    const nameByUserId = new Map(
        members.map((m) => {
            const fullName = [m.user.firstName, m.user.lastName]
                .filter(Boolean)
                .join(" ")
                .trim();
            return [m.userId, fullName || m.user.email || unnamedFallback];
        }),
    );

    /* ---------- Build the enriched detail ---------- */

    const items: SaleItemWithProduct[] = (sale.items ?? []).map((item) => ({
        ...item,
        productName:
            productById.get(item.productId)?.name ??
            item.productId.slice(0, 8) + "…",
    }));

    const detail: SaleDetail = {
        ...sale,
        items,
        createdByName:
            nameByUserId.get(sale.createdById) ??
            sale.createdById.slice(0, 8) + "…",
    };

    /* ---------- Derived ---------- */

    const paymentStatus = getPaymentStatus(detail.amountPaid, detail.amountDue);
    const itemCount = detail.items.length;
    const totalUnits = detail.items.reduce((sum, i) => sum + i.quantity, 0);

    /* ---------- Translated label bundles for helper components ---------- */

    const lineItemsLabels: LineItemsLabels = {
        product: t("product"),
        qty: t("quantity"),
        unitPrice: t("unitPrice"),
        discount: t("discount"),
        tax: t("tax"),
        lineTotal: t("lineTotal"),
    };

    const totalsLabels: TotalsLabels = {
        subtotal: t("subtotal"),
        discount: t("discount"),
        tax: t("tax"),
        total: t("total"),
    };

    /* ---------- Render ---------- */

    return (
        <div className="space-y-6">
            <PageHeader
                title={detail.invoiceNumber}
                description={
                    <span className="inline-flex flex-wrap items-center gap-2">
                        <span>{formatDateTime(detail.saleDate)}</span>
                        <span className="text-outline">·</span>
                        <StatusBadge status={paymentStatus} />
                    </span>
                }
                breadcrumbs={[
                    { label: tSales("title"), href: base },
                    { label: detail.invoiceNumber },
                ]}
                backHref={base}
            />

            <section
                aria-label={t("summary")}
                className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4"
            >
                <StatCard
                    label={t("total")}
                    value={formatCurrency(detail.totalAmount)}
                />
                <StatCard
                    label={t("amountPaid")}
                    value={formatCurrency(detail.amountPaid)}
                    tone="success"
                />
                <StatCard
                    label={t("amountDue")}
                    value={formatCurrency(detail.amountDue)}
                    tone={detail.amountDue > 0 ? "danger" : "default"}
                />
                <StatCard
                    label={t("items")}
                    value={itemCount}
                    hint={`${totalUnits} ${t("units", { count: totalUnits })}`}
                />
            </section>

            <div className="grid gap-4 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("items")}</CardTitle>
                        </CardHeader>
                        <CardBody flush>
                            <LineItems
                                items={detail.items}
                                storeId={storeId}
                                labels={lineItemsLabels}
                            />

                            <div className="border-t border-outline-variant px-3.5 py-4">
                                <TotalsBlock
                                    sale={detail}
                                    labels={totalsLabels}
                                />
                            </div>
                        </CardBody>
                    </Card>

                    {detail.notes && (
                        <Card>
                            <CardHeader>
                                <CardTitle>{t("notes")}</CardTitle>
                            </CardHeader>
                            <CardBody>
                                <p className="whitespace-pre-wrap text-body-md text-on-surface">
                                    {detail.notes}
                                </p>
                            </CardBody>
                        </Card>
                    )}
                </div>

                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("payment")}</CardTitle>
                        </CardHeader>
                        <CardBody>
                            <dl className="divide-y divide-outline-variant">
                                <DetailRow label={tCommon("status")}>
                                    <StatusBadge status={paymentStatus} />
                                </DetailRow>
                                <DetailRow label={t("total")}>
                                    <span className="tabular-nums">
                                        {formatCurrency(detail.totalAmount)}
                                    </span>
                                </DetailRow>
                                <DetailRow label={t("paid")}>
                                    <span className="tabular-nums text-success-fg">
                                        {formatCurrency(detail.amountPaid)}
                                    </span>
                                </DetailRow>
                                <DetailRow label={t("due")}>
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
                            <CardTitle>{t("record")}</CardTitle>
                        </CardHeader>
                        <CardBody>
                            <dl className="divide-y divide-outline-variant">
                                <DetailRow label={t("invoice")} mono>
                                    {detail.invoiceNumber}
                                </DetailRow>
                                <DetailRow label={t("saleDate")}>
                                    {formatDateTime(detail.saleDate)}
                                </DetailRow>
                                <DetailRow label={t("createdBy")}>
                                    {detail.createdByName}
                                </DetailRow>
                                <DetailRow label={t("created")}>
                                    {formatDateTime(detail.createdAt)}
                                </DetailRow>
                                <DetailRow label={t("updated")}>
                                    {formatDateTime(detail.updatedAt)}
                                </DetailRow>
                                <DetailRow label={t("saleId")} mono>
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