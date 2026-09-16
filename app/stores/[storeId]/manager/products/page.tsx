import Link from "next/link";
// import "temporal-polyfill/full/global";
import { Eye, Pencil } from "lucide-react";

import { getAllProducts } from "@/actions/product.actions";
import { PageHeader } from "@/components/UI/page-header";
import { FilterBar } from "@/components/UI/filter-bar";
import { DataTable, Pagination, type Column } from "@/components/UI/data-table";
import { StatusBadge, getStockStatus } from "@/components/UI/status-badge";
import { EmptyState, ErrorState } from "@/components/UI/state";
import { buttonVariants } from "@/components/UI/btn";
import { AppError } from "@/errors/base.error";
import { formatCurrency } from "@/utils/format";
import { cn } from "@/utils/jsx-classes";

import type { GetProduct } from "@/zod/product.schema";

/* ========================================================================== */
/*  Query contract                                                            */
/* ========================================================================== */

const PAGE_SIZE = 8;

interface ProductQuery {
    q?: string;
    status?: "active" | "inactive";
    stock?: "in_stock" | "low_stock" | "out_of_stock";
    page: number;
}

function firstValue(v: string | string[] | undefined): string | undefined {
    return typeof v === "string" && v.length > 0 ? v : undefined;
}

function parseQuery(
    raw: Record<string, string | string[] | undefined>,
): ProductQuery {
    const page = Number.parseInt(firstValue(raw.page) ?? "1", 10);

    return {
        q: firstValue(raw.q),
        status: firstValue(raw.status) as ProductQuery["status"],
        stock: firstValue(raw.stock) as ProductQuery["stock"],
        page: Number.isFinite(page) && page > 0 ? page : 1,
    };
}

/* -------------------------------------------------------------------------- */
/*  In-memory filter + paginate                                               */
/*  Fine for small catalogs; promote to a query when it grows.                */
/* -------------------------------------------------------------------------- */

function applyQuery(
    products: GetProduct[],
    query: ProductQuery,
): { rows: GetProduct[]; total: number; totalPages: number } {
    const needle = query.q?.toLowerCase();

    const filtered = products.filter((p) => {
        if (needle && !`${p.name} ${p.sku}`.toLowerCase().includes(needle)) {
            return false;
        }
        if (query.status === "active" && !p.isActive) return false;
        if (query.status === "inactive" && p.isActive) return false;

        if (query.stock) {
            const stock = getStockStatus(
                p.stockQuantity,
                p.minimumStock,
                p.isActive,
            );
            const wanted =
                query.stock === "in_stock"
                    ? "IN_STOCK"
                    : query.stock === "low_stock"
                        ? "LOW_STOCK"
                        : "OUT_OF_STOCK";
            if (stock !== wanted) return false;
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

const columns: Column<GetProduct>[] = [
    {
        key: "name",
        header: "Product",
        mobile: "primary",
        cell: (p) => (
            <Link
                href={`/stores/${p.storeId}/manager/products/${p.id}`}
                className="font-medium text-on-surface hover:text-info"
            >
                {p.name}
            </Link>
        ),
    },
    {
        key: "sku",
        header: "SKU",
        mobile: "secondary",
        cell: (p) => (
            <span className="font-mono text-body-sm text-on-surface-variant">
                {p.sku}
            </span>
        ),
    },
    {
        key: "price",
        header: "Price",
        align: "right",
        width: "w-32",
        cell: (p) => (
            <span className="tabular-nums">{formatCurrency(p.sellingPrice)}</span>
        ),
    },
    {
        key: "stock",
        header: "Stock",
        align: "right",
        width: "w-24",
        cell: (p) => {
            if (!p.isActive) {
                return (
                    <span className="tabular-nums text-on-surface-variant">
                        {p.stockQuantity}
                    </span>
                );
            }
            const stock = getStockStatus(p.stockQuantity, p.minimumStock, true);
            return (
                <span
                    className={cn(
                        "tabular-nums",
                        stock === "OUT_OF_STOCK" && "font-medium text-danger-fg",
                        stock === "LOW_STOCK" && "font-medium text-warning-fg",
                        stock === "IN_STOCK" && "text-on-surface",
                    )}
                >
                    {p.stockQuantity}
                </span>
            );
        },
    },
    {
        key: "status",
        header: "Status",
        width: "w-28",
        cell: (p) => (
            <StatusBadge status={p.isActive ? "ACTIVE" : "INACTIVE"} />
        ),
    },
];

/* ========================================================================== */
/*  Row actions                                                               */
/* ========================================================================== */

function RowActions({
    storeId,
    productId,
}: {
    storeId: string;
    productId: string;
}) {
    const base = `/stores/${storeId}/manager/products/${productId}`;

    const iconBtn = cn(
        "inline-flex size-8 items-center justify-center rounded-md",
        "text-on-surface-variant transition-colors",
        "hover:bg-slate-100 hover:text-on-surface",
    );

    return (
        <div className="flex items-center justify-end gap-0.5">
            <Link href={base} aria-label="View product" className={iconBtn}>
                <Eye className="size-4" aria-hidden="true" />
            </Link>
            <Link href={`${base}/edit`} aria-label="Edit product" className={iconBtn}>
                <Pencil className="size-4" aria-hidden="true" />
            </Link>
        </div>
    );
}

/* ========================================================================== */
/*  Page                                                                      */
/* ========================================================================== */

export default async function ManagerProductsPage({
    params,
    searchParams,
}: PageProps<"/stores/[storeId]/manager/products">) {
    const { storeId } = await params;
    const sp = await searchParams;
    const query = parseQuery(sp);

    const base = `/stores/${storeId}/manager/products`;

    /* ---------- Fetch ---------- */

    const result = await getAllProducts(storeId);

    if (result instanceof AppError) {
        return (
            <ErrorState
                title="Couldn't load products"
                description={result.message}
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

    const products = result;
    const { rows, total, totalPages } = applyQuery(products, query);

    /* ---------- Derived ---------- */

    const buildHref = (page: number) => {
        const next = new URLSearchParams();
        if (query.q) next.set("q", query.q);
        if (query.status) next.set("status", query.status);
        if (query.stock) next.set("stock", query.stock);
        if (page > 1) next.set("page", String(page));
        const qs = next.toString();
        return qs ? `${base}?${qs}` : base;
    };

    const hasAnyProducts = products.length > 0;
    const hasFilteredResults = rows.length > 0;
    const isFiltering = Boolean(query.q || query.status || query.stock);

    /* ---------- Render ---------- */

    return (
        <div className="space-y-4">
            <PageHeader
                title="Products"
                description="Manage your store's catalog and stock."
                actions={
                    <Link
                        href={`${base}/new`}
                        className={buttonVariants({ variant: "primary", size: "sm" })}
                    >
                        Add Product
                    </Link>
                }
            />

            {hasAnyProducts && (
                <FilterBar
                    basePath={base}
                    values={{
                        q: query.q,
                        status: query.status,
                        stock: query.stock,
                    }}
                    fields={[
                        {
                            type: "search",
                            key: "q",
                            placeholder: "Search by name or SKU…",
                            label: "Search products",
                        },
                        {
                            type: "select",
                            key: "status",
                            label: "Status",
                            options: [
                                { value: "all", label: "All statuses" },
                                { value: "active", label: "Active" },
                                { value: "inactive", label: "Inactive" },
                            ],
                        },
                        {
                            type: "select",
                            key: "stock",
                            label: "Stock",
                            options: [
                                { value: "all", label: "All stock" },
                                { value: "in_stock", label: "In Stock" },
                                { value: "low_stock", label: "Low Stock" },
                                { value: "out_of_stock", label: "Out of Stock" },
                            ],
                        },
                    ]}
                />
            )}

            <DataTable
                columns={columns}
                data={rows}
                getRowKey={(p) => p.id}
                rowActions={(p) => <RowActions storeId={storeId} productId={p.id} />}
                empty={
                    hasAnyProducts && isFiltering ? (
                        <EmptyState
                            size="sm"
                            title="No products match your filters"
                            description="Try adjusting your search or clearing the filters."
                        />
                    ) : (
                        <EmptyState
                            size="sm"
                            title="No products yet"
                            description="Add your first product to start managing your inventory."
                            action={
                                <Link
                                    href={`${base}/new`}
                                    className={buttonVariants({
                                        variant: "primary",
                                        size: "sm",
                                    })}
                                >
                                    Add Product
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
                    of <span className="tabular-nums">{total}</span> products
                </p>
            )}
        </div>
    );
}