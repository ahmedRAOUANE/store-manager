import Link from "next/link";
// import "temporal-polyfill/full/global";
import { Eye } from "lucide-react";

import { getAllSales } from "@/actions/sales.actions";
import { getAllMembers } from "@/actions/storeManagement.actions";
import { PageHeader } from "@/components/UI/page-header";
import { FilterBar } from "@/components/UI/filter-bar";
import { DataTable, Pagination, type Column } from "@/components/UI/data-table";
import { StatusBadge, getPaymentStatus } from "@/components/UI/status-badge";
import { EmptyState, ErrorState } from "@/components/UI/state";
import { buttonVariants } from "@/components/UI/btn";
import { AppError } from "@/errors/base.error";
import { formatCurrency, formatDate } from "@/utils/format";

import type { GetSale } from "@/zod/sale.schema";
import type { GetMembershipWithUser } from "@/zod/membership.schema";

/* ========================================================================== */
/*  Enriched row — createdByName joined from the members fetch                */
/* ========================================================================== */

type SaleRow = GetSale & {
    createdByName: string;
};

/* ========================================================================== */
/*  Query contract                                                            */
/* ========================================================================== */

const PAGE_SIZE = 10;

type PaymentFilter = "paid" | "partial" | "unpaid";
type DatePreset = "today" | "week" | "month" | "all";

interface SaleQuery {
    q?: string;
    payment?: PaymentFilter;
    date?: DatePreset;
    page: number;
}

function firstValue(v: string | string[] | undefined): string | undefined {
    return typeof v === "string" && v.length > 0 ? v : undefined;
}

function parseQuery(
    raw: Record<string, string | string[] | undefined>,
): SaleQuery {
    const page = Number.parseInt(firstValue(raw.page) ?? "1", 10);

    return {
        q: firstValue(raw.q),
        payment: firstValue(raw.payment) as PaymentFilter | undefined,
        date: firstValue(raw.date) as DatePreset | undefined,
        page: Number.isFinite(page) && page > 0 ? page : 1,
    };
}

/* -------------------------------------------------------------------------- */
/*  Server-side filter + paginate                                             */
/* -------------------------------------------------------------------------- */

function isWithinPreset(
    instant: Temporal.Instant,
    preset: DatePreset,
): boolean {
    if (preset === "all") return true;

    const nowZdt = Temporal.Now.instant().toZonedDateTimeISO("UTC");
    const targetZdt = instant.toZonedDateTimeISO("UTC");

    switch (preset) {
        case "today":
            return nowZdt.toPlainDate().equals(targetZdt.toPlainDate());
        case "week": {
            const startOfWeek = nowZdt.subtract({ days: 6 }).toPlainDate();
            return (
                Temporal.PlainDate.compare(targetZdt.toPlainDate(), startOfWeek) >= 0
            );
        }
        case "month": {
            const startOfMonth = nowZdt.toPlainDate().with({ day: 1 });
            return (
                Temporal.PlainDate.compare(targetZdt.toPlainDate(), startOfMonth) >= 0
            );
        }
    }
}

function applyQuery(
    sales: SaleRow[],
    query: SaleQuery,
): { rows: SaleRow[]; total: number; totalPages: number } {
    const needle = query.q?.toLowerCase();

    const filtered = sales.filter((sale) => {
        if (needle && !sale.invoiceNumber.toLowerCase().includes(needle)) {
            return false;
        }

        if (query.payment) {
            const status = getPaymentStatus(sale.amountPaid, sale.amountDue);
            const wanted =
                query.payment === "paid"
                    ? "PAID"
                    : query.payment === "partial"
                        ? "PARTIAL"
                        : "UNPAID";
            if (status !== wanted) return false;
        }

        if (query.date && !isWithinPreset(sale.saleDate, query.date)) {
            return false;
        }

        return true;
    });

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = Math.min(query.page, totalPages);
    const start = (page - 1) * PAGE_SIZE;

    return {
        rows: filtered.slice(start, start + PAGE_SIZE),
        total,
        totalPages,
    };
}

/* ========================================================================== */
/*  Columns                                                                   */
/* ========================================================================== */

const columns: Column<SaleRow>[] = [
    {
        key: "invoice",
        header: "Invoice",
        mobile: "primary",
        cell: (s) => (
            <Link
                href={`/stores/${s.storeId}/manager/sales/${s.id}`}
                className="font-mono text-body-sm font-medium text-on-surface hover:text-info"
            >
                {s.invoiceNumber}
            </Link>
        ),
    },
    {
        key: "date",
        header: "Date",
        mobile: "secondary",
        width: "w-32",
        cell: (s) => (
            <span className="text-on-surface-variant">
                {formatDate(s.saleDate)}
            </span>
        ),
    },
    {
        key: "createdBy",
        header: "Created By",
        width: "w-40",
        cell: (s) => (
            <span className="text-on-surface-variant">{s.createdByName}</span>
        ),
    },
    {
        key: "total",
        header: "Total",
        align: "right",
        width: "w-28",
        cell: (s) => (
            <span className="tabular-nums font-medium">
                {formatCurrency(s.totalAmount)}
            </span>
        ),
    },
    {
        key: "paid",
        header: "Paid",
        align: "right",
        width: "w-28",
        cell: (s) => (
            <span className="tabular-nums text-on-surface-variant">
                {formatCurrency(s.amountPaid)}
            </span>
        ),
    },
    {
        key: "due",
        header: "Due",
        align: "right",
        width: "w-28",
        cell: (s) => {
            if (s.amountDue <= 0) {
                return <span className="text-on-surface-variant">—</span>;
            }
            return (
                <span className="font-medium tabular-nums text-danger-fg">
                    {formatCurrency(s.amountDue)}
                </span>
            );
        },
    },
    {
        key: "status",
        header: "Status",
        width: "w-28",
        cell: (s) => (
            <StatusBadge
                status={getPaymentStatus(s.amountPaid, s.amountDue)}
            />
        ),
    },
];

/* ========================================================================== */
/*  Row actions                                                               */
/* ========================================================================== */

function SaleRowActions({
    storeId,
    saleId,
}: {
    storeId: string;
    saleId: string;
}) {
    return (
        <Link
            href={`/stores/${storeId}/manager/sales/${saleId}`}
            aria-label="View sale"
            className="inline-flex size-8 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-slate-100 hover:text-on-surface"
        >
            <Eye className="size-4" aria-hidden="true" />
        </Link>
    );
}

/* ========================================================================== */
/*  Page                                                                      */
/* ========================================================================== */

export default async function ManagerSalesPage({
    params,
    searchParams,
}: PageProps<"/stores/[storeId]/manager/sales">) {
    const { storeId } = await params;
    const sp = await searchParams;
    const query = parseQuery(sp);

    const base = `/stores/${storeId}/manager/sales`;

    /* ---------- Fetch ---------- */

    const [salesResult, membersResult] = await Promise.all([
        getAllSales(storeId),
        getAllMembers(storeId),
    ]);

    if (salesResult instanceof AppError) {
        return (
            <ErrorState
                title="Couldn't load sales"
                description={salesResult.message}
                action={
                    <Link
                        href={base}
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

    /* Members failing degrades gracefully — the Created By column falls
       back to a truncated user id. */
    const members: GetMembershipWithUser[] =
        membersResult instanceof AppError ? [] : membersResult;

    const nameByUserId = new Map(
        members.map((m) => {
            const fullName = [m.user.firstName, m.user.lastName]
                .filter(Boolean)
                .join(" ")
                .trim();
            return [m.userId, fullName || m.user.email || "Unnamed"];
        }),
    );

    /* ---------- Enrich sales with creator names ---------- */

    const sales: SaleRow[] = salesResult.map((s) => ({
        ...s,
        createdByName:
            nameByUserId.get(s.createdById) ??
            s.createdById.slice(0, 8) + "…",
    }));

    const { rows, total, totalPages } = applyQuery(sales, query);

    /* ---------- Derived ---------- */

    const buildHref = (page: number) => {
        const next = new URLSearchParams();
        if (query.q) next.set("q", query.q);
        if (query.payment) next.set("payment", query.payment);
        if (query.date) next.set("date", query.date);
        if (page > 1) next.set("page", String(page));
        const qs = next.toString();
        return qs ? `${base}?${qs}` : base;
    };

    const hasAnySales = sales.length > 0;
    const hasFilteredResults = rows.length > 0;
    const isFiltering = Boolean(query.q || query.payment || query.date);

    /* ---------- Render ---------- */

    return (
        <div className="space-y-4">
            <PageHeader
                title="Sales"
                description="Every completed sale for this store."
                actions={
                    <Link
                        href={`${base}/new`}
                        className={buttonVariants({ variant: "primary", size: "sm" })}
                    >
                        New Sale
                    </Link>
                }
            />

            {hasAnySales && (
                <FilterBar
                    basePath={base}
                    values={{
                        q: query.q,
                        payment: query.payment,
                        date: query.date,
                    }}
                    fields={[
                        {
                            type: "search",
                            key: "q",
                            placeholder: "Search by invoice number…",
                            label: "Search sales",
                        },
                        {
                            type: "select",
                            key: "payment",
                            label: "Payment",
                            options: [
                                { value: "all", label: "All payments" },
                                { value: "paid", label: "Paid" },
                                { value: "partial", label: "Partial" },
                                { value: "unpaid", label: "Unpaid" },
                            ],
                        },
                        {
                            type: "select",
                            key: "date",
                            label: "Date",
                            options: [
                                { value: "all", label: "All time" },
                                { value: "today", label: "Today" },
                                { value: "week", label: "Last 7 days" },
                                { value: "month", label: "This month" },
                            ],
                        },
                    ]}
                />
            )}

            <DataTable
                columns={columns}
                data={rows}
                getRowKey={(s) => s.id}
                rowActions={(s) => <SaleRowActions storeId={storeId} saleId={s.id} />}
                empty={
                    hasAnySales && isFiltering ? (
                        <EmptyState
                            size="sm"
                            title="No sales match your filters"
                            description="Try adjusting your search or clearing the filters."
                        />
                    ) : (
                        <EmptyState
                            size="sm"
                            title="No sales yet"
                            description="Sales will appear here once you complete your first sale."
                            action={
                                <Link
                                    href={`${base}/new`}
                                    className={buttonVariants({
                                        variant: "primary",
                                        size: "sm",
                                    })}
                                >
                                    Create Sale
                                </Link>
                            }
                        />
                    )
                }
            />

            {hasFilteredResults && totalPages > 1 && (
                <Pagination
                    currentPage={query.page}
                    totalPages={totalPages}
                    buildHref={buildHref}
                />
            )}

            {hasFilteredResults && (
                <p className="text-body-sm text-on-surface-variant">
                    Showing{" "}
                    <span className="tabular-nums">
                        {(query.page - 1) * PAGE_SIZE + 1}–
                        {Math.min(query.page * PAGE_SIZE, total)}
                    </span>{" "}
                    of <span className="tabular-nums">{total}</span> sales
                </p>
            )}
        </div>
    );
}