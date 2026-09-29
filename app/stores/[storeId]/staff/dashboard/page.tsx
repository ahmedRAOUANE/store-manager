import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/UI/page-header";
import {
    Card,
    CardHeader,
    CardTitle,
    CardBody,
} from "@/components/UI/card";
import { buttonVariants } from "@/components/UI/btn";
import { EmptyState } from "@/components/UI/state";

/* ========================================================================== */
/*  Column type helpers                                                       */
/* ========================================================================== */

// type RecentSale = StaffDashboard["recentSales"][number];
// type LowStockProduct = StaffDashboard["lowStockProducts"][number];

/* ========================================================================== */
/*  Column definitions                                                        */
/* ========================================================================== */

// const recentSalesColumns: Column<RecentSale>[] = [
//     {
//         key: "invoice",
//         header: "Invoice",
//         mobile: "primary",
//         cell: (s) => (
//             <span className="font-mono text-body-sm">{s.invoiceNumber}</span>
//         ),
//     },
//     {
//         key: "date",
//         header: "Date",
//         mobile: "secondary",
//         cell: (s) => formatDate(s.saleDate),
//     },
//     {
//         key: "amount",
//         header: "Amount",
//         align: "right",
//         width: "w-28",
//         cell: (s) => formatCurrency(s.totalAmount),
//     },
//     {
//         key: "status",
//         header: "Status",
//         width: "w-28",
//         cell: (s) => (
//             <StatusBadge
//                 status={getPaymentStatus(s.totalAmount - s.amountDue, s.amountDue)}
//             />
//         ),
//     },
// ];

// const lowStockColumns: Column<LowStockProduct>[] = [
//     {
//         key: "product",
//         header: "Product",
//         mobile: "primary",
//         cell: (p) => <span className="font-medium">{p.name}</span>,
//     },
//     {
//         key: "sku",
//         header: "SKU",
//         mobile: "secondary",
//         cell: (p) => <span className="font-mono text-body-sm">{p.sku}</span>,
//     },
//     {
//         key: "stock",
//         header: "Stock",
//         align: "right",
//         width: "w-32",
//         cell: (p) => (
//             <span className="tabular-nums">
//                 <span className="font-medium text-warning-fg">{p.stockQuantity}</span>
//                 <span className="text-on-surface-variant"> / {p.minimumStock}</span>
//             </span>
//         ),
//     },
// ];

/* ========================================================================== */
/*  Page                                                                      */
/* ========================================================================== */

export default async function StaffDashboardPage({
    params,
}: {
    params: Promise<{ storeId: string }>;
}) {
    const { storeId } = await params;

    const navigationT = await getTranslations("navigation");
    const dashboardT = await getTranslations("dashboard");
    const salesT = await getTranslations("sales");

    const base = `/stores/${storeId}/staff`;
    // const data = dashboard;

    return (
        <div className="space-y-6">
            {/* ─── Header + Quick Actions ─────────────────────────────────── */}
            <PageHeader
                title={navigationT("dashboard")}
                description={dashboardT("staffDescription")}
                actions={
                    <>
                        <Link
                            href={`${base}/sales/new`}
                            className={buttonVariants({
                                variant: "primary",
                                size: "sm",
                            })}
                        >
                            {salesT("newSale")}
                        </Link>
                        {/* <Link
                            href={`${base}/sales/new`}
                            className={buttonVariants({ variant: "secondary", size: "sm" })}
                        >
                            Search Product
                        </Link> */}
                    </>
                }
            />

            {/* ─── Summary — 4 tiles, no financials ───────────────────────── */}
            {/* <section
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
            </section> */}

            {/* ─── Low Stock Products ─────────────────────────────────────── */}
            {/* <Card>
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
            </Card> */}

            {/* ─── Recent Sales ───────────────────────────────────────────── */}
            <Card>
                <CardHeader>
                    <CardTitle>{salesT("recentSales")}</CardTitle>
                    {/* <CardActions>
                        <Link
                            href={`${base}/sales`}
                            className={buttonVariants({ variant: "ghost", size: "sm" })}
                        >
                            View all
                        </Link>
                    </CardActions> */}
                </CardHeader>
                <CardBody flush>
                    {/* <DataTable
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
                    /> */}
                    <EmptyState title={dashboardT("comingSoon")} />
                </CardBody>
            </Card>
        </div>
    );
}
