"use server";

import { AppError } from "@/errors/base.error";
import { createStoreService, getDiscoveryStoresService } from "@/services/store.services";
import { getAllMembershipsService, requestMembershipService } from "@/services/storeMembership.services";
import { getUserService } from "@/services/user.services";
import { withAuth } from "@/utils/auth";
import { CreateStoreInput } from "@/zod/store.schema";
import { revalidatePath } from "next/cache";

export const getUser = withAuth(
    async (user) => await getUserService(user.id)
)

export const requestToCreateStore = withAuth(
    async (user, storeData: CreateStoreInput) => {
        const createdStore = await createStoreService(user.id, storeData);

        if (createdStore instanceof AppError) {
            return {
                ok: false,
                message: "request failed"
            }
        }

        return {
            ok: true,
            store: {
                name: createdStore.name,
                id: createdStore.id
            },
            message: "your request has been submitted successfully"
        }
    }
);

export const requestToJoinAStore = withAuth(
    async (user, storeId: string) => {
        revalidatePath(`/stores/${storeId}/owner/members`)

        return await requestMembershipService(storeId, user.id)
    }
);

export const getDiscoveryStores = withAuth(
    async (user) => {
        const stores = await getDiscoveryStoresService(user.id);

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
                    // phone: store.phone,
                    // email: store.email,
                    address: store.address,
                    membershipStatus: store.memberships ? store.memberships[0].status : null,
                    role: store.memberships ? store.memberships[0].role : null
                }))
            }
        }
    }
)

export const getAllMemberships = withAuth(
    async (user) => await getAllMembershipsService(user.id)
);
