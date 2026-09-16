import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
// import "temporal-polyfill/full/global";

import { getSupplierById } from "@/actions/supplier.actions";
import { getAllPurchases } from "@/actions/purchase.actions";
import { PageHeader } from "@/components/UI/page-header";
import { StatCard } from "@/components/UI/stats-card";
import {
    Card,
    CardHeader,
    CardTitle,
    CardActions,
    CardBody,
} from "@/components/UI/card";
import { DataTable, type Column } from "@/components/UI/data-table";
import { StatusBadge, getPaymentStatus } from "@/components/UI/status-badge";
import { EmptyState } from "@/components/UI/state";
import { buttonVariants } from "@/components/UI/btn";
import { AppError } from "@/errors/base.error";
import { cn } from "@/utils/jsx-classes";
import { formatCurrency, formatDate, formatDateTime } from "@/utils/format";

import type { GetSupplier } from "@/zod/supplier.schema";
import type { GetPurchase } from "@/zod/purchase.schema";

/* ========================================================================== */
/*  Local extension — aggregates derived from the purchases list              */
/* ========================================================================== */

type SupplierDetail = GetSupplier & {
    outstandingAmount: number;
    totalPurchased: number;
    totalPaid: number;
    purchaseCount: number;
};

type RecentPurchase = Pick<
    GetPurchase,
    | "id"
    | "storeId"
    | "invoiceNumber"
    | "totalAmount"
    | "amountPaid"
    | "amountDue"
    | "createdAt"
>;

/* ========================================================================== */
/*  Constants                                                                 */
/* ========================================================================== */

/** How many recent purchases to show before "View all". */
const RECENT_LIMIT = 5;

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
/*  History link — a bordered row with a trailing chevron                     */
/* ========================================================================== */

function HistoryLink({ href, label }: { href: string; label: string }) {
    return (
        <Link
            href={href}
            className={cn(
                "flex items-center justify-between rounded-md border border-outline-variant px-3 py-2",
                "text-body-md text-on-surface transition-colors",
                "hover:border-outline hover:bg-slate-50",
            )}
        >
            <span>{label}</span>
            <ChevronRight
                className="size-3.5 text-on-surface-variant"
                aria-hidden="true"
            />
        </Link>
    );
}

/* ========================================================================== */
/*  Recent purchases columns                                                  */
/* ========================================================================== */

function buildPurchaseColumns(storeId: string): Column<RecentPurchase>[] {
    return [
        {
            key: "invoice",
            header: "Invoice",
            mobile: "primary",
            cell: (p) => (
                <Link
                    href={`/stores/${storeId}/manager/purchases/${p.id}`}
                    className="font-mono text-body-sm font-medium text-on-surface hover:text-info"
                >
                    {p.invoiceNumber ?? "—"}
                </Link>
            ),
        },
        {
            key: "date",
            header: "Date",
            mobile: "secondary",
            width: "w-32",
            cell: (p) => (
                <span className="text-on-surface-variant">
                    {formatDate(p.createdAt)}
                </span>
            ),
        },
        {
            key: "total",
            header: "Total",
            align: "right",
            width: "w-28",
            cell: (p) => (
                <span className="font-medium tabular-nums">
                    {formatCurrency(p.totalAmount)}
                </span>
            ),
        },
        {
            key: "due",
            header: "Due",
            align: "right",
            width: "w-28",
            cell: (p) => {
                if (p.amountDue <= 0) {
                    return <span className="text-on-surface-variant">—</span>;
                }
                return (
                    <span className="font-medium tabular-nums text-danger-fg">
                        {formatCurrency(p.amountDue)}
                    </span>
                );
            },
        },
        {
            key: "status",
            header: "Status",
            width: "w-28",
            cell: (p) => (
                <StatusBadge
                    status={getPaymentStatus(p.amountPaid, p.amountDue)}
                />
            ),
        },
    ];
}

/* ========================================================================== */
/*  Page                                                                      */
/* ========================================================================== */

export default async function ManagerSupplierDetailPage({
    params,
}: PageProps<"/stores/[storeId]/manager/suppliers/[supplierId]">) {
    const { storeId, supplierId } = await params;

    const base = `/stores/${storeId}/manager/suppliers`;
    const purchasesBase = `/stores/${storeId}/manager/purchases`;

    /* ---------- Fetch ---------- */

    const [supplierResult, purchasesResult] = await Promise.all([
        getSupplierById(storeId, supplierId),
        getAllPurchases(storeId),
    ]);

    if (supplierResult instanceof AppError) notFound();

    /* Purchases failing degrades gracefully — aggregates read zero and the
       recent-purchases table shows its empty state. */
    const allPurchases =
        purchasesResult instanceof AppError ? [] : purchasesResult;

    /* ---------- Filter + aggregate ---------- */

    const supplierPurchases = allPurchases.filter(
        (p) => p.supplierId === supplierId,
    );

    const aggregates = supplierPurchases.reduce(
        (acc, p) => {
            acc.totalPurchased += p.totalAmount;
            acc.totalPaid += p.amountPaid;
            if (p.amountDue > 0) acc.outstandingAmount += p.amountDue;
            return acc;
        },
        { totalPurchased: 0, totalPaid: 0, outstandingAmount: 0 },
    );

    const detail: SupplierDetail = {
        ...supplierResult,
        outstandingAmount: aggregates.outstandingAmount,
        totalPurchased: aggregates.totalPurchased,
        totalPaid: aggregates.totalPaid,
        purchaseCount: supplierPurchases.length,
    };

    const recentPurchases: RecentPurchase[] = [...supplierPurchases]
        .sort((a, b) => Temporal.Instant.compare(b.createdAt, a.createdAt))
        .slice(0, RECENT_LIMIT);

    /* ---------- Derived ---------- */

    const columns = buildPurchaseColumns(storeId);
    const hasOutstanding = detail.outstandingAmount > 0;
    const hasContactInfo =
        Boolean(detail.phone) ||
        Boolean(detail.email) ||
        Boolean(detail.address);

    /* ---------- Render ---------- */

    return (
        <div className="space-y-6">
            <PageHeader
                title={detail.name}
                description={
                    detail.purchaseCount > 0 ? (
                        <span className="tabular-nums">
                            {detail.purchaseCount}{" "}
                            {detail.purchaseCount === 1 ? "order" : "orders"}
                        </span>
                    ) : (
                        <span className="text-on-surface-variant">
                            No purchases yet
                        </span>
                    )
                }
                breadcrumbs={[
                    { label: "Suppliers", href: base },
                    { label: detail.name },
                ]}
                backHref={base}
                actions={
                    <Link
                        href={`${base}/${detail.id}/edit`}
                        className={buttonVariants({ variant: "primary", size: "sm" })}
                    >
                        Edit Supplier
                    </Link>
                }
            />

            {/* ─── At-a-glance metrics ────────────────────────────────────── */}
            <section
                aria-label="Supplier summary"
                className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4"
            >
                <StatCard
                    label="Outstanding"
                    value={formatCurrency(detail.outstandingAmount)}
                    tone={hasOutstanding ? "danger" : "default"}
                    hint={hasOutstanding ? "Owed to this supplier" : "All settled"}
                />
                <StatCard
                    label="Total Purchased"
                    value={formatCurrency(detail.totalPurchased)}
                />
                <StatCard
                    label="Total Paid"
                    value={formatCurrency(detail.totalPaid)}
                    tone="success"
                />
                <StatCard
                    label="Orders"
                    value={detail.purchaseCount}
                    hint="All time"
                />
            </section>

            {/* ─── Body ───────────────────────────────────────────────────── */}
            <div className="grid gap-4 lg:grid-cols-3">
                {/* Main column */}
                <div className="space-y-4 lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Contact Information</CardTitle>
                        </CardHeader>
                        <CardBody>
                            {hasContactInfo ? (
                                <dl className="divide-y divide-outline-variant">
                                    {detail.phone && (
                                        <DetailRow label="Phone" mono>
                                            <a
                                                href={`tel:${detail.phone.replace(/\s+/g, "")}`}
                                                className="hover:text-info"
                                            >
                                                {detail.phone}
                                            </a>
                                        </DetailRow>
                                    )}
                                    {detail.email && (
                                        <DetailRow label="Email">
                                            <a
                                                href={`mailto:${detail.email}`}
                                                className="truncate hover:text-info"
                                            >
                                                {detail.email}
                                            </a>
                                        </DetailRow>
                                    )}
                                    {detail.address && (
                                        <DetailRow label="Address">
                                            <span className="whitespace-pre-line">
                                                {detail.address}
                                            </span>
                                        </DetailRow>
                                    )}
                                </dl>
                            ) : (
                                <p className="text-body-md text-on-surface-variant">
                                    No contact details on file.
                                </p>
                            )}
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

                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Purchases</CardTitle>
                            <CardActions>
                                <Link
                                    href={`${purchasesBase}?supplier=${detail.id}`}
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
                                columns={columns}
                                data={recentPurchases}
                                getRowKey={(p) => p.id}
                                empty={
                                    <EmptyState
                                        size="sm"
                                        title="No purchases yet"
                                        description="Purchases recorded from this supplier will appear here."
                                        action={
                                            <Link
                                                href={`${purchasesBase}/new`}
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
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Account</CardTitle>
                        </CardHeader>
                        <CardBody>
                            <dl className="divide-y divide-outline-variant">
                                <DetailRow label="Outstanding">
                                    {hasOutstanding ? (
                                        <span className="font-medium tabular-nums text-danger-fg">
                                            {formatCurrency(detail.outstandingAmount)}
                                        </span>
                                    ) : (
                                        <span className="text-on-surface-variant">—</span>
                                    )}
                                </DetailRow>
                                <DetailRow label="Total purchased">
                                    <span className="tabular-nums">
                                        {formatCurrency(detail.totalPurchased)}
                                    </span>
                                </DetailRow>
                                <DetailRow label="Total paid">
                                    <span className="tabular-nums text-success-fg">
                                        {formatCurrency(detail.totalPaid)}
                                    </span>
                                </DetailRow>
                                {detail.taxNumber && (
                                    <DetailRow label="Tax number" mono>
                                        {detail.taxNumber}
                                    </DetailRow>
                                )}
                            </dl>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Record</CardTitle>
                        </CardHeader>
                        <CardBody>
                            <dl className="divide-y divide-outline-variant">
                                <DetailRow label="Supplier ID" mono>
                                    <span className="truncate" title={detail.id}>
                                        {detail.id.slice(0, 8)}…
                                    </span>
                                </DetailRow>
                                <DetailRow label="Added">
                                    {formatDateTime(detail.createdAt)}
                                </DetailRow>
                                <DetailRow label="Updated">
                                    {formatDateTime(detail.updatedAt)}
                                </DetailRow>
                            </dl>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>History</CardTitle>
                        </CardHeader>
                        <CardBody className="space-y-2">
                            <HistoryLink
                                href={`${purchasesBase}?supplier=${detail.id}`}
                                label="All purchases"
                            />
                            <HistoryLink
                                href={`${purchasesBase}?supplier=${detail.id}&payment=unpaid`}
                                label="Unpaid purchases"
                            />
                            <HistoryLink
                                href={`${purchasesBase}/new`}
                                label="Record a purchase"
                            />
                        </CardBody>
                    </Card>
                </div>
            </div>
        </div>
    );
}