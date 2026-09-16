import type { ReactNode } from "react";
import { SidebarNav } from "./sidebar-nav";
import type { NavItem } from "./nav-items";
import { cn } from "@/utils/jsx-classes";

/* -------------------------------------------------------------------------- */
/*  Initials helper                                                           */
/* -------------------------------------------------------------------------- */

function getInitials(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return "?";
    if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
    return (words[0]![0]! + words[words.length - 1]![0]!).toUpperCase();
}

/* -------------------------------------------------------------------------- */
/*  Avatars                                                                   */
/* -------------------------------------------------------------------------- */

export interface SidebarAvatarProps {
    name: string;
    imageUrl?: string | null;
    size?: "sm" | "md";
    shape?: "rounded" | "circle";
}

export function SidebarAvatar({
    name,
    imageUrl,
    size = "md",
    shape = "rounded",
}: SidebarAvatarProps) {
    const dimension = size === "md" ? "size-9" : "size-8";
    const shapeClass =
        shape === "circle" ? "rounded-full" : size === "md" ? "rounded-md" : "rounded-full";

    if (imageUrl) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={imageUrl}
                alt=""
                className={cn(dimension, shapeClass, "shrink-0 object-cover")}
            />
        );
    }

    return (
        <span
            aria-hidden="true"
            className={cn(
                dimension,
                shapeClass,
                "flex shrink-0 items-center justify-center font-semibold uppercase",
                size === "md"
                    ? "bg-primary-container text-label-md text-on-primary"
                    : "bg-slate-200 text-label-sm text-on-surface-variant",
            )}
        >
            {getInitials(name)}
        </span>
    );
}

export interface SidebarUserProps {
    name: string;
    email: string;
    imageUrl?: string | null;
}

export function SidebarUser({ name, email, imageUrl }: SidebarUserProps) {
    return (
        <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
            <SidebarAvatar name={name} imageUrl={imageUrl} size="sm" shape="circle" />
            <div className="min-w-0 flex-1">
                <p className="truncate text-body-sm font-medium text-on-surface">{name}</p>
                <p className="truncate text-body-sm text-on-surface-variant">{email}</p>
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*  SidebarContent — shared between desktop and mobile                        */
/* -------------------------------------------------------------------------- */

export interface SidebarContentProps {
    items: NavItem[];
    title: string;
    subtitle?: string;
    avatarUrl?: string | null;
    footer?: ReactNode;
    /** Forwarded to SidebarNav — the mobile drawer uses this to auto-close. */
    onNavigate?: () => void;
}

export function SidebarContent({
    items,
    title,
    subtitle,
    avatarUrl,
    footer,
    onNavigate,
}: SidebarContentProps) {
    return (
        <div className="grid grid-cols-1 grid-rows-10 h-full">
            {/* Identity */}
            <div className="col-span-1 row-span-1 flex items-center justify-start gap-3 border-b border-outline-variant px-3.5 py-2">
                <SidebarAvatar name={title} imageUrl={avatarUrl} />

                <div className="min-w-0 flex-1">
                    <p className="truncate text-title-md text-on-surface">{title}</p>
                    {subtitle && (
                        <p className="truncate text-body-sm text-on-surface-variant">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>

            {/* Nav */}
            <div className="col-span-1 row-span-8 flex-1 overflow-y-auto py-2 scrollbar-thin">
                <SidebarNav items={items} onNavigate={onNavigate} />
            </div>

            {/* Footer */}
            {footer ? (
                <div className="col-span-1 row-span-1 border-t border-outline-variant p-2">{footer}</div>
            ) : (
                <div></div>
            )}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*  AppSidebar — desktop-only wrapper                                         */
/* -------------------------------------------------------------------------- */

export interface AppSidebarProps extends SidebarContentProps {
    className?: string;
}

export function AppSidebar({ className, ...content }: AppSidebarProps) {
    return (
        <aside
            aria-label="Sidebar"
            className={cn(
                "hidden h-full border-r border-outline-variant bg-surface-lowest md:block",
                className,
            )}
        >
            <SidebarContent {...content} />
        </aside>
    );
}