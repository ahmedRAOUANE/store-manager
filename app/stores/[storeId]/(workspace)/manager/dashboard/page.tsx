import Link from "next/link";
import { getTranslations } from "next-intl/server";

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

    const t = await getTranslations("dashboard");
    const tHints = await getTranslations("dashboard.hints");
    const tRecentSales = await getTranslations("dashboard.recentSales");
    const tRecentPurchases = await getTranslations("dashboard.recentPurchases");
    const tSales = await getTranslations("sales");
    const tPurchases = await getTranslations("purchases");
    const tProducts = await getTranslations("products");
    const tCommon = await getTranslations("common");
    const tStatus = await getTranslations("status");
    const tSalesDetail = await getTranslations("sales.detail");
    const tActions = await getTranslations("actions");

    /* ---------- Fetch dashboard + suppliers in parallel ---------- */

    const [dashboardResult, suppliersResult] = await Promise.all([
        getManagementDashboard(storeId),
        getAllSuppliers(storeId),
    ]);

    if (dashboardResult instanceof AppError) {
        return (
            <ErrorState
                title={t("errors.loadFailed")}
                description={dashboardResult.message}
                action={
                    <Link
                        href={`${base}/dashboard`}
                        className={buttonVariants({
                            variant: "secondary",
                            size: "md",
                        })}
                    >
                        {tActions("tryAgain")}
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

    const outOfStockCount = data.lowStockProducts.filter(
        (p) => p.stockQuantity <= 0,
    ).length;

    /* ---------- Translated label bundles for the card helpers ---------- */

    const lowStockLabels: LowStockCardLabels = {
        title: t("lowStockProducts.title"),
        viewAll: tActions("viewAll"),
        columns: {
            product: tSalesDetail("product"),
            stock: tCommon("stock"),
            minimum: tProducts("detail.minimum"),
            status: tCommon("status"),
        },
        emptyTitle: t("lowStockProducts.emptyTitle"),
        emptyDescription: t("lowStockProducts.emptyDescription"),
    };

    const recentSalesLabels: RecentSalesCardLabels = {
        title: tSales("recentSales"),
        viewAll: tActions("viewAll"),
        columns: {
            invoice: tSales("table.invoice"),
            date: tCommon("date"),
            amount: tCommon("amount"),
            payment: tSalesDetail("payment"),
        },
        emptyTitle: tRecentSales("emptyTitle"),
        emptyDescription: tRecentSales("emptyDescription"),
    };

    const recentPurchasesLabels: RecentPurchasesCardLabels = {
        title: tPurchases("recentPurchases"),
        viewAll: tActions("viewAll"),
        columns: {
            invoice: tSales("table.invoice"),
            supplier: tPurchases("supplierBar.supplier"),
            date: tCommon("date"),
            amount: tCommon("amount"),
            payment: tSalesDetail("payment"),
        },
        emptyTitle: tRecentPurchases("emptyTitle"),
        emptyDescription: tRecentPurchases("emptyDescription"),
    };

    /* ---------- Render ---------- */

    return (
        <div className="min-h-full space-y-6">
            {/* ------------------------------------------------------------ */}
            {/* Header                                                        */}
            {/* ------------------------------------------------------------ */}

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

            {/* ------------------------------------------------------------ */}
            {/* Sales                                                         */}
            {/* ------------------------------------------------------------ */}

            <section className="space-y-3">
                <h2 className="text-title-md text-on-surface">
                    {tSales("title")}
                </h2>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        label={t("stats.todaySales")}
                        value={data.sales.todayCount}
                        hint={tHints("transactionsToday")}
                    />

                    <StatCard
                        label={t("stats.todayRevenue")}
                        value={formatCurrency(data.sales.todayRevenue)}
                        hint={tHints("revenueGeneratedToday")}
                        tone="success"
                    />

                    <StatCard
                        label={t("stats.monthlySales")}
                        value={data.sales.monthCount}
                        hint={tHints("transactionsThisMonth")}
                    />

                    <StatCard
                        label={t("stats.monthlyRevenue")}
                        value={formatCurrency(data.sales.monthRevenue)}
                        hint={tHints("revenueGeneratedThisMonth")}
                        tone="success"
                    />
                </div>
            </section>

            {/* ------------------------------------------------------------ */}
            {/* Purchases                                                     */}
            {/* ------------------------------------------------------------ */}

            <section className="space-y-3">
                <h2 className="text-title-md text-on-surface">
                    {tPurchases("title")}
                </h2>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        label={t("stats.todayPurchases")}
                        value={data.purchases.todayCount}
                        hint={tHints("purchasesToday")}
                    />

                    <StatCard
                        label={t("stats.todaySpending")}
                        value={formatCurrency(data.purchases.todayAmount)}
                        hint={tHints("amountSpentToday")}
                    />

                    <StatCard
                        label={t("stats.monthlyPurchases")}
                        value={data.purchases.monthCount}
                        hint={tHints("purchasesThisMonth")}
                    />

                    <StatCard
                        label={t("stats.monthlySpending")}
                        value={formatCurrency(data.purchases.monthAmount)}
                        hint={tHints("amountSpentThisMonth")}
                    />
                </div>
            </section>

            {/* ------------------------------------------------------------ */}
            {/* Financial overview                                            */}
            {/* ------------------------------------------------------------ */}

            <section className="space-y-3">
                <h2 className="text-title-md text-on-surface">
                    {t("financialOverview")}
                </h2>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <StatCard
                        label={t("stats.customerPaymentsDue")}
                        value={formatCurrency(data.sales.outstanding)}
                        hint={tHints("outstandingCustomerBalances")}
                        tone={
                            data.sales.outstanding > 0 ? "warning" : "success"
                        }
                    />

                    <StatCard
                        label={t("stats.supplierPaymentsDue")}
                        value={formatCurrency(data.purchases.outstanding)}
                        hint={tHints("outstandingSupplierBalances")}
                        tone={
                            data.purchases.outstanding > 0
                                ? "warning"
                                : "success"
                        }
                    />

                    <StatCard
                        label={t("stats.grossProfitMonth")}
                        value={formatCurrency(data.profit.month)}
                        hint={tHints("revenueMinusCost")}
                        tone="success"
                    />
                </div>
            </section>

            {/* ------------------------------------------------------------ */}
            {/* Inventory                                                     */}
            {/* ------------------------------------------------------------ */}

            <section className="space-y-3">
                <h2 className="text-title-md text-on-surface">
                    {tProducts("inventory")}
                </h2>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        label={tProducts("title")}
                        value={data.inventory.productCount}
                        hint={tHints("productsInCatalog")}
                    />

                    <StatCard
                        label={t("stats.lowStock")}
                        value={data.inventory.lowStockCount}
                        hint={tHints("productsBelowMinimum")}
                        tone={
                            data.inventory.lowStockCount > 0
                                ? "warning"
                                : "success"
                        }
                    />

                    <StatCard
                        label={tStatus("outOfStock")}
                        value={outOfStockCount}
                        hint={tHints("productsWithNoStock")}
                        tone={outOfStockCount > 0 ? "danger" : "success"}
                    />

                    <StatCard
                        label={t("stats.inventoryValue")}
                        value={formatCurrency(data.inventory.inventoryValue)}
                        hint={tHints("currentInventoryCostValue")}
                    />
                </div>
            </section>

            {/* ------------------------------------------------------------ */}
            {/* Low stock                                                     */}
            {/* ------------------------------------------------------------ */}

            <LowStockCard
                products={data.lowStockProducts}
                basePath={base}
                labels={lowStockLabels}
            />

            {/* ------------------------------------------------------------ */}
            {/* Recent sales                                                  */}
            {/* ------------------------------------------------------------ */}

            <RecentSalesCard
                sales={data.recentSales}
                basePath={base}
                labels={recentSalesLabels}
            />

            {/* ------------------------------------------------------------ */}
            {/* Recent purchases                                              */}
            {/* ------------------------------------------------------------ */}

            <RecentPurchasesCard
                purchases={recentPurchases}
                basePath={base}
                labels={recentPurchasesLabels}
            />
        </div>
    );
}

/* ========================================================================== */
/*  Low stock                                                                 */
/* ========================================================================== */

type LowStockProduct = StoreDashboard["lowStockProducts"][number];

interface LowStockCardLabels {
    title: string;
    viewAll: string;
    columns: {
        product: string;
        stock: string;
        minimum: string;
        status: string;
    };
    emptyTitle: string;
    emptyDescription: string;
}

function LowStockCard({
    products,
    basePath,
    labels,
}: {
    products: LowStockProduct[];
    basePath: string;
    labels: LowStockCardLabels;
}) {
    const columns: Column<LowStockProduct>[] = [
        {
            key: "name",
            header: labels.columns.product,
            cell: (product) => product.name,
            mobile: "primary",
        },
        {
            key: "stock",
            header: labels.columns.stock,
            cell: (product) => product.stockQuantity,
            mobile: "secondary",
        },
        {
            key: "minimum",
            header: labels.columns.minimum,
            cell: (product) => product.minimumStock,
            mobile: "meta",
        },
        {
            key: "status",
            header: labels.columns.status,
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
                <CardTitle>{labels.title}</CardTitle>

                <CardActions>
                    <Link
                        href={`${basePath}/products`}
                        className="text-label-md text-info hover:underline"
                    >
                        {labels.viewAll}
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
                        title={labels.emptyTitle}
                        description={labels.emptyDescription}
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

interface RecentSalesCardLabels {
    title: string;
    viewAll: string;
    columns: {
        invoice: string;
        date: string;
        amount: string;
        payment: string;
    };
    emptyTitle: string;
    emptyDescription: string;
}

function RecentSalesCard({
    sales,
    basePath,
    labels,
}: {
    sales: RecentSale[];
    basePath: string;
    labels: RecentSalesCardLabels;
}) {
    const columns: Column<RecentSale>[] = [
        {
            key: "invoice",
            header: labels.columns.invoice,
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
            header: labels.columns.date,
            cell: (sale) => formatDate(sale.saleDate),
            mobile: "secondary",
        },
        {
            key: "amount",
            header: labels.columns.amount,
            cell: (sale) => formatCurrency(sale.totalAmount),
            align: "right",
            mobile: "meta",
        },
        {
            key: "payment",
            header: labels.columns.payment,
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
                <CardTitle>{labels.title}</CardTitle>

                <CardActions>
                    <Link
                        href={`${basePath}/sales`}
                        className="text-label-md text-info hover:underline"
                    >
                        {labels.viewAll}
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
                        title={labels.emptyTitle}
                        description={labels.emptyDescription}
                    />
                )}
            </CardBody>
        </Card>
    );
}

/* ========================================================================== */
/*  Recent purchases                                                          */
/* ========================================================================== */

interface RecentPurchasesCardLabels {
    title: string;
    viewAll: string;
    columns: {
        invoice: string;
        supplier: string;
        date: string;
        amount: string;
        payment: string;
    };
    emptyTitle: string;
    emptyDescription: string;
}

function RecentPurchasesCard({
    purchases,
    basePath,
    labels,
}: {
    purchases: EnrichedPurchase[];
    basePath: string;
    labels: RecentPurchasesCardLabels;
}) {
    const columns: Column<EnrichedPurchase>[] = [
        {
            key: "invoice",
            header: labels.columns.invoice,
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
            header: labels.columns.supplier,
            cell: (purchase) => purchase.supplier.name,
            mobile: "secondary",
        },
        {
            key: "date",
            header: labels.columns.date,
            cell: (purchase) => formatDate(purchase.purchaseDate),
            mobile: "meta",
        },
        {
            key: "amount",
            header: labels.columns.amount,
            cell: (purchase) => formatCurrency(purchase.totalAmount),
            align: "right",
            mobile: "meta",
        },
        {
            key: "payment",
            header: labels.columns.payment,
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
                <CardTitle>{labels.title}</CardTitle>

                <CardActions>
                    <Link
                        href={`${basePath}/purchases`}
                        className="text-label-md text-info hover:underline"
                    >
                        {labels.viewAll}
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
                        title={labels.emptyTitle}
                        description={labels.emptyDescription}
                    />
                )}
            </CardBody>
        </Card>
    );
}