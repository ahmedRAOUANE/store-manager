"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavIconKey, NavItem } from "./nav-items";
import { cn } from "@/utils/jsx-classes";
import { User } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Icon registry                                                             */
/* -------------------------------------------------------------------------- */

const svgProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
};

const ICONS: Record<NavIconKey, React.ReactNode> = {
    dashboard: (
        <svg {...svgProps}>
            <rect x="3" y="3" width="7" height="9" rx="1" />
            <rect x="14" y="3" width="7" height="5" rx="1" />
            <rect x="14" y="12" width="7" height="9" rx="1" />
            <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
    ),
    products: (
        <svg {...svgProps}>
            <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
            <path d="M3 8l9 5 9-5M12 13v8" />
        </svg>
    ),
    sales: (
        <svg {...svgProps}>
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
            <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
        </svg>
    ),
    purchases: (
        <svg {...svgProps}>
            <path d="M10 17h4V5H2v12h3" />
            <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1" />
            <circle cx="7.5" cy="17.5" r="2.5" />
            <circle cx="17.5" cy="17.5" r="2.5" />
        </svg>
    ),
    suppliers: (
        <svg {...svgProps}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    ),
    members: (
        <svg {...svgProps}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    ),
    settings: (
        <svg {...svgProps}>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
    ),
    users: (
        <svg {...svgProps}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    ),
    stores: (
        <svg {...svgProps}>
            <path d="M3 9 4.5 4h15L21 9M3 9v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9M3 9h18M9 21v-6h6v6" />
        </svg>
    ),
    profile: (<User />)
};

export function NavIcon({ name }: { name: NavIconKey }) {
    return <>{ICONS[name]}</>;
}

/* -------------------------------------------------------------------------- */
/*  Active-state predicate                                                    */
/* -------------------------------------------------------------------------- */

function isActive(pathname: string, href: string): boolean {
    return pathname === href || pathname.startsWith(`${href}/`);
}

/* -------------------------------------------------------------------------- */
/*  SidebarNav                                                                */
/* -------------------------------------------------------------------------- */

export interface SidebarNavProps {
    items: NavItem[];
    /** Called after a link is clicked — the mobile drawer uses this to close. */
    onNavigate?: () => void;
}

export function SidebarNav({ items, onNavigate }: SidebarNavProps) {
    const pathname = usePathname();

    return (
        <nav aria-label="Primary" className="flex flex-col gap-0.5 px-2">
            {items.map((item) => {
                const active = isActive(pathname, item.href);
                const showBadge = item.badge !== undefined && item.badge > 0;

                return (
                    <Link
                        key={item.key}
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                            "group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-body-md transition-colors",
                            active
                                ? "bg-surface-low font-semibold text-on-surface"
                                : "font-medium text-on-surface-variant hover:bg-slate-100 hover:text-on-surface",
                        )}
                    >
                        <span
                            aria-hidden="true"
                            className={cn(
                                "shrink-0 [&>svg]:size-4",
                                active ? "text-on-surface" : "text-on-surface-variant",
                            )}
                        >
                            <NavIcon name={item.iconKey} />
                        </span>

                        <span className="min-w-0 flex-1 truncate">{item.label}</span>

                        {showBadge && (
                            <span
                                aria-label={`${item.badge} items`}
                                className="shrink-0 rounded-full bg-warning-bg px-1.5 py-0.5 text-label-sm tabular-nums text-warning-fg"
                            >
                                {item.badge}
                            </span>
                        )}
                    </Link>
                );
            })}
        </nav>
    );
}