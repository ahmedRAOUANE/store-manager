import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { buildAdminNavItems } from "@/components/layout/nav-items";
import { TopBar } from "@/components/layout/top-bar";
import { UserMenu } from "@/components/layout/user-menu";
import { AppError } from "@/errors/base.error";
import { getCurrentUser } from "@/utils/auth";
import { isUuid } from "@/utils/uuid";
import { Bell, Search } from "lucide-react";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children, params }: LayoutProps<"/admin/[adminId]">) {
    const {adminId} = await params;

    if (!isUuid(adminId)) {
        redirect("/");
    }

    const user = await getCurrentUser();

    if (!user || user instanceof AppError) {
        redirect("/");
    }
    
    if (user.globalRole !== "ADMIN" || adminId !== user.id) {
        redirect(`/dashboard`);
    }

    const sidebarItems = buildAdminNavItems(adminId);

    return (
        <div className="h-screen grid grid-cols-1 md:grid-cols-4 grid-rows-10">
            <div className="hidden md:block md:col-span-1 md:row-span-10">
                <AppSidebar title={user.firstName || ""} items={sidebarItems} />
            </div>

            <div className="col-span-1 md:col-span-3">
                <TopBar
                    leading={
                        <div className="flex items-center gap-3">
                            <MobileNav title={user.firstName || ""} items={sidebarItems} />
                            <h1 className="truncate text-sm font-semibold text-on-surface">
                                Dashboard
                            </h1>
                        </div>
                    }
                    trailing={
                        <>
                            {/* Search */}
                            <button
                                type="button"
                                className="hidden sm:inline-flex size-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high"
                                aria-label="Search"
                            >
                                <Search className="size-4" />
                            </button>

                            {/* Notifications */}
                            <button
                                type="button"
                                className="relative inline-flex size-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high"
                                aria-label="Notifications"
                            >
                                <Bell className="size-4" />
                                <span className="absolute right-2 top-2 size-1.5 rounded-full bg-primary" />
                            </button>

                            {/* User menu */}
                            <UserMenu
                                name={`${user.firstName}`}
                                email={user.email || ""}
                                links={[
                                    { label: "View Profile", link: `/user/${adminId}/profile`}
                                ]}
                            />
                        </>
                    }
                />
            </div>

            <main className="col-span-1 md:col-span-3 row-span-9 p-6 overflow-y-auto">
                {children}
            </main>
        </div>
    )
}