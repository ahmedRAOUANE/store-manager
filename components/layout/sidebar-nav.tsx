"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavIconKey, NavItem } from "./nav-items";
import { cn } from "@/utils/jsx-classes";
import { LayoutDashboard, Package, Settings, ShoppingBag, Store, Truck, User, Users, UsersRound } from "lucide-react";
import { useTranslations } from "next-intl";

/* -------------------------------------------------------------------------- */
/*  Icon registry                                                             */
/* -------------------------------------------------------------------------- */

const ICONS: Record<NavIconKey, React.ReactNode> = {
    dashboard: <LayoutDashboard />,
    products: <Package />,
    sales: <ShoppingBag />,
    purchases: <Truck />,
    suppliers: <UsersRound />,
    members: <Users />,
    settings: <Settings />,
    users: <UsersRound />,
    stores: <Store />,
    profile: <User />,
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
    const navigationT = useTranslations("navigation");
    const adminT = useTranslations("admin");
    const accessibilityT = useTranslations("accessibility");

    const getLabel = (item: NavItem) =>
        item.labelNamespace === "admin"
            ? adminT(item.labelKey)
            : navigationT(item.labelKey);

    return (
        <nav aria-label={accessibilityT("primaryNavigation")} className="flex flex-col gap-0.5 px-2">
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

                        <span className="min-w-0 flex-1 truncate">{getLabel(item)}</span>

                        {showBadge && (
                            <span
                                aria-label={accessibilityT("itemsCount", { count: item.badge || 0})}
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