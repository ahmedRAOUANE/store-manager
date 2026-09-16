import Link from "next/link";
// import "temporal-polyfill/full/global";
import { Eye, Pencil } from "lucide-react";

import { getAllSuppliers } from "@/actions/supplier.actions";
import { getAllPurchases } from "@/actions/purchase.actions";
import { PageHeader } from "@/components/UI/page-header";
import { FilterBar } from "@/components/UI/filter-bar";
import { DataTable, Pagination, type Column } from "@/components/UI/data-table";
import { EmptyState, ErrorState } from "@/components/UI/state";
import { buttonVariants } from "@/components/UI/btn";
import { AppError } from "@/errors/base.error";
import { formatCurrency } from "@/utils/format";
import { cn } from "@/utils/jsx-classes";

import type { GetSupplier } from "@/zod/supplier.schema";

/* ========================================================================== */
/*  Local extension — outstanding is derived, not stored                      */
/* ========================================================================== */

type SupplierRow = GetSupplier & {
    outstandingAmount: number;
};

/* ========================================================================== */
/*  Query contract                                                            */
/* ========================================================================== */

const PAGE_SIZE = 10;

interface SupplierQuery {
    q?: string;
    page: number;
}

function firstValue(v: string | string[] | undefined): string | undefined {
    return typeof v === "string" && v.length > 0 ? v : undefined;
}

function parseQuery(
    raw: Record<string, string | string[] | undefined>,
): SupplierQuery {
    const page = Number.parseInt(firstValue(raw.page) ?? "1", 10);

    return {
        q: firstValue(raw.q),
        page: Number.isFinite(page) && page > 0 ? page : 1,
    };
}

/* -------------------------------------------------------------------------- */
/*  Server-side filter + paginate                                             */
/* -------------------------------------------------------------------------- */

function applyQuery(
    suppliers: SupplierRow[],
    query: SupplierQuery,
): { rows: SupplierRow[]; total: number; totalPages: number } {
    const needle = query.q?.toLowerCase();

    const filtered = suppliers.filter((s) => {
        if (!needle) return true;

        const haystack = `${s.name} ${s.email ?? ""} ${s.phone ?? ""}`.toLowerCase();
        return haystack.includes(needle);
    });

    /* Outstanding first, then alphabetical. */
    const sorted = [...filtered].sort((a, b) => {
        if (a.outstandingAmount !== b.outstandingAmount) {
            return b.outstandingAmount - a.outstandingAmount;
        }
        return a.name.localeCompare(b.name);
    });

    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = Math.min(query.page, totalPages);
    const start = (page - 1) * PAGE_SIZE;

    return {
        rows: sorted.slice(start, start + PAGE_SIZE),
        total,
        totalPages,
    };
}

/* ========================================================================== */
/*  Columns                                                                   */
/* ========================================================================== */

const columns: Column<SupplierRow>[] = [
    {
        key: "name",
        header: "Supplier",
        mobile: "primary",
        cell: (s) => (
            <Link
                href={`/stores/${s.storeId}/owner/suppliers/${s.id}`}
                className="font-medium text-on-surface hover:text-info"
            >
                {s.name}
            </Link>
        ),
    },
    {
        key: "phone",
        header: "Phone",
        mobile: "secondary",
        width: "w-44",
        cell: (s) =>
            s.phone ? (
                <span className="font-mono text-body-sm text-on-surface-variant">
                    {s.phone}
                </span>
            ) : (
                <span className="text-on-surface-variant">—</span>
            ),
    },
    {
        key: "email",
        header: "Email",
        width: "w-64",
        cell: (s) =>
            s.email ? (
                <span className="truncate text-on-surface-variant">{s.email}</span>
            ) : (
                <span className="text-on-surface-variant">—</span>
            ),
    },
    {
        key: "outstanding",
        header: "Outstanding",
        align: "right",
        width: "w-32",
        cell: (s) => {
            if (s.outstandingAmount <= 0) {
                return <span className="text-on-surface-variant">—</span>;
            }
            return (
                <span className="font-medium tabular-nums text-danger-fg">
                    {formatCurrency(s.outstandingAmount)}
                </span>
            );
        },
    },
];

/* ========================================================================== */
/*  Row actions                                                               */
/* ========================================================================== */

function SupplierRowActions({
    storeId,
    supplierId,
}: {
    storeId: string;
    supplierId: string;
}) {
    const base = `/stores/${storeId}/owner/suppliers/${supplierId}`;

    const iconBtn = cn(
        "inline-flex size-8 items-center justify-center rounded-md",
        "text-on-surface-variant transition-colors",
        "hover:bg-slate-100 hover:text-on-surface",
    );

    return (
        <div className="flex items-center justify-end gap-0.5">
            <Link href={base} aria-label="View supplier" className={iconBtn}>
                <Eye className="size-4" aria-hidden="true" />
            </Link>
            <Link href={`${base}/edit`} aria-label="Edit supplier" className={iconBtn}>
                <Pencil className="size-4" aria-hidden="true" />
            </Link>
        </div>
    );
}

/* ========================================================================== */
/*  Page                                                                      */
/* ========================================================================== */

export default async function SuppliersPage({
    params,
    searchParams,
}: PageProps<"/stores/[storeId]/owner/suppliers">) {
    const { storeId } = await params;
    const sp = await searchParams;
    const query = parseQuery(sp);

    const base = `/stores/${storeId}/owner/suppliers`;

    /* ---------- Fetch ---------- */

    const [suppliersResult, purchasesResult] = await Promise.all([
        getAllSuppliers(storeId),
        getAllPurchases(storeId),
    ]);

    if (suppliersResult instanceof AppError) {
        return (
            <ErrorState
                title="Couldn't load suppliers"
                description={suppliersResult.message}
                action={
                    <Link
                        href={base}
                        className={buttonVariants({ variant: "secondary", size: "md" })}
                    >
                        Try Again
                    </Link>
                }
            />
        );
    }

    /* Purchases failing degrades gracefully — outstanding reads 0 for all,
       the list still renders. */
    const purchases = purchasesResult instanceof AppError ? [] : purchasesResult;

    /* ---------- Aggregate outstanding per supplier ---------- */

    const outstandingBySupplier = new Map<string, number>();

    for (const purchase of purchases) {
        if (purchase.amountDue <= 0) continue;

        const current = outstandingBySupplier.get(purchase.supplierId) ?? 0;
        outstandingBySupplier.set(
            purchase.supplierId,
            current + purchase.amountDue,
        );
    }

    const suppliers: SupplierRow[] = suppliersResult.map((s) => ({
        ...s,
        outstandingAmount: outstandingBySupplier.get(s.id) ?? 0,
    }));

    const { rows, total, totalPages } = applyQuery(suppliers, query);

    /* ---------- Derived ---------- */

    const buildHref = (page: number) => {
        const next = new URLSearchParams();
        if (query.q) next.set("q", query.q);
        if (page > 1) next.set("page", String(page));
        const qs = next.toString();
        return qs ? `${base}?${qs}` : base;
    };

    const hasAnySuppliers = suppliers.length > 0;
    const hasFilteredResults = rows.length > 0;
    const isFiltering = Boolean(query.q);

    /* Aggregate outstanding across the *full* set, not just the current page. */
    const totalOutstanding = suppliers.reduce(
        (sum, s) => sum + s.outstandingAmount,
        0,
    );
    const supplierCount = suppliers.filter((s) => s.outstandingAmount > 0).length;

    return (
        <div className="space-y-4">
            <PageHeader
                title="Suppliers"
                description={
                    totalOutstanding > 0 ? (
                        <>
                            {formatCurrency(totalOutstanding)} outstanding across{" "}
                            {supplierCount}{" "}
                            {supplierCount === 1 ? "supplier" : "suppliers"}.
                        </>
                    ) : (
                        "All supplier accounts are settled."
                    )
                }
                actions={
                    <Link
                        href={`${base}/new`}
                        className={buttonVariants({ variant: "primary", size: "sm" })}
                    >
                        Add Supplier
                    </Link>
                }
            />

            {hasAnySuppliers && (
                <FilterBar
                    basePath={base}
                    values={{ q: query.q }}
                    fields={[
                        {
                            type: "search",
                            key: "q",
                            placeholder: "Search by name, email, or phone…",
                            label: "Search suppliers",
                        },
                    ]}
                />
            )}

            <DataTable
                columns={columns}
                data={rows}
                getRowKey={(s) => s.id}
                rowActions={(s) => (
                    <SupplierRowActions storeId={storeId} supplierId={s.id} />
                )}
                empty={
                    hasAnySuppliers && isFiltering ? (
                        <EmptyState
                            size="sm"
                            title="No suppliers match your search"
                            description="Try a different name, email, or phone."
                        />
                    ) : (
                        <EmptyState
                            size="sm"
                            title="No suppliers yet"
                            description="Add your first supplier to start recording purchases."
                            action={
                                <Link
                                    href={`${base}/new`}
                                    className={buttonVariants({
                                        variant: "primary",
                                        size: "sm",
                                    })}
                                >
                                    Add Supplier
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
                    of <span className="tabular-nums">{total}</span>{" "}
                    {total === 1 ? "supplier" : "suppliers"}
                </p>
            )}
        </div>
    );
}