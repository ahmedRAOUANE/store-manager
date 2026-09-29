import Link from "next/link";
import { getTranslations } from "next-intl/server";
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
/*  Local extension — `supplierName` is joined from the suppliers fetch       */
/* ========================================================================== */

type PurchaseRow = GetPurchase & {
    /** Resolved from the suppliers list — not on the purchase schema. */
    supplierName: string;
};

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

function firstValue(v: string | string[] | undefined): string | undefined {
    return typeof v === "string" && v.length > 0 ? v : undefined;
}

function parseQuery(
    raw: Record<string, string | string[] | undefined>,
): PurchaseQuery {
    const page = Number.parseInt(firstValue(raw.page) ?? "1", 10);

    return {
        q: firstValue(raw.q),
        supplier: firstValue(raw.supplier),
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
    purchases: PurchaseRow[],
    query: PurchaseQuery,
): { rows: PurchaseRow[]; total: number; totalPages: number } {
    const needle = query.q?.toLowerCase();

    const filtered = purchases.filter((p) => {
        if (needle && !p.invoiceNumber?.toLowerCase().includes(needle)) {
            return false;
        }
        if (query.supplier && p.supplierId !== query.supplier) return false;

        if (query.payment) {
            const status = getPaymentStatus(p.amountPaid, p.amountDue);
            const wanted =
                query.payment === "paid"
                    ? "PAID"
                    : query.payment === "partial"
                        ? "PARTIAL"
                        : "UNPAID";
            if (status !== wanted) return false;
        }

        if (query.date && !isWithinPreset(p.createdAt, query.date)) {
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

function PurchaseRowActions({
    storeId,
    purchaseId,
    viewLabel,
}: {
    storeId: string;
    purchaseId: string;
    viewLabel: string;
}) {
    return (
        <Link
            href={`/stores/${storeId}/owner/purchases/${purchaseId}`}
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

export default async function PurchasesPage({
    params,
    searchParams,
}: PageProps<"/stores/[storeId]/owner/purchases">) {
    const { storeId } = await params;
    const sp = await searchParams;
    const query = parseQuery(sp);

    const base = `/stores/${storeId}/owner/purchases`;

    const t = await getTranslations("purchases");
    const tCommon = await getTranslations("common");
    const tSales = await getTranslations("sales");
    const tActions = await getTranslations("actions");

    /* ---------- Fetch ---------- */

    const [purchasesResult, suppliersResult] = await Promise.all([
        getAllPurchases(storeId),
        getAllSuppliers(storeId),
    ]);

    if (purchasesResult instanceof AppError) {
        return (
            <ErrorState
                title={t("errors.loadFailed")}
                description={purchasesResult.message}
                action={
                    <Link
                        href={base}
                        className={buttonVariants({ variant: "secondary", size: "md" })}
                    >
                        {tActions("tryAgain")}
                    </Link>
                }
            />
        );
    }

    /* Suppliers degrade gracefully — a failure here doesn't block the list,
       it just means the supplier column falls back to a truncated id. */
    const suppliers =
        suppliersResult instanceof AppError ? [] : suppliersResult;

    const supplierNameById = new Map(
        suppliers.map((s) => [s.id, s.name]),
    );

    /* ---------- Enrich purchases with supplier names ---------- */

    const purchases: PurchaseRow[] = purchasesResult.map((p) => ({
        ...p,
        supplierName:
            supplierNameById.get(p.supplierId) ?? p.supplierId.slice(0, 8) + "…",
    }));

    const { rows, total, totalPages } = applyQuery(purchases, query);

    /* ---------- Columns ---------- */

    const columns: Column<PurchaseRow>[] = [
        {
            key: "invoice",
            header: tSales("table.invoice"),
            mobile: "primary",
            cell: (p) => (
                <Link
                    href={`/stores/${p.storeId}/owner/purchases/${p.id}`}
                    className="font-mono text-body-sm font-medium text-on-surface hover:text-info"
                >
                    {p.invoiceNumber ?? "—"}
                </Link>
            ),
        },
        {
            key: "supplier",
            header: t("supplierBar.supplier"),
            mobile: "secondary",
            width: "w-44",
            cell: (p) => (
                <Link
                    href={`/stores/${p.storeId}/owner/suppliers/${p.supplierId}`}
                    className="text-on-surface-variant hover:text-info"
                >
                    {p.supplierName}
                </Link>
            ),
        },
        {
            key: "date",
            header: tCommon("date"),
            width: "w-32",
            cell: (p) => (
                <span className="text-on-surface-variant">
                    {formatDate(p.createdAt)}
                </span>
            ),
        },
        {
            key: "total",
            header: tCommon("total"),
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
            header: tSales("table.paid"),
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
            header: tSales("table.due"),
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
            header: tCommon("status"),
            width: "w-28",
            cell: (p) => (
                <StatusBadge status={getPaymentStatus(p.amountPaid, p.amountDue)} />
            ),
        },
    ];

    /* ---------- Derived ---------- */

    const buildHref = (page: number) => {
        const next = new URLSearchParams();
        if (query.q) next.set("q", query.q);
        if (query.supplier) next.set("supplier", query.supplier);
        if (query.payment) next.set("payment", query.payment);
        if (query.date) next.set("date", query.date);
        if (page > 1) next.set("page", String(page));
        const qs = next.toString();
        return qs ? `${base}?${qs}` : base;
    };

    const supplierOptions = [...suppliers]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((s) => ({ value: s.id, label: s.name }));

    const hasAnyPurchases = purchases.length > 0;
    const hasFilteredResults = rows.length > 0;
    const isFiltering = Boolean(
        query.q || query.supplier || query.payment || query.date,
    );

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
                        {t("newPurchase")}
                    </Link>
                }
            />

            {hasAnyPurchases && (
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
                            placeholder: tSales("filters.searchPlaceholder"),
                            label: t("filters.searchLabel"),
                        },
                        {
                            type: "select",
                            key: "supplier",
                            label: t("supplierBar.supplier"),
                            options: [
                                { value: "all", label: t("filters.allSuppliers") },
                                ...supplierOptions,
                            ],
                        },
                        {
                            type: "select",
                            key: "payment",
                            label: tSales("filters.payment"),
                            options: [
                                { value: "all", label: tSales("filters.allPayments") },
                                { value: "paid", label: tSales("filters.paid") },
                                { value: "partial", label: tSales("filters.partial") },
                                { value: "unpaid", label: tSales("filters.unpaid") },
                            ],
                        },
                        {
                            type: "select",
                            key: "date",
                            label: tSales("filters.date"),
                            options: [
                                { value: "all", label: tSales("filters.allTime") },
                                { value: "today", label: tSales("filters.today") },
                                { value: "week", label: tSales("filters.last7Days") },
                                { value: "month", label: tSales("filters.thisMonth") },
                            ],
                        },
                    ]}
                />
            )}

            <DataTable
                columns={columns}
                data={rows}
                getRowKey={(p) => p.id}
                rowActions={(p) => (
                    <PurchaseRowActions
                        storeId={storeId}
                        purchaseId={p.id}
                        viewLabel={t("aria.viewPurchase")}
                    />
                )}
                empty={
                    hasAnyPurchases && isFiltering ? (
                        <EmptyState
                            size="sm"
                            title={t("empty.filteredTitle")}
                            description={tSales("empty.filteredDescription")}
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
                                    {t("newPurchase")}
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