import { AppSidebar } from "@/components/layout/app-sidebar";
import { buildStoreNavItems } from "@/components/layout/nav-items";
import { TopBar } from "@/components/layout/top-bar";
import { AppError } from "@/errors/base.error";
import { getCurrentStoreContext } from "@/utils/auth";
import { redirect } from "next/navigation";


export default async function ManagerLayout({ children, params }: LayoutProps<"/stores/[storeId]/manager">) {
    const storeId = (await params).storeId

    const ctx = await getCurrentStoreContext(storeId);

    if (!ctx || ctx instanceof AppError) {
        console.log("ctx: ", ctx);
        redirect("/dashboard");
    }

    const { store, membership } = ctx;

    if (storeId !== store.id) {
        redirect(`/dashboard`);
    }

    if (membership.role !== "MANAGER") {
        redirect(`/dashboard`);
    }

    const sidebarItems = buildStoreNavItems(storeId, "MANAGER");


    return (
        <div className="h-screen grid grid-cols-1 md:grid-cols-4 grid-rows-10">
            <div className="col-span-1 row-span-10">
                <AppSidebar title="store"  items={sidebarItems} />
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