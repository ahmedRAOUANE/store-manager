// import "temporal-polyfill/full/global";
import Link from "next/link";

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
/*  Column definitions                                                        */
/* ========================================================================== */

const lowStockColumns: Column<StoreDashboard["lowStockProducts"][number]>[] = [
    {
        key: "product",
        header: "Product",
        mobile: "primary",
        cell: (p) => (
            <span className="font-medium">{p.name}</span>
        ),
    },
    {
        key: "sku",
        header: "SKU",
        mobile: "secondary",
        cell: (p) => (
            <span className="font-mono text-body-sm">
                {p.sku}
            </span>
        ),
    },
    {
        key: "stock",
        header: "Stock",
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

const recentSalesColumns: Column<StoreDashboard["recentSales"][number]>[] = [
    {
        key: "invoice",
        header: "Invoice",
        mobile: "primary",
        cell: (s) => (
            <span className="font-mono text-body-sm">
                {s.invoiceNumber}
            </span>
        ),
    },
    {
        key: "date",
        header: "Date",
        mobile: "secondary",
        cell: (s) => formatDate(s.saleDate),
    },
    {
        key: "amount",
        header: "Amount",
        align: "right",
        width: "w-28",
        cell: (s) => formatCurrency(s.totalAmount),
    },
    {
        key: "status",
        header: "Status",
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
            header: "Invoice",
            mobile: "primary",
            cell: (p) => (
                <span className="font-mono text-body-sm">
                    {p.invoiceNumber}
                </span>
            ),
        },
        {
            key: "supplier",
            header: "Supplier",
            mobile: "secondary",
            cell: () => "Unknown",
        },
        {
            key: "amount",
            header: "Amount",
            align: "right",
            width: "w-28",
            cell: (p) => formatCurrency(p.totalAmount),
        },
        {
            key: "status",
            header: "Status",
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

/* ========================================================================== */
/*  Page                                                                      */
/* ========================================================================== */

export default async function StoreDashboardPage(
    { params }: PageProps<"/stores/[storeId]/owner/dashboard">
) {
    const storeId = (await params).storeId;

    const base = `/stores/${storeId}/owner`;

    const data = await getManagementDashboard(storeId);

    if (data instanceof AppError) {
        return (
            <div className="space-y-6 min-h-full">
                <PageHeader
                    title="Dashboard"
                    description="A quick overview of your store's activity."
                />

                <EmptyState
                    title="No data found"
                    description="We couldn't load the dashboard data for this store."
                />
            </div>
        );
    }

    return (
        <div className="space-y-6 min-h-full">
            {/* ─── Header + Quick Actions ─────────────────────────────────── */}

            <PageHeader
                title="Dashboard"
                description="A quick overview of your store's activity."
                actions={
                    <>
                        <Link
                            href={`${base}/sales/new`}
                            className={buttonVariants({
                                variant: "primary",
                                size: "sm",
                            })}
                        >
                            New Sale
                        </Link>

                        <Link
                            href={`${base}/products/new`}
                            className={buttonVariants({
                                variant: "secondary",
                                size: "sm",
                            })}
                        >
                            Add Product
                        </Link>

                        <Link
                            href={`${base}/purchases/new`}
                            className={buttonVariants({
                                variant: "secondary",
                                size: "sm",
                            })}
                        >
                            New Purchase
                        </Link>
                    </>
                }
            />

            {/* ─── Summary cards ──────────────────────────────────────────── */}

            <section
                aria-label="Summary"
                className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4"
            >
                <StatCard
                    label="Today's Sales"
                    value={data.sales.todayCount}
                    hint={formatCurrency(data.sales.todayRevenue)}
                />

                <StatCard
                    label="Today's Revenue"
                    value={formatCurrency(data.sales.todayRevenue)}
                />

                <StatCard
                    label="Monthly Sales"
                    value={data.purchases.monthCount}
                    hint={formatCurrency(data.purchases.monthAmount)}
                />

                <StatCard
                    label="Monthly Purchases"
                    value={formatCurrency(data.purchases.monthAmount)}
                />

                <StatCard
                    label="Customer Outstanding"
                    value={formatCurrency(data.sales.outstanding)}
                    tone={
                        data.sales.outstanding > 0
                            ? "warning"
                            : "default"
                    }
                />

                <StatCard
                    label="Supplier Outstanding"
                    value={formatCurrency(data.purchases.outstanding)}
                    tone={
                        data.purchases.outstanding > 0
                            ? "warning"
                            : "default"
                    }
                />

                <StatCard
                    label="Inventory Value"
                    value={formatCurrency(data.inventory.inventoryValue)}
                />

                <StatCard
                    label="Gross Profit (Month)"
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
                aria-label="Inventory"
                className="space-y-3"
            >
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    <StatCard
                        label="Total Products"
                        value={data.inventory.productCount}
                    />

                    <StatCard
                        label="Low Stock"
                        value={data.inventory.lowStockCount}
                        tone={
                            data.inventory.lowStockCount > 0
                                ? "warning"
                                : "default"
                        }
                    />

                    <StatCard
                        label="Inventory Value"
                        value={formatCurrency(
                            data.inventory.inventoryValue
                        )}
                    />
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>
                            Low Stock Products
                        </CardTitle>

                        <CardActions>
                            <Link
                                href={`${base}/products?filter=low-stock`}
                                className={buttonVariants({
                                    variant: "ghost",
                                    size: "sm",
                                })}
                            >
                                View all
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
                                    title="All products are well-stocked"
                                    description="No items are below their minimum stock level."
                                />
                            }
                        />
                    </CardBody>
                </Card>
            </section>

            {/* ─── Recent Activity ────────────────────────────────────────── */}

            <section
                aria-label="Recent activity"
                className="grid gap-4 lg:grid-cols-2"
            >
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Sales</CardTitle>

                        <CardActions>
                            <Link
                                href={`${base}/sales`}
                                className={buttonVariants({
                                    variant: "ghost",
                                    size: "sm",
                                })}
                            >
                                View all
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
                                    title="No sales yet"
                                    description="Sales will appear here once you complete your first sale."
                                    action={
                                        <Link
                                            href={`${base}/sales/new`}
                                            className={buttonVariants({
                                                variant: "primary",
                                                size: "sm",
                                            })}
                                        >
                                            Create Sale
                                        </Link>
                                    }
                                />
                            }
                        />
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Recent Purchases</CardTitle>

                        <CardActions>
                            <Link
                                href={`${base}/purchases`}
                                className={buttonVariants({
                                    variant: "ghost",
                                    size: "sm",
                                })}
                            >
                                View all
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
                                    title="No purchases yet"
                                    description="Purchases you record from suppliers will appear here."
                                    action={
                                        <Link
                                            href={`${base}/purchases/new`}
                                            className={buttonVariants({
                                                variant: "primary",
                                                size: "sm",
                                            })}
                                        >
                                            New Purchase
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
