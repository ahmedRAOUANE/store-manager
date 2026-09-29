import { cn } from "@/utils/jsx-classes";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { ReactNode } from "react";

/* -------------------------------------------------------------------------- */
/*  Breadcrumb                                                                */
/* -------------------------------------------------------------------------- */

export interface BreadcrumbItem {
    label: string;
    /** When omitted (or on the final item), renders as plain text, not a link. */
    href?: string;
}

export interface BreadcrumbProps {
    items: BreadcrumbItem[];
    className?: string;
    ariaLabel?: string;
}

export function Breadcrumb({ items, className, ariaLabel = 'breadcrumb' }: BreadcrumbProps) {
    if (items.length === 0) return null;

    return (
        <nav aria-label={ariaLabel} className={cn("min-w-0", className)}>
            <ol className="flex min-w-0 items-center gap-1.5 text-body-sm text-on-surface-variant">
                {items.map((item, index) => {
                    const isLast = index === items.length - 1;
                    const interactive = item.href && !isLast;

                    return (
                        <li
                            key={`${item.label}-${index}`}
                            className="flex min-w-0 items-center gap-1.5"
                        >
                            {interactive ? (
                                <Link
                                    href={item.href!}
                                    className="truncate transition-colors hover:text-on-surface"
                                >
                                    {item.label}
                                </Link>
                            ) : (
                                <span
                                    aria-current={isLast ? "page" : undefined}
                                    className={cn(
                                        "truncate",
                                        isLast && "font-medium text-on-surface",
                                    )}
                                >
                                    {item.label}
                                </span>
                            )}
                            {!isLast && (
                                <ChevronRight
                                    aria-hidden="true"
                                    className="size-3.5 shrink-0 text-outline rtl:rotate-180"
                                />
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}

/* -------------------------------------------------------------------------- */
/*  PageHeader                                                                */
/* -------------------------------------------------------------------------- */

export interface PageHeaderProps {
    /** The page's primary heading. Rendered as `<h1>`. */
    title: string;
    /** Optional supporting text under the title. Accepts ReactNode for inline badges/links. */
    description?: ReactNode;
    /** Optional breadcrumb trail above the title. */
    breadcrumbs?: BreadcrumbItem[];
    /**
     * Optional back button rendered before the title.
     * On mobile it collapses to an icon-only button; on desktop it stays the same.
     */
    backHref?: string;
    /** Right-aligned action slot — buttons, dropdowns, or a `<Link>` styled as a button. */
    actions?: ReactNode;
    className?: string;
}

export function PageHeader({
    title,
    description,
    breadcrumbs,
    backHref,
    actions,
    className,
}: PageHeaderProps) {
    const hasBreadcrumbs = breadcrumbs && breadcrumbs.length > 0;
    const t = useTranslations("accessibility");

    return (
        <header className={cn("space-y-3", className)}>
            {hasBreadcrumbs && <Breadcrumb ariaLabel={t("breadcrumb")} items={breadcrumbs!} />}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                {/* Title block */}
                <div className="flex min-w-0 items-start gap-2">
                    {backHref && (
                        <Link
                            href={backHref}
                            aria-label={t("goBack")}
                            className={cn(
                                "mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md",
                                "text-on-surface-variant transition-colors",
                                "hover:bg-slate-100 hover:text-on-surface",
                            )}
                        >
                            <ChevronLeft
                                aria-hidden="true"
                                className="size-4 shrink-0 text-outline rtl:rotate-180"
                            />
                        </Link>
                    )}

                    <div className="min-w-0">
                        <h1 className="truncate text-headline-lg text-on-surface">
                            {title}
                        </h1>
                        {description && (
                            <p className="mt-1 text-body-md text-on-surface-variant">
                                {description}
                            </p>
                        )}
                    </div>
                </div>

                {/* Actions block — below the title on mobile, right-aligned on desktop */}
                {actions && (
                    <div
                        className={cn(
                            "flex flex-wrap items-center gap-2",
                            "sm:shrink-0 sm:justify-end",
                        )}
                    >
                        {actions}
                    </div>
                )}
            </div>
        </header>
    );
}