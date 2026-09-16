// // import "temporal-polyfill/full/global";

import Link from "next/link";

import { getManagementDashboard } from "@/actions/storeManagement.actions";
import { getAllSuppliers } from "@/actions/supplier.actions";
import { PageHeader } from "@/components/UI/page-header";
import { StatCard } from "@/components/UI/stats-card";
import {
    Card,
    CardActions,
    CardBody,
    CardHeader,
    CardTitle,
} from "@/components/UI/card";
import { DataTable, type Column } from "@/components/UI/data-table";
import {
    StatusBadge,
    getPaymentStatus,
} from "@/components/UI/status-badge";
import { EmptyState, ErrorState } from "@/components/UI/state";
import { buttonVariants } from "@/components/UI/btn";
import { AppError } from "@/errors/base.error";
import { formatCurrency, formatDate } from "@/utils/format";

import type { StoreDashboard } from "@/zod/storeDashboard.schema";

/* ========================================================================== */
/*  Enriched types                                                            */
/* ========================================================================== */

/** A recent purchase enriched with the supplier's name. */
type EnrichedPurchase = StoreDashboard["recentPurchases"][number]

/* ========================================================================== */
/*  Page                                                                      */
/* ========================================================================== */

export default async function ManagerDashboardPage({
    params,
}: PageProps<"/stores/[storeId]/manager/dashboard">) {
    const { storeId } = await params;
    const base = `/stores/${storeId}/manager`;

    /* ---------- Fetch dashboard + suppliers in parallel ---------- */

    const [dashboardResult, suppliersResult] = await Promise.all([
        getManagementDashboard(storeId),
        getAllSuppliers(storeId),
    ]);

    if (dashboardResult instanceof AppError) {
        return (
            <ErrorState
                title="Couldn't load your dashboard"
                description={dashboardResult.message}
                action={
                    <Link
                        href={`${base}/dashboard`}
                        className={buttonVariants({
                            variant: "secondary",
                            size: "md",
                        })}
                    >
                        Try Again
                    </Link>
                }
            />
        );
    }

    const data = dashboardResult;

    /* Suppliers failing degrades gracefully — recent purchases fall back to
       a truncated supplier id. */
    const suppliers =
        suppliersResult instanceof AppError ? [] : suppliersResult;

    const supplierNameById = new Map(
        suppliers.map((s) => [s.id, s.name]),
    );

    const recentPurchases: EnrichedPurchase[] = data.recentPurchases.map(
        (p) => ({
            ...p,
            supplierName:
                supplierNameById.get(p.supplier.id) ??
                p.supplier.id.slice(0, 8) + "…",
        }),
    );

    /* ---------- Derived: out-of-stock count ---------- */
    /* Not on the dashboard schema. Counting from the low-stock list works
       as long as the service returns the *full* set (typical for small
       stores). If the list is ever truncated, promote to a dedicated
       `inventory.outOfStockCount` field on `StoreDashboardSchema`. */
    const outOfStockCount = data.lowStockProducts.filter(
        (p) => p.stockQuantity <= 0,
    ).length;

    /* ---------- Render ---------- */

    return (
        <div className="min-h-full space-y-6">
            {/* ------------------------------------------------------------ */}
            {/* Header                                                        */}
            {/* ------------------------------------------------------------ */}

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

            {/* ------------------------------------------------------------ */}
            {/* Sales                                                         */}
            {/* ------------------------------------------------------------ */}

            <section className="space-y-3">
                <h2 className="text-title-md text-on-surface">Sales</h2>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        label="Today's sales"
                        value={data.sales.todayCount}
                        hint="Transactions today"
                    />

                    <StatCard
                        label="Today's revenue"
                        value={formatCurrency(data.sales.todayRevenue)}
                        hint="Revenue generated today"
                        tone="success"
                    />

                    <StatCard
                        label="This month's sales"
                        value={data.sales.monthCount}
                        hint="Transactions this month"
                    />

                    <StatCard
                        label="This month's revenue"
                        value={formatCurrency(data.sales.monthRevenue)}
                        hint="Revenue generated this month"
                        tone="success"
                    />
                </div>
            </section>

            {/* ------------------------------------------------------------ */}
            {/* Purchases                                                     */}
            {/* ------------------------------------------------------------ */}

            <section className="space-y-3">
                <h2 className="text-title-md text-on-surface">Purchases</h2>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        label="Today's purchases"
                        value={data.purchases.todayCount}
                        hint="Purchases today"
                    />

                    <StatCard
                        label="Today's spending"
                        value={formatCurrency(data.purchases.todayAmount)}
                        hint="Amount spent today"
                    />

                    <StatCard
                        label="This month's purchases"
                        value={data.purchases.monthCount}
                        hint="Purchases this month"
                    />

                    <StatCard
                        label="This month's spending"
                        value={formatCurrency(data.purchases.monthAmount)}
                        hint="Amount spent this month"
                    />
                </div>
            </section>

            {/* ------------------------------------------------------------ */}
            {/* Financial overview                                            */}
            {/* ------------------------------------------------------------ */}

            <section className="space-y-3">
                <h2 className="text-title-md text-on-surface">
                    Financial overview
                </h2>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <StatCard
                        label="Customer payments due"
                        value={formatCurrency(data.sales.outstanding)}
                        hint="Outstanding customer balances"
                        tone={
                            data.sales.outstanding > 0 ? "warning" : "success"
                        }
                    />

                    <StatCard
                        label="Supplier payments due"
                        value={formatCurrency(data.purchases.outstanding)}
                        hint="Outstanding supplier balances"
                        tone={
                            data.purchases.outstanding > 0
                                ? "warning"
                                : "success"
                        }
                    />

                    <StatCard
                        label="Gross profit this month"
                        value={formatCurrency(data.profit.month)}
                        hint="Sales revenue minus product cost"
                        tone="success"
                    />
                </div>
            </section>

            {/* ------------------------------------------------------------ */}
            {/* Inventory                                                     */}
            {/* ------------------------------------------------------------ */}

            <section className="space-y-3">
                <h2 className="text-title-md text-on-surface">Inventory</h2>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        label="Products"
                        value={data.inventory.productCount}
                        hint="Products in catalog"
                    />

                    <StatCard
                        label="Low stock"
                        value={data.inventory.lowStockCount}
                        hint="Products below minimum stock"
                        tone={
                            data.inventory.lowStockCount > 0
                                ? "warning"
                                : "success"
                        }
                    />

                    <StatCard
                        label="Out of stock"
                        value={outOfStockCount}
                        hint="Products with no stock"
                        tone={outOfStockCount > 0 ? "danger" : "success"}
                    />

                    <StatCard
                        label="Inventory value"
                        value={formatCurrency(data.inventory.inventoryValue)}
                        hint="Current inventory cost value"
                    />
                </div>
            </section>

            {/* ------------------------------------------------------------ */}
            {/* Low stock                                                     */}
            {/* ------------------------------------------------------------ */}

            <LowStockCard
                products={data.lowStockProducts}
                basePath={base}
            />

            {/* ------------------------------------------------------------ */}
            {/* Recent sales                                                  */}
            {/* ------------------------------------------------------------ */}

            <RecentSalesCard sales={data.recentSales} basePath={base} />

            {/* ------------------------------------------------------------ */}
            {/* Recent purchases                                              */}
            {/* ------------------------------------------------------------ */}

            <RecentPurchasesCard
                purchases={recentPurchases}
                basePath={base}
            />
        </div>
    );
}

/* ========================================================================== */
/*  Low stock                                                                 */
/* ========================================================================== */

type LowStockProduct = StoreDashboard["lowStockProducts"][number];

function LowStockCard({
    products,
    basePath,
}: {
    products: LowStockProduct[];
    basePath: string;
}) {
    const columns: Column<LowStockProduct>[] = [
        {
            key: "name",
            header: "Product",
            cell: (product) => product.name,
            mobile: "primary",
        },
        {
            key: "stock",
            header: "Stock",
            cell: (product) => product.stockQuantity,
            mobile: "secondary",
        },
        {
            key: "minimum",
            header: "Minimum",
            cell: (product) => product.minimumStock,
            mobile: "meta",
        },
        {
            key: "status",
            header: "Status",
            cell: (product) => (
                <StatusBadge
                    status={
                        product.stockQuantity <= 0
                            ? "OUT_OF_STOCK"
                            : "LOW_STOCK"
                    }
                />
            ),
            mobile: "meta",
        },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Low stock products</CardTitle>

                <CardActions>
                    <Link
                        href={`${basePath}/products`}
                        className="text-label-md text-info hover:underline"
                    >
                        View all
                    </Link>
                </CardActions>
            </CardHeader>

            <CardBody>
                {products.length > 0 ? (
                    <DataTable
                        columns={columns}
                        data={products}
                        getRowKey={(product) => product.id}
                    />
                ) : (
                    <EmptyState
                        title="No low-stock products"
                        description="All products are currently above their minimum stock level."
                    />
                )}
            </CardBody>
        </Card>
    );
}

/* ========================================================================== */
/*  Recent sales                                                              */
/* ========================================================================== */

type RecentSale = StoreDashboard["recentSales"][number];

function RecentSalesCard({
    sales,
    basePath,
}: {
    sales: RecentSale[];
    basePath: string;
}) {
    const columns: Column<RecentSale>[] = [
        {
            key: "invoice",
            header: "Invoice",
            cell: (sale) => (
                <Link
                    href={`${basePath}/sales/${sale.id}`}
                    className="font-medium hover:underline"
                >
                    {sale.invoiceNumber}
                </Link>
            ),
            mobile: "primary",
        },
        {
            key: "date",
            header: "Date",
            cell: (sale) => formatDate(sale.saleDate),
            mobile: "secondary",
        },
        {
            key: "amount",
            header: "Amount",
            cell: (sale) => formatCurrency(sale.totalAmount),
            align: "right",
            mobile: "meta",
        },
        {
            key: "payment",
            header: "Payment",
            /* `amountPaid` isn't on the schema — derived as total − due. */
            cell: (sale) => (
                <StatusBadge
                    status={getPaymentStatus(
                        sale.totalAmount - sale.amountDue,
                        sale.amountDue,
                    )}
                />
            ),
            mobile: "meta",
        },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent sales</CardTitle>

                <CardActions>
                    <Link
                        href={`${basePath}/sales`}
                        className="text-label-md text-info hover:underline"
                    >
                        View all
                    </Link>
                </CardActions>
            </CardHeader>

            <CardBody>
                {sales.length > 0 ? (
                    <DataTable
                        columns={columns}
                        data={sales}
                        getRowKey={(sale) => sale.id}
                    />
                ) : (
                    <EmptyState
                        title="No recent sales"
                        description="Sales will appear here once transactions are recorded."
                    />
                )}
            </CardBody>
        </Card>
    );
}

/* ========================================================================== */
/*  Recent purchases                                                          */
/* ========================================================================== */

function RecentPurchasesCard({
    purchases,
    basePath,
}: {
    purchases: EnrichedPurchase[];
    basePath: string;
}) {
    const columns: Column<EnrichedPurchase>[] = [
        {
            key: "invoice",
            header: "Invoice",
            cell: (purchase) => (
                <Link
                    href={`${basePath}/purchases/${purchase.id}`}
                    className="font-medium hover:underline"
                >
                    {purchase.invoiceNumber}
                </Link>
            ),
            mobile: "primary",
        },
        {
            key: "supplier",
            header: "Supplier",
            cell: (purchase) => purchase.supplier.name,
            mobile: "secondary",
        },
        {
            key: "date",
            header: "Date",
            cell: (purchase) => formatDate(purchase.purchaseDate),
            mobile: "meta",
        },
        {
            key: "amount",
            header: "Amount",
            cell: (purchase) => formatCurrency(purchase.totalAmount),
            align: "right",
            mobile: "meta",
        },
        {
            key: "payment",
            header: "Payment",
            /* Same derivation as recent sales. */
            cell: (purchase) => (
                <StatusBadge
                    status={getPaymentStatus(
                        purchase.totalAmount - purchase.amountDue,
                        purchase.amountDue,
                    )}
                />
            ),
            mobile: "meta",
        },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent purchases</CardTitle>

                <CardActions>
                    <Link
                        href={`${basePath}/purchases`}
                        className="text-label-md text-info hover:underline"
                    >
                        View all
                    </Link>
                </CardActions>
            </CardHeader>

            <CardBody>
                {purchases.length > 0 ? (
                    <DataTable
                        columns={columns}
                        data={purchases}
                        getRowKey={(purchase) => purchase.id}
                    />
                ) : (
                    <EmptyState
                        title="No recent purchases"
                        description="Purchases will appear here once they are recorded."
                    />
                )}
            </CardBody>
        </Card>
    );
}