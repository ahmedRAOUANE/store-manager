import Link from "next/link";
// import "temporal-polyfill/full/global";

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
import { formatCurrency, formatDate } from "@/utils/format";

import type { StaffDashboard } from "@/zod/storeDashboard.schema";

/* ========================================================================== */
/*  Column type helpers                                                       */
/* ========================================================================== */

type RecentSale = StaffDashboard["recentSales"][number];
type LowStockProduct = StaffDashboard["lowStockProducts"][number];

/* ========================================================================== */
/*  Mock data                                                                 */
/*  Replace with a server-side fetch. The page shape won't change.            */
/* ========================================================================== */

const dashboard: StaffDashboard = {
    sales: {
        todayCount: 18,
        todayRevenue: 1284.5,
    },
    inventory: {
        productCount: 248,
        lowStockCount: 6,
    },
    recentSales: [
        {
            id: "55555555-0001-4000-8000-000000000001",
            invoiceNumber: "INV-2026-0438",
            totalAmount: 124.5,
            amountDue: 0,
            saleDate: Temporal.Instant.from("2026-09-12T14:22:00Z"),
        },
        {
            id: "55555555-0002-4000-8000-000000000002",
            invoiceNumber: "INV-2026-0437",
            totalAmount: 68.0,
            amountDue: 68.0,
            saleDate: Temporal.Instant.from("2026-09-12T13:05:00Z"),
        },
        {
            id: "55555555-0003-4000-8000-000000000003",
            invoiceNumber: "INV-2026-0436",
            totalAmount: 310.75,
            amountDue: 110.75,
            saleDate: Temporal.Instant.from("2026-09-12T11:48:00Z"),
        },
        {
            id: "55555555-0004-4000-8000-000000000004",
            invoiceNumber: "INV-2026-0435",
            totalAmount: 45.2,
            amountDue: 0,
            saleDate: Temporal.Instant.from("2026-09-12T10:32:00Z"),
        },
        {
            id: "55555555-0005-4000-8000-000000000005",
            invoiceNumber: "INV-2026-0434",
            totalAmount: 89.9,
            amountDue: 0,
            saleDate: Temporal.Instant.from("2026-09-12T09:15:00Z"),
        },
    ],
    lowStockProducts: [
        {
            id: "33333333-3333-4333-8333-000000000001",
            name: "Organic Hass Avocado",
            sku: "PRD-AVO-001",
            stockQuantity: 3,
            minimumStock: 10,
        },
        {
            id: "33333333-3333-4333-8333-000000000002",
            name: "Sourdough Loaf",
            sku: "PRD-BRD-014",
            stockQuantity: 5,
            minimumStock: 12,
        },
        {
            id: "33333333-3333-4333-8333-000000000003",
            name: "Cold Brew Concentrate",
            sku: "PRD-CFE-007",
            stockQuantity: 2,
            minimumStock: 8,
        },
        {
            id: "33333333-3333-4333-8333-000000000004",
            name: "Greek Yogurt (500g)",
            sku: "PRD-YGT-002",
            stockQuantity: 6,
            minimumStock: 15,
        },
        {
            id: "33333333-3333-4333-8333-000000000005",
            name: "Free-Range Eggs (Dozen)",
            sku: "PRD-EGG-003",
            stockQuantity: 4,
            minimumStock: 20,
        },
    ],
};

/* ========================================================================== */
/*  Column definitions                                                        */
/* ========================================================================== */

const recentSalesColumns: Column<RecentSale>[] = [
    {
        key: "invoice",
        header: "Invoice",
        mobile: "primary",
        cell: (s) => (
            <span className="font-mono text-body-sm">{s.invoiceNumber}</span>
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
                status={getPaymentStatus(s.totalAmount - s.amountDue, s.amountDue)}
            />
        ),
    },
];

const lowStockColumns: Column<LowStockProduct>[] = [
    {
        key: "product",
        header: "Product",
        mobile: "primary",
        cell: (p) => <span className="font-medium">{p.name}</span>,
    },
    {
        key: "sku",
        header: "SKU",
        mobile: "secondary",
        cell: (p) => <span className="font-mono text-body-sm">{p.sku}</span>,
    },
    {
        key: "stock",
        header: "Stock",
        align: "right",
        width: "w-32",
        cell: (p) => (
            <span className="tabular-nums">
                <span className="font-medium text-warning-fg">{p.stockQuantity}</span>
                <span className="text-on-surface-variant"> / {p.minimumStock}</span>
            </span>
        ),
    },
];

/* ========================================================================== */
/*  Page                                                                      */
/* ========================================================================== */

export default async function StaffDashboardPage({
    params,
}: {
    params: Promise<{ storeId: string }>;
}) {
    const { storeId } = await params;

    const base = `/stores/${storeId}/staff`;
    const data = dashboard;

    return (
        <div className="space-y-6">
            {/* ─── Header + Quick Actions ─────────────────────────────────── */}
            <PageHeader
                title="Dashboard"
                description="Today's activity at a glance."
                actions={
                    <>
                        <Link
                            href={`${base}/sales/new`}
                            className={buttonVariants({ variant: "primary", size: "sm" })}
                        >
                            New Sale
                        </Link>
                        <Link
                            href={`${base}/sales/new`}
                            className={buttonVariants({ variant: "secondary", size: "sm" })}
                        >
                            Search Product
                        </Link>
                    </>
                }
            />

            {/* ─── Summary — 4 tiles, no financials ───────────────────────── */}
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
                    label="Products"
                    value={data.inventory.productCount}
                />
                <StatCard
                    label="Low Stock"
                    value={data.inventory.lowStockCount}
                    tone={data.inventory.lowStockCount > 0 ? "warning" : "default"}
                />
            </section>

            {/* ─── Low Stock Products ─────────────────────────────────────── */}
            <Card>
                <CardHeader>
                    <CardTitle>Low Stock Products</CardTitle>
                    <CardActions>
                        <Link
                            href={`${base}/sales/new`}
                            className={buttonVariants({ variant: "ghost", size: "sm" })}
                        >
                            Check stock
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
                                description="Nothing is below its minimum stock level today."
                            />
                        }
                    />
                </CardBody>
            </Card>

            {/* ─── Recent Sales ───────────────────────────────────────────── */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Sales</CardTitle>
                    <CardActions>
                        <Link
                            href={`${base}/sales`}
                            className={buttonVariants({ variant: "ghost", size: "sm" })}
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
                                title="No sales yet today"
                                description="Sales will appear here as soon as you complete one."
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
        </div>
    );
}