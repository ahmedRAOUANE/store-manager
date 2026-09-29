import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Eye } from "lucide-react";

import { PageHeader } from "@/components/UI/page-header";
import { FilterBar } from "@/components/UI/filter-bar";
import {
    DataTable,
    Pagination,
    type Column,
} from "@/components/UI/data-table";
import {
    StatusBadge,
    getPaymentStatus,
} from "@/components/UI/status-badge";
import { EmptyState } from "@/components/UI/state";
import { buttonVariants } from "@/components/UI/btn";
import { formatCurrency, formatDate } from "@/utils/format";

import type { GetSale } from "@/zod/sale.schema";
import { getAllSales } from "@/actions/sales.actions";
import { AppError } from "@/errors/base.error";

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

function firstValue(
    value: string | string[] | undefined,
): string | undefined {
    return typeof value === "string" && value.length > 0
        ? value
        : undefined;
}

function parseQuery(
    raw: Record<string, string | string[] | undefined>,
): SaleQuery {
    const page = Number.parseInt(
        firstValue(raw.page) ?? "1",
        10,
    );

    const payment = firstValue(raw.payment);
    const date = firstValue(raw.date);

    return {
        q: firstValue(raw.q),

        payment:
            payment === "paid" ||
                payment === "partial" ||
                payment === "unpaid"
                ? payment
                : undefined,

        date:
            date === "today" ||
                date === "week" ||
                date === "month" ||
                date === "all"
                ? date
                : undefined,

        page:
            Number.isFinite(page) && page > 0
                ? page
                : 1,
    };
}

/* ========================================================================== */
/*  Filtering + pagination                                                    */
/* ========================================================================== */

function isWithinPreset(
    instant: Temporal.Instant,
    preset: DatePreset,
): boolean {
    if (preset === "all") {
        return true;
    }

    const nowZdt = Temporal.Now.instant().toZonedDateTimeISO("UTC");
    const targetZdt = instant.toZonedDateTimeISO("UTC");

    switch (preset) {
        case "today":
            return nowZdt
                .toPlainDate()
                .equals(targetZdt.toPlainDate());

        case "week": {
            const startOfWeek = nowZdt
                .subtract({ days: 6 })
                .toPlainDate();

            return (
                Temporal.PlainDate.compare(
                    targetZdt.toPlainDate(),
                    startOfWeek,
                ) >= 0
            );
        }

        case "month": {
            const startOfMonth = nowZdt
                .toPlainDate()
                .with({ day: 1 });

            return (
                Temporal.PlainDate.compare(
                    targetZdt.toPlainDate(),
                    startOfMonth,
                ) >= 0
            );
        }
    }
}

function applyQuery(
    sales: GetSale[],
    query: SaleQuery,
): {
    rows: GetSale[];
    total: number;
    totalPages: number;
    currentPage: number;
} {
    const needle = query.q?.toLowerCase();

    const filtered = sales.filter((sale) => {
        if (
            needle &&
            !sale.invoiceNumber.toLowerCase().includes(needle)
        ) {
            return false;
        }

        if (query.payment) {
            const status = getPaymentStatus(
                sale.amountPaid,
                sale.amountDue,
            );

            const wanted =
                query.payment === "paid"
                    ? "PAID"
                    : query.payment === "partial"
                        ? "PARTIAL"
                        : "UNPAID";

            if (status !== wanted) {
                return false;
            }
        }

        if (
            query.date &&
            !isWithinPreset(sale.saleDate, query.date)
        ) {
            return false;
        }

        return true;
    });

    const total = filtered.length;

    const totalPages = Math.max(
        1,
        Math.ceil(total / PAGE_SIZE),
    );

    const currentPage = Math.min(
        query.page,
        totalPages,
    );

    const start = (currentPage - 1) * PAGE_SIZE;

    return {
        rows: filtered.slice(
            start,
            start + PAGE_SIZE,
        ),
        total,
        totalPages,
        currentPage,
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
            href={`/stores/${storeId}/owner/sales/${saleId}`}
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

export default async function SalesPage({
    params,
    searchParams,
}: PageProps<"/stores/[storeId]/owner/sales">) {
    const { storeId } = await params;
    const sp = await searchParams;

    const query = parseQuery(sp);

    const t = await getTranslations("sales");
    const tCommon = await getTranslations("common");

    const sales = await getAllSales(storeId);

    /*
     * Keep AppError handling at the UI boundary.
     *
     * Replace this with your existing error-state/redirect strategy
     * if you already have one for AppError responses.
     */
    if (sales instanceof AppError) {
        return (
            <EmptyState
                size="sm"
                title={t("errors.loadFailed")}
                description={sales.message}
            />
        );
    }

    const {
        rows,
        total,
        totalPages,
        currentPage,
    } = applyQuery(sales, query);

    const base = `/stores/${storeId}/owner/sales`;

    const buildHref = (page: number) => {
        const next = new URLSearchParams();

        if (query.q) {
            next.set("q", query.q);
        }

        if (query.payment) {
            next.set("payment", query.payment);
        }

        if (query.date) {
            next.set("date", query.date);
        }

        if (page > 1) {
            next.set("page", String(page));
        }

        const qs = next.toString();

        return qs
            ? `${base}?${qs}`
            : base;
    };

    /* ---------- Columns ---------- */

    const columns: Column<GetSale>[] = [
        {
            key: "invoice",
            header: t("table.invoice"),
            mobile: "primary",
            cell: (sale) => (
                <Link
                    href={`/stores/${sale.storeId}/owner/sales/${sale.id}`}
                    className="font-mono text-body-sm font-medium text-on-surface hover:text-info"
                >
                    {sale.invoiceNumber}
                </Link>
            ),
        },
        {
            key: "date",
            header: tCommon("date"),
            mobile: "secondary",
            width: "w-32",
            cell: (sale) => (
                <span className="text-on-surface-variant">
                    {formatDate(sale.saleDate)}
                </span>
            ),
        },
        {
            key: "total",
            header: tCommon("total"),
            align: "right",
            width: "w-28",
            cell: (sale) => (
                <span className="font-medium">
                    {formatCurrency(sale.totalAmount)}
                </span>
            ),
        },
        {
            key: "paid",
            header: t("table.paid"),
            align: "right",
            width: "w-28",
            cell: (sale) => (
                <span className="text-on-surface-variant">
                    {formatCurrency(sale.amountPaid)}
                </span>
            ),
        },
        {
            key: "due",
            header: t("table.due"),
            align: "right",
            width: "w-28",
            cell: (sale) => {
                if (sale.amountDue <= 0) {
                    return (
                        <span className="text-on-surface-variant">
                            —
                        </span>
                    );
                }

                return (
                    <span className="font-medium text-danger-fg tabular-nums">
                        {formatCurrency(sale.amountDue)}
                    </span>
                );
            },
        },
        {
            key: "status",
            header: tCommon("status"),
            width: "w-28",
            cell: (sale) => (
                <StatusBadge
                    status={getPaymentStatus(
                        sale.amountPaid,
                        sale.amountDue,
                    )}
                />
            ),
        },
    ];

    /* ---------- Derived ---------- */

    const hasAnySales = sales.length > 0;
    const hasFilteredResults = rows.length > 0;

    const isFiltering = Boolean(
        query.q ||
        query.payment ||
        (query.date && query.date !== "all"),
    );

    return (
        <div className="space-y-4">
            <PageHeader
                title={t("title")}
                description={t("description")}
                actions={
                    <Link
                        href={`${base}/new`}
                        className={
                            buttonVariants({
                                variant: "primary",
                                size: "sm",
                            })
                        }
                    >
                        {t("newSale")}
                    </Link>
                }
            />

            {
                hasAnySales && (
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
                                    {
                                        value: "all",
                                        label: t("filters.allPayments"),
                                    },
                                    {
                                        value: "paid",
                                        label: t("filters.paid"),
                                    },
                                    {
                                        value: "partial",
                                        label: t("filters.partial"),
                                    },
                                    {
                                        value: "unpaid",
                                        label: t("filters.unpaid"),
                                    },
                                ],
                            },
                            {
                                type: "select",
                                key: "date",
                                label: t("filters.date"),
                                options: [
                                    {
                                        value: "all",
                                        label: t("filters.allTime"),
                                    },
                                    {
                                        value: "today",
                                        label: t("filters.today"),
                                    },
                                    {
                                        value: "week",
                                        label: t("filters.last7Days"),
                                    },
                                    {
                                        value: "month",
                                        label: t("filters.thisMonth"),
                                    },
                                ],
                            },
                        ]}
                    />
                )
            }

            <DataTable
                columns={columns}
                data={rows}
                getRowKey={(sale) => sale.id}
                rowActions={(sale) => (
                    <SaleRowActions
                        storeId={storeId}
                        saleId={sale.id}
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

            {
                hasFilteredResults && totalPages > 1 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        buildHref={buildHref}
                    />
                )
            }

            {
                hasFilteredResults && (
                    <p className="text-body-sm text-on-surface-variant">
                        {t("showingResults", {
                            from: (currentPage - 1) * PAGE_SIZE + 1,
                            to: Math.min(
                                currentPage * PAGE_SIZE,
                                total,
                            ),
                            total,
                        })}
                    </p>
                )
            }
        </div>
    );
}