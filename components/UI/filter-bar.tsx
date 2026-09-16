"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/utils/jsx-classes";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type FilterField =
    | {
        type: "search";
        /** Query param key, e.g. "q". */
        key: string;
        placeholder?: string;
        /** Screen-reader label. Falls back to the placeholder. */
        label?: string;
    }
    | {
        type: "select";
        key: string;
        label: string;
        /**
         * Options list. Always include the "all" option first — it's the empty
         * state of this filter and the value that removes the param from the URL.
         */
        options: { value: string; label: string }[];
        /**
         * The value that means "no filter". Defaults to "all". When the select
         * holds this value, the param is omitted from the URL entirely.
         */
        allValue?: string;
    };

export interface FilterBarProps {
    /**
     * Path to push to, without query string.
     * e.g. `/stores/abc/products`
     */
    basePath: string;
    /**
     * Current values from the URL's searchParams. Any key not present is
     * treated as empty.
     */
    values: Record<string, string | undefined>;
    fields: FilterField[];
    /** Optional right-side slot, e.g. a primary "Add Product" button. */
    actions?: ReactNode;
    className?: string;
}

/* -------------------------------------------------------------------------- */
/*  FilterBar                                                                 */
/* -------------------------------------------------------------------------- */

export function FilterBar({
    basePath,
    values,
    fields,
    actions,
    className,
}: FilterBarProps) {
    const router = useRouter();

    /**
     * Push a URL with one filter key updated.
     *
     * Notes:
     *  - `page` is intentionally NOT preserved. Any filter change resets
     *    pagination to page 1 — the standard list-view behaviour.
     *  - Keys whose value equals "" or the field's `allValue` are dropped, so
     *    the URL stays clean: `/products` rather than `/products?q=&status=all`.
     */
    const push = (key: string, rawValue: string) => {
        const next = new URLSearchParams();

        for (const field of fields) {
            const value =
                field.key === key ? rawValue : values[field.key] ?? "";

            const isAll = field.type === "select"
                ? value === (field.allValue ?? "all")
                : false;

            if (value && !isAll) next.set(field.key, value);
        }

        const qs = next.toString();
        router.push(qs ? `${basePath}?${qs}` : basePath);
    };

    const hasActiveFilter = fields.some((field) => {
        const value = values[field.key] ?? "";
        if (!value) return false;
        if (field.type === "select" && value === (field.allValue ?? "all")) {
            return false;
        }
        return true;
    });

    return (
        <div
            className={cn(
                "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
                className,
            )}
        >
            <div className="flex flex-wrap items-center gap-2">
                {fields.map((field) => {
                    if (field.type === "search") {
                        return (
                            <FilterSearch
                                key={field.key}
                                defaultValue={values[field.key] ?? ""}
                                placeholder={field.placeholder}
                                label={field.label}
                                onChange={(v) => push(field.key, v)}
                            />
                        );
                    }
                    return (
                        <FilterSelect
                            key={field.key}
                            label={field.label}
                            value={values[field.key] ?? field.allValue ?? "all"}
                            options={field.options}
                            onChange={(v) =>
                                push(field.key, v)
                            }
                        />
                    );
                })}

                {hasActiveFilter && (
                    <button
                        type="button"
                        onClick={() => router.push(basePath)}
                        className={cn(
                            "h-9 rounded-md px-2.5 text-body-sm font-medium",
                            "text-on-surface-variant transition-colors",
                            "hover:bg-slate-100 hover:text-on-surface",
                        )}
                    >
                        Clear filters
                    </button>
                )}
            </div>

            {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*  FilterSearch — debounced text input                                       */
/* -------------------------------------------------------------------------- */

interface FilterSearchProps {
    defaultValue: string;
    placeholder?: string;
    label?: string;
    onChange: (value: string) => void;
}

function FilterSearch({
    defaultValue,
    placeholder,
    label,
    onChange,
}: FilterSearchProps) {
    const [value, setValue] = useState(defaultValue);

    /* Adopt externally-driven changes (back button, "Clear filters"). */
    useEffect(() => {
        const changeValue = () => {
            setValue(defaultValue)
        };
        
        changeValue();

    }, [defaultValue]);

    /* Debounced push. Skipped when local and server values already match. */
    useEffect(() => {
        if (value === defaultValue) return;
        const timer = setTimeout(() => onChange(value), 300);
        return () => clearTimeout(timer);
    }, [value, defaultValue, onChange]);

    return (
        <div className="relative w-full sm:w-64">
            <label className="sr-only" htmlFor={`filter-search-${placeholder ?? "q"}`}>
                {label ?? placeholder ?? "Search"}
            </label>

            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant"
            >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
            </svg>

            <input
                id={`filter-search-${placeholder ?? "q"}`}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") onChange(value);
                    if (e.key === "Escape") {
                        setValue("");
                        onChange("");
                    }
                }}
                placeholder={placeholder ?? "Search…"}
                autoComplete="off"
                spellCheck={false}
                className={cn(
                    "h-9 w-full rounded-md border border-outline-variant bg-surface-lowest pl-8 pr-8 text-body-md text-on-surface",
                    "placeholder:text-outline",
                    "focus:border-info focus:outline-none focus:ring-1 focus:ring-info",
                )}
            />

            {value && (
                <button
                    type="button"
                    onClick={() => {
                        setValue("");
                        onChange("");
                    }}
                    aria-label="Clear search"
                    className={cn(
                        "absolute right-1.5 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded",
                        "text-on-surface-variant transition-colors",
                        "hover:bg-slate-100 hover:text-on-surface",
                    )}
                >
                    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-3.5">
                        <path
                            d="m4 4 8 8M12 4l-8 8"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                        />
                    </svg>
                </button>
            )}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*  FilterSelect — native select, styled                                      */
/* -------------------------------------------------------------------------- */

interface FilterSelectProps {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
}

function FilterSelect({ label, value, options, onChange }: FilterSelectProps) {
    const id = `filter-${label.toLowerCase().replace(/\s+/g, "-")}`;

    return (
        <div className="relative shrink-0">
            <label htmlFor={id} className="sr-only">
                {label}
            </label>

            <select
                id={id}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={cn(
                    "h-9 cursor-pointer appearance-none rounded-md border border-outline-variant bg-surface-lowest",
                    "pl-3 pr-8 text-body-md text-on-surface",
                    "focus:border-info focus:outline-none focus:ring-1 focus:ring-info",
                )}
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>

            <svg
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
                className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-on-surface-variant"
            >
                <path
                    d="m4 6 4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </div>
    );
}