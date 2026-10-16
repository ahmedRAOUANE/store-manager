import { AppError } from "@/errors/base.error";
import { getCurrentStoreContext } from "@/utils/auth";
import { isUuid } from "@/utils/uuid";
import { redirect } from "next/navigation";

export default async function StoreLayout({ children, params }: LayoutProps<"/stores/[storeId]">) {
    const {storeId} = await params
    const ctx = await getCurrentStoreContext(storeId);

    if (ctx instanceof AppError) {
        redirect("/dashboard");
    }

    const { store } = ctx;
    
    if (!isUuid(storeId)) {
        redirect(`/dashboard`);
    }
    
    if (store.status === "SUSPENDED") {
        redirect(`/stores/${storeId}/activate`);
    }
    
    if (store.status === "PENDING") {
        redirect(`/stores/${storeId}/activate`);
    }
    
    return (
        <>{children}</>
    )
}