import Link from "next/link";
import { getTranslations } from "next-intl/server";
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
/*  Row actions                                                               */
/* ========================================================================== */

function SaleRowActions({
    storeId,
    saleId,
    viewLabel,
}: {
    storeId: string;
    saleId: string;
    viewLabel: string;
}) {
    return (
        <Link
            href={`/stores/${storeId}/manager/sales/${saleId}`}
            aria-label={viewLabel}
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

    const t = await getTranslations("sales");
    const tCommon = await getTranslations("common");
    const tMembers = await getTranslations("members");
    const tActions = await getTranslations("actions");

    /* ---------- Fetch ---------- */

    const [salesResult, membersResult] = await Promise.all([
        getAllSales(storeId),
        getAllMembers(storeId),
    ]);

    if (salesResult instanceof AppError) {
        return (
            <ErrorState
                title={t("errors.loadFailed")}
                description={salesResult.message}
                action={
                    <Link
                        href={base}
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

    /* Members failing degrades gracefully — the Created By column falls
       back to a truncated user id. */
    const members: GetMembershipWithUser[] =
        membersResult instanceof AppError ? [] : membersResult;

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

    /* ---------- Enrich sales with creator names ---------- */

    const sales: SaleRow[] = salesResult.map((s) => ({
        ...s,
        createdByName:
            nameByUserId.get(s.createdById) ??
            s.createdById.slice(0, 8) + "…",
    }));

    const { rows, total, totalPages } = applyQuery(sales, query);

    /* ---------- Columns ---------- */

    const columns: Column<SaleRow>[] = [
        {
            key: "invoice",
            header: t("table.invoice"),
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
            header: tCommon("date"),
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
            header: t("detail.createdBy"),
            width: "w-40",
            cell: (s) => (
                <span className="text-on-surface-variant">{s.createdByName}</span>
            ),
        },
        {
            key: "total",
            header: tCommon("total"),
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
            header: t("table.paid"),
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
            header: t("table.due"),
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
            header: tCommon("status"),
            width: "w-28",
            cell: (s) => (
                <StatusBadge
                    status={getPaymentStatus(s.amountPaid, s.amountDue)}
                />
            ),
        },
    ];

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
                title={t("title")}
                description={t("description")}
                actions={
                    <Link
                        href={`${base}/new`}
                        className={buttonVariants({ variant: "primary", size: "sm" })}
                    >
                        {t("newSale")}
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
                            placeholder: t("filters.searchPlaceholder"),
                            label: t("filters.searchLabelAll"),
                        },
                        {
                            type: "select",
                            key: "payment",
                            label: t("filters.payment"),
                            options: [
                                { value: "all", label: t("filters.allPayments") },
                                { value: "paid", label: t("filters.paid") },
                                { value: "partial", label: t("filters.partial") },
                                { value: "unpaid", label: t("filters.unpaid") },
                            ],
                        },
                        {
                            type: "select",
                            key: "date",
                            label: t("filters.date"),
                            options: [
                                { value: "all", label: t("filters.allTime") },
                                { value: "today", label: t("filters.today") },
                                { value: "week", label: t("filters.last7Days") },
                                { value: "month", label: t("filters.thisMonth") },
                            ],
                        },
                    ]}
                />
            )}

            <DataTable
                columns={columns}
                data={rows}
                getRowKey={(s) => s.id}
                rowActions={(s) => (
                    <SaleRowActions
                        storeId={storeId}
                        saleId={s.id}
                        viewLabel={t("aria.viewSale")}
                    />
                )}
                empty={
                    hasAnySales && isFiltering ? (
                        <EmptyState
                            size="sm"
                            title={t("empty.filteredTitle")}
                            description={t("empty.filteredDescription")}
                        />
                    ) : (
                        <EmptyState
                            size="sm"
                            title={t("empty.title")}
                            description={t("empty.description")}
                            action={
                                <Link
                                    href={`${base}/new`}
                                    className={buttonVariants({
                                        variant: "primary",
                                        size: "sm",
                                    })}
                                >
                                    {t("createSale")}
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
                    {t("showingResults", {
                        from: (query.page - 1) * PAGE_SIZE + 1,
                        to: Math.min(query.page * PAGE_SIZE, total),
                        total,
                    })}
                </p>
            )}
        </div>
    );
}