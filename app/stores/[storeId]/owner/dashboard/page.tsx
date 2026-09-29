import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/UI/page-header";
import { StatCard } from "@/components/UI/stats-card";
import {
    Card,
    CardHeader,
    CardTitle,
    CardActions,
    CardBody,
} from "@/components/UI/card";
import { buttonVariants } from "@/components/UI/btn";
import {
    DataTable,
    type Column,
} from "@/components/UI/data-table";
import {
    StatusBadge,
    getPaymentStatus,
} from "@/components/UI/status-badge";
import { EmptyState } from "@/components/UI/state";

import type { StoreDashboard } from "@/zod/storeDashboard.schema";

import { getManagementDashboard } from "@/actions/storeManagement.actions";

import { AppError } from "@/errors/base.error";

/* ========================================================================== */
/*  Formatters                                                                */
/* ========================================================================== */

const currencyFmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
});

const dateFmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
});

function formatCurrency(value: number): string {
    return currencyFmt.format(value);
}

function formatDate(instant: Temporal.Instant): string {
    return dateFmt.format(new Date(instant.epochMilliseconds));
}

/* ========================================================================== */
/*  Page                                                                      */
/* ========================================================================== */

export default async function StoreDashboardPage(
    { params }: PageProps<"/stores/[storeId]/owner/dashboard">
) {
    const storeId = (await params).storeId;

    const base = `/stores/${storeId}/owner`;

    const t = await getTranslations("dashboard");
    const tSales = await getTranslations("sales");
    const tPurchases = await getTranslations("purchases");
    const tProducts = await getTranslations("products");
    const tCommon = await getTranslations("common");
    const tActions = await getTranslations("actions");
    const tEmpty = await getTranslations("emptyStates");
    const tErrors = await getTranslations("errors");

    const data = await getManagementDashboard(storeId);

    if (data instanceof AppError) {
        return (
            <div className="space-y-6 min-h-full">
                <PageHeader
                    title={t("title")}
                    description={t("description")}
                />

                <EmptyState
                    title={tEmpty("noData")}
                    description={tErrors("loadRetry")}
                />
            </div>
        );
    }

    /* ===================== Column definitions ===================== */

    const lowStockColumns: Column<
        StoreDashboard["lowStockProducts"][number]
    >[] = [
            {
                key: "product",
                header: tSales("detail.product"),
                mobile: "primary",
                cell: (p) => (
                    <span className="font-medium">{p.name}</span>
                ),
            },
            {
                key: "sku",
                header: tProducts("fields.sku.label"),
                mobile: "secondary",
                cell: (p) => (
                    <span className="font-mono text-body-sm">
                        {p.sku}
                    </span>
                ),
            },
            {
                key: "stock",
                header: tCommon("stock"),
                align: "right",
                width: "w-32",
                cell: (p) => (
                    <span className="tabular-nums">
                        <span className="font-medium text-warning-fg">
                            {p.stockQuantity}
                        </span>
                        <span className="text-on-surface-variant">
                            {" / "}
                            {p.minimumStock}
                        </span>
                    </span>
                ),
            },
        ];

    const recentSalesColumns: Column<
        StoreDashboard["recentSales"][number]
    >[] = [
            {
                key: "invoice",
                header: tSales("table.invoice"),
                mobile: "primary",
                cell: (s) => (
                    <span className="font-mono text-body-sm">
                        {s.invoiceNumber}
                    </span>
                ),
            },
            {
                key: "date",
                header: tCommon("date"),
                mobile: "secondary",
                cell: (s) => formatDate(s.saleDate),
            },
            {
                key: "amount",
                header: tCommon("amount"),
                align: "right",
                width: "w-28",
                cell: (s) => formatCurrency(s.totalAmount),
            },
            {
                key: "status",
                header: tCommon("status"),
                width: "w-28",
                cell: (s) => (
                    <StatusBadge
                        status={getPaymentStatus(
                            s.totalAmount - s.amountDue,
                            s.amountDue
                        )}
                    />
                ),
            },
        ];

    const recentPurchasesColumns: Column<
        StoreDashboard["recentPurchases"][number]
    >[] = [
            {
                key: "invoice",
                header: tSales("table.invoice"),
                mobile: "primary",
                cell: (p) => (
                    <span className="font-mono text-body-sm">
                        {p.invoiceNumber}
                    </span>
                ),
            },
            {
                key: "supplier",
                header: tPurchases("supplierBar.supplier"),
                mobile: "secondary",
                cell: () => tCommon("unknown"),
            },
            {
                key: "amount",
                header: tCommon("amount"),
                align: "right",
                width: "w-28",
                cell: (p) => formatCurrency(p.totalAmount),
            },
            {
                key: "status",
                header: tCommon("status"),
                width: "w-28",
                cell: (p) => (
                    <StatusBadge
                        status={getPaymentStatus(
                            p.totalAmount - p.amountDue,
                            p.amountDue
                        )}
                    />
                ),
            },
        ];

    /* ===================== Render ===================== */

    return (
        <div className="space-y-6 min-h-full">
            {/* ─── Header + Quick Actions ─────────────────────────────────── */}

            <PageHeader
                title={t("title")}
                description={t("description")}
                actions={
                    <>
                        <Link
                            href={`${base}/sales/new`}
                            className={buttonVariants({
                                variant: "primary",
                                size: "sm",
                            })}
                        >
                            {tSales("newSale")}
                        </Link>

                        <Link
                            href={`${base}/products/new`}
                            className={buttonVariants({
                                variant: "secondary",
                                size: "sm",
                            })}
                        >
                            {tProducts("createTitle")}
                        </Link>

                        <Link
                            href={`${base}/purchases/new`}
                            className={buttonVariants({
                                variant: "secondary",
                                size: "sm",
                            })}
                        >
                            {tPurchases("newPurchase")}
                        </Link>
                    </>
                }
            />

            {/* ─── Summary cards ──────────────────────────────────────────── */}

            <section
                aria-label={t("summary")}
                className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4"
            >
                <StatCard
                    label={t("stats.todaySales")}
                    value={data.sales.todayCount}
                    hint={formatCurrency(data.sales.todayRevenue)}
                />

                <StatCard
                    label={t("stats.todayRevenue")}
                    value={formatCurrency(data.sales.todayRevenue)}
                />

                <StatCard
                    label={t("stats.monthlySales")}
                    value={data.purchases.monthCount}
                    hint={formatCurrency(data.purchases.monthAmount)}
                />

                <StatCard
                    label={t("stats.monthlyPurchases")}
                    value={formatCurrency(data.purchases.monthAmount)}
                />

                <StatCard
                    label={t("stats.customerOutstanding")}
                    value={formatCurrency(data.sales.outstanding)}
                    tone={
                        data.sales.outstanding > 0
                            ? "warning"
                            : "default"
                    }
                />

                <StatCard
                    label={t("stats.supplierOutstanding")}
                    value={formatCurrency(data.purchases.outstanding)}
                    tone={
                        data.purchases.outstanding > 0
                            ? "warning"
                            : "default"
                    }
                />

                <StatCard
                    label={t("stats.inventoryValue")}
                    value={formatCurrency(data.inventory.inventoryValue)}
                />

                <StatCard
                    label={t("stats.grossProfitMonth")}
                    value={formatCurrency(data.profit.month)}
                    tone={
                        data.profit.month >= 0
                            ? "success"
                            : "danger"
                    }
                />
            </section>

            {/* ─── Inventory ──────────────────────────────────────────────── */}

            <section
                aria-label={tProducts("inventory")}
                className="space-y-3"
            >
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    <StatCard
                        label={t("stats.totalProducts")}
                        value={data.inventory.productCount}
                    />

                    <StatCard
                        label={t("stats.lowStock")}
                        value={data.inventory.lowStockCount}
                        tone={
                            data.inventory.lowStockCount > 0
                                ? "warning"
                                : "default"
                        }
                    />

                    <StatCard
                        label={t("stats.inventoryValue")}
                        value={formatCurrency(
                            data.inventory.inventoryValue
                        )}
                    />
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>
                            {t("lowStockProducts.title")}
                        </CardTitle>

                        <CardActions>
                            <Link
                                href={`${base}/products?filter=low-stock`}
                                className={buttonVariants({
                                    variant: "ghost",
                                    size: "sm",
                                })}
                            >
                                {tActions("viewAll")}
                            </Link>
                        </CardActions>
                    </CardHeader>

                    <CardBody flush>
                        <DataTable
                            columns={lowStockColumns}
                            data={data.lowStockProducts}
                            getRowKey={(p) => p.id}
                            empty={
                                <EmptyState
                                    size="sm"
                                    title={t("lowStockProducts.emptyTitle")}
                                    description={t("lowStockProducts.emptyDescription")}
                                />
                            }
                        />
                    </CardBody>
                </Card>
            </section>

            {/* ─── Recent Activity ────────────────────────────────────────── */}

            <section
                aria-label={t("recentActivity")}
                className="grid gap-4 lg:grid-cols-2"
            >
                <Card>
                    <CardHeader>
                        <CardTitle>{tSales("recentSales")}</CardTitle>

                        <CardActions>
                            <Link
                                href={`${base}/sales`}
                                className={buttonVariants({
                                    variant: "ghost",
                                    size: "sm",
                                })}
                            >
                                {tActions("viewAll")}
                            </Link>
                        </CardActions>
                    </CardHeader>

                    <CardBody flush>
                        <DataTable
                            columns={recentSalesColumns}
                            data={data.recentSales}
                            getRowKey={(s) => s.id}
                            empty={
                                <EmptyState
                                    size="sm"
                                    title={tSales("empty.title")}
                                    description={tSales("empty.description")}
                                    action={
                                        <Link
                                            href={`${base}/sales/new`}
                                            className={buttonVariants({
                                                variant: "primary",
                                                size: "sm",
                                            })}
                                        >
                                            {tSales("createSale")}
                                        </Link>
                                    }
                                />
                            }
                        />
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>
                            {tPurchases("recentPurchases")}
                        </CardTitle>

                        <CardActions>
                            <Link
                                href={`${base}/purchases`}
                                className={buttonVariants({
                                    variant: "ghost",
                                    size: "sm",
                                })}
                            >
                                {tActions("viewAll")}
                            </Link>
                        </CardActions>
                    </CardHeader>

                    <CardBody flush>
                        <DataTable
                            columns={recentPurchasesColumns}
                            data={data.recentPurchases}
                            getRowKey={(p) => p.id}
                            empty={
                                <EmptyState
                                    size="sm"
                                    title={tPurchases("empty.title")}
                                    description={tPurchases("empty.description")}
                                    action={
                                        <Link
                                            href={`${base}/purchases/new`}
                                            className={buttonVariants({
                                                variant: "primary",
                                                size: "sm",
                                            })}
                                        >
                                            {tPurchases("newPurchase")}
                                        </Link>
                                    }
                                />
                            }
                        />
                    </CardBody>
                </Card>
            </section>
        </div>
    );
}
