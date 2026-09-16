import { AppSidebar } from "@/components/layout/app-sidebar";
import { buildAdminNavItems } from "@/components/layout/nav-items";
import { TopBar } from "@/components/layout/top-bar";
import { AppError } from "@/errors/base.error";
import { getCurrentUser } from "@/utils/auth";
import { isUuid } from "@/utils/uuid";
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
            <div className="col-span-1 row-span-10">
                <AppSidebar title={user.firstName || ""} items={sidebarItems} />
            </div>

            <div className="col-span-1 md:col-span-3">
                <TopBar leading="dashboard" />
            </div>

            <main className="col-span-1 md:col-span-3 row-span-9 p-6 overflow-y-auto">
                {children}
            </main>
        </div>
    )
}