import type { ReactNode } from "react";
import {
    AppSidebar,
    SidebarUser,
    type SidebarContentProps,
} from "./app-sidebar";
import { MobileNav } from "./mobile-nav";
import { TopBar } from "./top-bar";
import { UserMenu } from "./user-menu";
import {
    buildAdminNavItems,
    buildStoreNavItems,
    type NavItem,
    type StoreRole,
} from "./nav-items";
import { cn } from "@/utils/jsx-classes";

/* -------------------------------------------------------------------------- */
/*  Shared types                                                              */
/* -------------------------------------------------------------------------- */

/** Minimal user shape the shell needs. Decoupled from any domain schema. */
export interface ShellUser {
    id: string;
    name: string;
    email: string;
    imageUrl?: string | null;
}

export type StoreStatus = "PENDING" | "ACTIVE" | "SUSPENDED";

/* -------------------------------------------------------------------------- */
/*  StatusBanner — rendered above <main> for non-active stores                */
/* -------------------------------------------------------------------------- */

function StatusBanner({ status }: { status: Exclude<StoreStatus, "ACTIVE"> }) {
    const config = {
        PENDING: {
            tone: "border-warning-border bg-warning-bg text-warning-fg",
            message:
                "This store is pending approval. Some features may be limited until it is activated.",
        },
        SUSPENDED: {
            tone: "border-danger-border bg-danger-bg text-danger-fg",
            message:
                "This store is currently suspended. Contact platform support if you believe this is a mistake.",
        },
    }[status];

    return (
        <div
            role="status"
            className={cn(
                "flex items-start gap-2 border-b px-4 py-2.5 text-body-sm sm:px-6",
                config.tone,
            )}
        >
            <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0"
            >
                <path
                    d="M12 8v5m0 3h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
            <p>{config.message}</p>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*  AppShell — internal primitive                                             */
/* -------------------------------------------------------------------------- */

interface AppShellProps {
    /** Everything the sidebar and mobile drawer need to render. */
    sidebar: SidebarContentProps;
    user: ShellUser;
    /** Optional banner shown above <main>. */
    banner?: ReactNode;
    /** Overrides padding / scroll on <main>. Used by POS-style full-bleed pages. */
    contentClassName?: string;
    children: ReactNode;
}

function AppShell({
    sidebar,
    user,
    banner,
    contentClassName,
    children,
}: AppShellProps) {
    return (
        <div className="flex h-dvh">
            {/* Desktop sidebar */}
            <AppSidebar {...sidebar} />

            {/* Main column */}
            <div className="flex min-w-0 flex-1 flex-col">
                <TopBar
                    leading={
                        <>
                            {/* Drawer trigger + store name — both hidden at lg+ */}
                            <MobileNav {...sidebar} />
                            <span className="truncate text-title-md text-on-surface lg:hidden">
                                {sidebar.title}
                            </span>
                        </>
                    }
                    trailing={
                        <UserMenu
                            name={user.name}
                            email={user.email}
                            imageUrl={user.imageUrl}
                        />
                    }
                />

                {banner}

                <main
                    className={cn(
                        "flex-1 overflow-y-auto p-4 sm:p-6",
                        contentClassName,
                    )}
                >
                    {children}
                </main>
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*  StoreShell                                                                */
/* -------------------------------------------------------------------------- */

export interface StoreShellProps {
    store: {
        id: string;
        name: string;
        logoUrl?: string | null;
        status: StoreStatus;
    };
    user: ShellUser;
    role: StoreRole;
    /** Overrides padding / scroll on <main>. */
    contentClassName?: string;
    children: ReactNode;
}

/** Maps a StoreRole to its display label used as the sidebar subtitle. */
function roleLabel(role: StoreRole): string {
    switch (role) {
        case "OWNER":
            return "Owner";
        case "MANAGER":
            return "Manager";
        case "STAFF":
            return "Staff";
    }
}

export function StoreShell({
    store,
    user,
    role,
    contentClassName,
    children,
}: StoreShellProps) {
    const items: NavItem[] = buildStoreNavItems(store.id, role);

    return (
        <AppShell
            sidebar={{
                items,
                title: store.name,
                subtitle: roleLabel(role),
                avatarUrl: store.logoUrl,
                footer: <SidebarUser name={user.name} email={user.email} imageUrl={user.imageUrl} />,
            }}
            user={user}
            banner={
                store.status !== "ACTIVE" ? <StatusBanner status={store.status} /> : null
            }
            contentClassName={contentClassName}
        >
            {children}
        </AppShell>
    );
}

/* -------------------------------------------------------------------------- */
/*  AdminShell                                                                */
/* -------------------------------------------------------------------------- */

export interface AdminShellProps {
    user: ShellUser;
    contentClassName?: string;
    children: ReactNode;
}

export function AdminShell({ user, contentClassName, children }: AdminShellProps) {
    return (
        <AppShell
            sidebar={{
                items: buildAdminNavItems(user.id),
                title: "Admin",
                subtitle: "Platform",
                footer: <SidebarUser name={user.name} email={user.email} imageUrl={user.imageUrl} />,
            }}
            user={user}
            contentClassName={contentClassName}
        >
            {children}
        </AppShell>
    );
}