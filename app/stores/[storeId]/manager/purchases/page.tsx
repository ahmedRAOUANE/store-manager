import Link from "next/link";
// import "temporal-polyfill/full/global";
import { Eye } from "lucide-react";

import { getAllPurchases } from "@/actions/purchase.actions";
import { getAllSuppliers } from "@/actions/supplier.actions";
import { PageHeader } from "@/components/UI/page-header";
import { FilterBar } from "@/components/UI/filter-bar";
import { DataTable, Pagination, type Column } from "@/components/UI/data-table";
import { StatusBadge, getPaymentStatus } from "@/components/UI/status-badge";
import { EmptyState, ErrorState } from "@/components/UI/state";
import { buttonVariants } from "@/components/UI/btn";
import { AppError } from "@/errors/base.error";
import { formatCurrency, formatDate } from "@/utils/format";

import type { GetPurchase } from "@/zod/purchase.schema";

/* ========================================================================== */
/*  Purchase row                                                              */
/* ========================================================================== */

type PurchaseRow = GetPurchase;

/* ========================================================================== */
/*  Query contract                                                            */
/* ========================================================================== */

const PAGE_SIZE = 10;

type PaymentFilter = "paid" | "partial" | "unpaid";
type DatePreset = "today" | "week" | "month" | "all";

interface PurchaseQuery {
    q?: string;
    supplier?: string;
    payment?: PaymentFilter;
    date?: DatePreset;
    page: number;
}

function firstValue(
    v: string | string[] | undefined,
): string | undefined {
    return typeof v === "string" && v.length > 0 ? v : undefined;
}

function parseQuery(
    raw: Record<string, string | string[] | undefined>,
): PurchaseQuery {
    const page = Number.parseInt(
        firstValue(raw.page) ?? "1",
        10,
    );

    return {
        q: firstValue(raw.q),
        supplier: firstValue(raw.supplier),
        payment: firstValue(raw.payment) as
            | PaymentFilter
            | undefined,
        date: firstValue(raw.date) as
            | DatePreset
            | undefined,
        page:
            Number.isFinite(page) && page > 0
                ? page
                : 1,
    };
}

/* ========================================================================== */
/*  Server-side filter + paginate                                             */
/* ========================================================================== */

function isWithinPreset(
    instant: Temporal.Instant,
    preset: DatePreset,
): boolean {
    if (preset === "all") return true;

    const nowZdt =
        Temporal.Now.instant().toZonedDateTimeISO("UTC");

    const targetZdt =
        instant.toZonedDateTimeISO("UTC");

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
    purchases: PurchaseRow[],
    query: PurchaseQuery,
): {
    rows: PurchaseRow[];
    total: number;
    totalPages: number;
} {
    const needle = query.q?.toLowerCase();

    const filtered = purchases.filter((p) => {
        /* ---------- Invoice search ---------- */

        if (
            needle &&
            !p.invoiceNumber
                ?.toLowerCase()
                .includes(needle)
        ) {
            return false;
        }

        /* ---------- Supplier filter ---------- */

        if (
            query.supplier &&
            p.supplierId !== query.supplier
        ) {
            return false;
        }

        /* ---------- Payment filter ---------- */

        if (query.payment) {
            const status = getPaymentStatus(
                p.amountPaid,
                p.amountDue,
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

        /* ---------- Purchase date filter ---------- */

        if (
            query.date &&
            !isWithinPreset(
                p.purchaseDate,
                query.date,
            )
        ) {
            return false;
        }

        return true;
    });

    /*
     * getAllPurchases() already returns purchases ordered
     * newest first by purchaseDate.
     *
     * Therefore we intentionally do not sort here.
     */

    const total = filtered.length;

    const totalPages = Math.max(
        1,
        Math.ceil(total / PAGE_SIZE),
    );

    const page = Math.min(
        query.page,
        totalPages,
    );

    const start =
        (page - 1) * PAGE_SIZE;

    return {
        rows: filtered.slice(
            start,
            start + PAGE_SIZE,
        ),
        total,
        totalPages,
    };
}

/* ========================================================================== */
/*  Columns                                                                   */
/* ========================================================================== */

const columns: Column<PurchaseRow>[] = [
    {
        key: "invoice",
        header: "Invoice",
        mobile: "primary",
        cell: (p) => (
            <Link
                href={`/stores/${p.storeId}/manager/purchases/${p.id}`}
                className="font-mono text-body-sm font-medium text-on-surface hover:text-info"
            >
                {p.invoiceNumber ?? "—"}
            </Link>
        ),
    },

    {
        key: "supplier",
        header: "Supplier",
        mobile: "secondary",
        width: "w-44",
        cell: (p) => {
            if (!p.supplier) {
                return (
                    <span className="text-on-surface-variant">
                        No supplier
                    </span>
                );
            }

            return (
                <Link
                    href={`/stores/${p.storeId}/manager/suppliers/${p.supplier.id}`}
                    className="text-on-surface-variant hover:text-info"
                >
                    {p.supplier.name}
                </Link>
            );
        },
    },

    {
        key: "date",
        header: "Date",
        width: "w-32",
        cell: (p) => (
            <span className="text-on-surface-variant">
                {formatDate(p.purchaseDate)}
            </span>
        ),
    },

    {
        key: "total",
        header: "Total",
        align: "right",
        width: "w-28",
        cell: (p) => (
            <span className="tabular-nums font-medium">
                {formatCurrency(p.totalAmount)}
            </span>
        ),
    },

    {
        key: "paid",
        header: "Paid",
        align: "right",
        width: "w-28",
        cell: (p) => (
            <span className="tabular-nums text-on-surface-variant">
                {formatCurrency(p.amountPaid)}
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
                return (
                    <span className="text-on-surface-variant">
                        —
                    </span>
                );
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
                status={getPaymentStatus(
                    p.amountPaid,
                    p.amountDue,
                )}
            />
        ),
    },
];

/* ========================================================================== */
/*  Row actions                                                               */
/* ========================================================================== */

function PurchaseRowActions({
    storeId,
    purchaseId,
}: {
    storeId: string;
    purchaseId: string;
}) {
    return (
        <Link
            href={`/stores/${storeId}/manager/purchases/${purchaseId}`}
            aria-label="View purchase"
            className="inline-flex size-8 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-slate-100 hover:text-on-surface"
        >
            <Eye
                className="size-4"
                aria-hidden="true"
            />
        </Link>
    );
}

/* ========================================================================== */
/*  Page                                                                      */
/* ========================================================================== */

export default async function ManagerPurchasesPage({
    params,
    searchParams,
}: PageProps<"/stores/[storeId]/manager/purchases">) {
    const { storeId } = await params;
    const sp = await searchParams;
    const query = parseQuery(sp);

    const base =
        `/stores/${storeId}/manager/purchases`;

    /* ---------- Fetch ---------- */

    const [
        purchasesResult,
        suppliersResult,
    ] = await Promise.all([
        getAllPurchases(storeId),
        getAllSuppliers(storeId),
    ]);

    if (
        purchasesResult instanceof AppError
    ) {
        return (
            <ErrorState
                title="Couldn't load purchases"
                description={
                    purchasesResult.message
                }
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

    /*
     * Suppliers failing degrades gracefully.
     * The supplier filter simply has no options.
     *
     * Purchases themselves already contain their
     * supplier relation.
     */
    const suppliers =
        suppliersResult instanceof AppError
            ? []
            : suppliersResult;

    /*
     * No supplier-name enrichment is necessary anymore.
     *
     * getAllPurchases() returns:
     *
     * purchase.supplier
     *
     * directly from the Purchase relation.
     */
    const purchases: PurchaseRow[] =
        purchasesResult;

    const {
        rows,
        total,
        totalPages,
    } = applyQuery(
        purchases,
        query,
    );

    /* ---------- Derived ---------- */

    const buildHref = (page: number) => {
        const next =
            new URLSearchParams();

        if (query.q) {
            next.set("q", query.q);
        }

        if (query.supplier) {
            next.set(
                "supplier",
                query.supplier,
            );
        }

        if (query.payment) {
            next.set(
                "payment",
                query.payment,
            );
        }

        if (query.date) {
            next.set(
                "date",
                query.date,
            );
        }

        if (page > 1) {
            next.set(
                "page",
                String(page),
            );
        }

        const qs = next.toString();

        return qs
            ? `${base}?${qs}`
            : base;
    };

    const supplierOptions = [...suppliers]
        .sort((a, b) =>
            a.name.localeCompare(b.name),
        )
        .map((s) => ({
            value: s.id,
            label: s.name,
        }));

    const hasAnyPurchases =
        purchases.length > 0;

    const hasFilteredResults =
        rows.length > 0;

    const isFiltering = Boolean(
        query.q ||
        query.supplier ||
        query.payment ||
        query.date,
    );

    /* ---------- Render ---------- */

    return (
        <div className="space-y-4">
            <PageHeader
                title="Purchases"
                description="Stock purchased from your suppliers."
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
                        New Purchase
                    </Link >
                }
            />

            {
                hasAnyPurchases && (
                    <FilterBar
                        basePath={base}
                        values={{
                            q: query.q,
                            supplier: query.supplier,
                            payment: query.payment,
                            date: query.date,
                        }}
                        fields={[
                            {
                                type: "search",
                                key: "q",
                                placeholder:
                                    "Search by invoice number…",
                                label: "Search purchases",
                            },

                            {
                                type: "select",
                                key: "supplier",
                                label: "Supplier",
                                options: [
                                    {
                                        value: "all",
                                        label: "All suppliers",
                                    },
                                    ...supplierOptions,
                                ],
                            },

                            {
                                type: "select",
                                key: "payment",
                                label: "Payment",
                                options: [
                                    {
                                        value: "all",
                                        label: "All payments",
                                    },
                                    {
                                        value: "paid",
                                        label: "Paid",
                                    },
                                    {
                                        value: "partial",
                                        label: "Partial",
                                    },
                                    {
                                        value: "unpaid",
                                        label: "Unpaid",
                                    },
                                ],
                            },

                            {
                                type: "select",
                                key: "date",
                                label: "Date",
                                options: [
                                    {
                                        value: "all",
                                        label: "All time",
                                    },
                                    {
                                        value: "today",
                                        label: "Today",
                                    },
                                    {
                                        value: "week",
                                        label: "Last 7 days",
                                    },
                                    {
                                        value: "month",
                                        label: "This month",
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
                getRowKey={(p) => p.id}
                rowActions={(p) => (
                    <PurchaseRowActions
                        storeId={storeId}
                        purchaseId={p.id}
                    />
                )}
                empty={
                    hasAnyPurchases &&
                        isFiltering ? (
                        <EmptyState
                            size="sm"
                            title="No purchases match your filters"
                            description="Try adjusting your search or clearing the filters."
                        />
                    ) : (
                        <EmptyState
                            size="sm"
                            title="No purchases yet"
                            description="Purchases you record from suppliers will appear here."
                            action={
                                <Link
                                    href={`${base}/new`}
                                    className={buttonVariants({
                                        variant: "primary",
                                        size: "sm",
                                    })}
                                >
                                    New Purchase
                                </Link>
                            }
                        />
                    )
                }
            />

            {
                hasFilteredResults &&
                totalPages > 1 && (
                    <Pagination
                        currentPage={
                            query.page
                        }
                        totalPages={
                            totalPages
                        }
                        buildHref={
                            buildHref
                        }
                    />
                )
            }

            {
                hasFilteredResults && (
                    <p className="text-body-sm text-on-surface-variant">
                        Showing{" "}
                        <span className="tabular-nums">
                            {(query.page -
                                1) *
                                PAGE_SIZE +
                                1}
                            –
                            {Math.min(
                                query.page *
                                PAGE_SIZE,
                                total,
                            )}
                        </span>{" "}
                        of{" "}
                        <span className="tabular-nums">
                            {total}
                        </span>{" "}
                        purchases
                    </p>
                )
            }
        </div >
    );
}

