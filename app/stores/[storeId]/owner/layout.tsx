import { AppSidebar } from "@/components/layout/app-sidebar";
import { buildStoreNavItems } from "@/components/layout/nav-items";
import { TopBar } from "@/components/layout/top-bar";
import { AppError } from "@/errors/base.error";
import { getCurrentStoreContext } from "@/utils/auth";
import { redirect } from "next/navigation";

export default async function OwnerLayout({ children, params }: LayoutProps<"/stores/[storeId]/owner">) {
    const storeId = (await params).storeId

    const ctx = await getCurrentStoreContext(storeId);

    if (!ctx || ctx instanceof AppError) {
        redirect("/dashboard");
    }

    const { user, store, membership } = ctx;

    if (!user || !store || membership.role !== "OWNER") {
        redirect("/dashboard");
    }

    const sidebarItems = buildStoreNavItems(storeId, "OWNER");

    return (
        <div className="h-screen grid grid-cols-1 md:grid-cols-4 grid-rows-10 min-h-full">
            <div className="col-span-1 row-span-10">
                <AppSidebar title="store" items={sidebarItems} />
            </div>

            <div className="col-span-1 md:col-span-3">
                <TopBar leading="dashboard" />
            </div>

            <main className="col-span-1 md:col-span-3 row-span-9 p-6 overflow-auto">
                {children}
            </main>
        </div>
    )
}