import { AppError } from "@/errors/base.error";
import { getAdminDashboardService } from "@/services/adminDashboard.services";
import { activateStoreService, getAllStoresService, getStoreService, suspendStoreService } from "@/services/store.services";
import { getAllUsersService, getUserService } from "@/services/user.services";
import { withGlobalRole } from "@/utils/auth";
import { revalidatePath } from "next/cache";


// admin dashboard
export const getCurrentAdmin = withGlobalRole(
    ["ADMIN"],
    (user) => getUserService(user.id)
);

export const getAllUsers = withGlobalRole(
    ["ADMIN"],
    () => getAllUsersService()
);

export const getAdminDashboard = withGlobalRole(
    ["ADMIN"],
    async () => await getAdminDashboardService()
);

// store
export const getAllStores = withGlobalRole(
    ["ADMIN"],
    async () => {
        const stores = await getAllStoresService();

        if (stores instanceof AppError) {
            return {
                ok: false,
                message: "something went wrong"
            }
        } else {
            return {
                ok: true,
                data: stores.map(store => ({
                    id: store.id,
                    name: store.name,
                    description: store.description,
                    phone: store.phone,
                    email: store.email,
                    address: store.address,
                    status: store.status
                }))
            }
        }
    }
)

export const getStoreById = withGlobalRole(
    ["ADMIN"],
    async (_user, storeId: string) => await getStoreService(storeId)
)

export const activateStore = withGlobalRole(
    ["ADMIN"],
    async (_user, storeId: string) => {
        const activatedStore = await activateStoreService(storeId);
        revalidatePath("/stores", "layout")
        if (activatedStore instanceof AppError) {
            return {ok: false}
        } else {
            return {ok: true}
        }
    }
)

export const suspendStore = withGlobalRole(
    ["ADMIN"],
    async (_user, storeId: string) => {
        const suspendedStore = await suspendStoreService(storeId);
        revalidatePath("/stores", "layout")
        if (suspendedStore instanceof AppError) {
            return {
                ok: false,
            }
        } else {
            return {ok: true}
        }
    }
)