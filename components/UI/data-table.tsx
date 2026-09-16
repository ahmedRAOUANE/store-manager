import type { ReactNode } from "react";

/* -------------------------------------------------------------------------- */
/*  Column definition                                                         */
/* -------------------------------------------------------------------------- */

/**
 * How a column is presented inside a mobile card:
 *   primary   — the card's title line (large, semibold). Exactly one column.
 *   secondary — subtitle under the title (small, muted). Optional.
 *   meta      — label/value pair in the card's detail list. Default.
 *   hidden    — not rendered on mobile (e.g. raw IDs, created-by).
 */
export type MobileRole = "primary" | "secondary" | "meta" | "hidden";

export interface Column<T> {
    /** Stable identifier — also used as the React key. */
    key: string;
    /** Table header text (desktop). Also used as the mobile `<dt>` label. */
    header: string;
    /** Cell renderer. Receives the full row. */
    cell: (row: T) => ReactNode;
    align?: "left" | "right" | "center";
    /** Desktop column width hint, e.g. "w-32" or "min-w-[140px]". */
    width?: string;
    /** Presentation on mobile. Default: "meta". */
    mobile?: MobileRole;
    /** Extra classes applied to both desktop `<td>` and mobile `<dd>`. */
    className?: string;
}

/* -------------------------------------------------------------------------- */
/*  DataTable                                                                 */
/* -------------------------------------------------------------------------- */

export interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    /** Extracts a stable React key from a row. */
    getRowKey: (row: T) => string;
    /** Optional right-pinned actions column (desktop) / top-right slot (mobile). */
    rowActions?: (row: T) => ReactNode;
    /** Rendered when `data` is empty. Pass an `<EmptyState>` here. */
    empty?: ReactNode;
    /** Rendered when `loading` is true. Pass a `<LoadingState>` or skeletons. */
    loadingState?: ReactNode;
    /** When true, shows `loadingState` instead of the table. */
    loading?: boolean;
    className?: string;
}

const ALIGN_CELL: Record<NonNullable<Column<unknown>["align"]>, string> = {
    left: "text-left",
    center: "text-center",
    right: "text-right tabular-nums",
};

const ALIGN_HEADER: Record<NonNullable<Column<unknown>["align"]>, string> = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
};

export function DataTable<T>({
    columns,
    data,
    getRowKey,
    rowActions,
    empty,
    loadingState,
    loading = false,
    className,
}: DataTableProps<T>) {
    /* ---------- Loading / empty short-circuits ---------- */

    if (loading) {
        return (
            <div
                className={cn(
                    "rounded-lg border border-outline-variant bg-surface-lowest",
                    className,
                )}
            >
                {loadingState}
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div
                className={cn(
                    "rounded-lg border border-outline-variant bg-surface-lowest",
                    className,
                )}
            >
                {empty}
            </div>
        );
    }

    /* ---------- Mobile cell grouping ---------- */

    const primaryCol = columns.find((c) => c.mobile === "primary");
    const secondaryCol = columns.find((c) => c.mobile === "secondary");
    const metaCols = columns.filter(
        (c) =>
            c.mobile !== "primary" &&
            c.mobile !== "secondary" &&
            c.mobile !== "hidden",
    );

    /* ---------- Render ---------- */

    return (
        <div className={cn("overflow-hidden rounded-lg border border-outline-variant bg-surface-lowest", className)}>
            {/* ================= Desktop table ================= */}
            <div className="hidden overflow-x-auto scrollbar-thin md:block">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b border-outline-variant bg-slate-50">
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    scope="col"
                                    className={cn(
                                        "px-3 py-2.5 text-label-sm uppercase text-on-surface-variant",
                                        ALIGN_HEADER[col.align ?? "left"],
                                        col.width,
                                    )}
                                >
                                    {col.header}
                                </th>
                            ))}
                            {rowActions && (
                                <th scope="col" className="w-px px-3 py-2.5">
                                    <span className="sr-only">Actions</span>
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row) => (
                            <tr
                                key={getRowKey(row)}
                                className="h-11 border-b border-outline-variant last:border-b-0 transition-colors hover:bg-slate-50"
                            >
                                {columns.map((col) => (
                                    <td
                                        key={col.key}
                                        className={cn(
                                            "px-3 text-body-md text-on-surface align-middle",
                                            ALIGN_CELL[col.align ?? "left"],
                                            col.className,
                                        )}
                                    >
                                        {col.cell(row)}
                                    </td>
                                ))}
                                {rowActions && (
                                    <td className="w-px px-2 text-right align-middle">
                                        {rowActions(row)}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ================= Mobile cards ================= */}
            <ul className="divide-y divide-outline-variant md:hidden">
                {data.map((row) => (
                    <li key={getRowKey(row)} className="px-3.5 py-3">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                {primaryCol && (
                                    <p className="truncate text-title-md text-on-surface">
                                        {primaryCol.cell(row)}
                                    </p>
                                )}
                                {secondaryCol && (
                                    <p className="mt-0.5 truncate text-body-sm text-on-surface-variant">
                                        {secondaryCol.cell(row)}
                                    </p>
                                )}
                            </div>
                            {rowActions && <div className="shrink-0">{rowActions(row)}</div>}
                        </div>

                        {metaCols.length > 0 && (
                            <dl className="mt-2.5 space-y-1">
                                {metaCols.map((col) => (
                                    <div
                                        key={col.key}
                                        className="flex items-center justify-between gap-3 text-body-sm"
                                    >
                                        <dt className="shrink-0 text-on-surface-variant">
                                            {col.header}
                                        </dt>
                                        <dd
                                            className={cn(
                                                "min-w-0 truncate text-right text-on-surface",
                                                col.align === "right" && "tabular-nums",
                                                col.className,
                                            )}
                                        >
                                            {col.cell(row)}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*  Pagination                                                                */
/* -------------------------------------------------------------------------- */

export interface PaginationProps {
    currentPage: number;
    totalPages: number;
    /** Server-safe href builder — e.g. (p) => `/products?page=${p}`. */
    buildHref: (page: number) => string;
    className?: string;
}

/** Produces [1, "ellipsis", 4, 5, 6, "ellipsis", 20] style page lists. */
function getPageItems(current: number, total: number): (number | "ellipsis")[] {
    const pages = new Set<number>();
    pages.add(1);
    pages.add(total);
    for (let i = current - 1; i <= current + 1; i++) {
        if (i >= 1 && i <= total) pages.add(i);
    }

    const sorted = [...pages].sort((a, b) => a - b);
    const result: (number | "ellipsis")[] = [];
    let prev = 0;

    for (const p of sorted) {
        if (p - prev > 1) result.push("ellipsis");
        result.push(p);
        prev = p;
    }

    return result;
}

function PaginationButton({
    href,
    disabled,
    children,
    ariaLabel,
}: {
    href?: string;
    disabled?: boolean;
    children: ReactNode;
    ariaLabel: string;
}) {
    const base =
        "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-body-sm font-medium transition-colors";

    if (disabled || !href) {
        return (
            <span
                aria-disabled="true"
                aria-label={ariaLabel}
                className={cn(base, "cursor-not-allowed text-outline")}
            >
                {children}
            </span>
        );
    }

    return (
        <Link
            href={href}
            aria-label={ariaLabel}
            className={cn(
                base,
                "text-on-surface-variant hover:bg-slate-100 hover:text-on-surface",
            )}
        >
            {children}
        </Link>
    );
}

export function Pagination({
    currentPage,
    totalPages,
    buildHref,
    className,
}: PaginationProps) {
    if (totalPages <= 1) return null;

    const items = getPageItems(currentPage, totalPages);
    const hasPrev = currentPage > 1;
    const hasNext = currentPage < totalPages;

    return (
        <nav
            aria-label="Pagination"
            className={cn(
                "flex items-center justify-between gap-3 py-3",
                className,
            )}
        >
            {/* Mobile — compact text summary */}
            <p className="text-body-sm text-on-surface-variant md:hidden">
                Page <span className="tabular-nums">{currentPage}</span> of{" "}
                <span className="tabular-nums">{totalPages}</span>
            </p>

            {/* Desktop — full page list */}
            <ul className="hidden items-center gap-1 md:flex">
                <li>
                    <PaginationButton
                        ariaLabel="Previous page"
                        href={hasPrev ? buildHref(currentPage - 1) : undefined}
                        disabled={!hasPrev}
                    >
                        <svg
                            aria-hidden="true"
                            viewBox="0 0 16 16"
                            className="size-3.5"
                            fill="none"
                        >
                            <path
                                d="m10 4-4 4 4 4"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </PaginationButton>
                </li>

                {items.map((item, i) =>
                    item === "ellipsis" ? (
                        <li
                            key={`ellipsis-${i}`}
                            aria-hidden="true"
                            className="px-1 text-on-surface-variant"
                        >
                            …
                        </li>
                    ) : (
                        <li key={item}>
                            <Link
                                href={buildHref(item)}
                                aria-current={item === currentPage ? "page" : undefined}
                                className={cn(
                                    "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-body-sm font-medium tabular-nums transition-colors",
                                    item === currentPage
                                        ? "bg-primary-container text-on-primary"
                                        : "text-on-surface-variant hover:bg-slate-100 hover:text-on-surface",
                                )}
                            >
                                {item}
                            </Link>
                        </li>
                    ),
                )}

                <li>
                    <PaginationButton
                        ariaLabel="Next page"
                        href={hasNext ? buildHref(currentPage + 1) : undefined}
                        disabled={!hasNext}
                    >
                        <svg
                            aria-hidden="true"
                            viewBox="0 0 16 16"
                            className="size-3.5"
                            fill="none"
                        >
                            <path
                                d="m6 4 4 4-4 4"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </PaginationButton>
                </li>
            </ul>

            {/* Mobile — prev / next controls */}
            <div className="flex items-center gap-1 md:hidden">
                <PaginationButton
                    ariaLabel="Previous page"
                    href={hasPrev ? buildHref(currentPage - 1) : undefined}
                    disabled={!hasPrev}
                >
                    <svg
                        aria-hidden="true"
                        viewBox="0 0 16 16"
                        className="size-3.5"
                        fill="none"
                    >
                        <path
                            d="m10 4-4 4 4 4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </PaginationButton>
                <PaginationButton
                    ariaLabel="Next page"
                    href={hasNext ? buildHref(currentPage + 1) : undefined}
                    disabled={!hasNext}
                >
                    <svg
                        aria-hidden="true"
                        viewBox="0 0 16 16"
                        className="size-3.5"
                        fill="none"
                    >
                        <path
                            d="m6 4 4 4-4 4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </PaginationButton>
            </div>
        </nav>
    );
}

/* Re-export for convenience — `Link` is used above but imported at top */
import Link from "next/link";
import { cn } from "@/utils/jsx-classes";
