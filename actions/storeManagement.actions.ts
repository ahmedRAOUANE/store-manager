"use server";

import { AppError } from "@/errors/base.error";
import { suspendStoreService, getStoreService, updateStoreService } from "@/services/store.services";
import { getManagementDashboardService, getStaffDashboardService } from "@/services/storeDashboard.services";
import { acceptMembershipService, getAllStoreMembersService, invalidStoreMemberService, promoteStoreMemberService, rejectMembershipService } from "@/services/storeMembership.services";
import { withStoreRole } from "@/utils/auth";
import { UpdateStoreInput } from "@/zod/store.schema";
import { revalidatePath } from "next/cache";

export const getAllMembers = withStoreRole(
    ["OWNER", "MANAGER"],
    async (_user, _membership, storeId: string) =>
        await getAllStoreMembersService(storeId)
);

export const deactivateStore = withStoreRole(
    ["OWNER"],
    async (_user, _membership, storeId: string) => await suspendStoreService(storeId)
);

export const getCurrentStore = withStoreRole(
    ["OWNER", "MANAGER"],
    async (_user, _membership, storeId) => await getStoreService(storeId)
);

export const updateStore = withStoreRole(
    ["OWNER", "MANAGER"],
    async (_user, _membership, storeId: string, storeData: UpdateStoreInput) => await updateStoreService(storeId, storeData)
);

export const acceptMembershipRequest = withStoreRole(
    ["OWNER", "MANAGER"],
    async (_user, _membership, storeId: string, membershipId: string) => {
        const result = await acceptMembershipService(storeId, membershipId);

        if (result instanceof AppError) {
            return { ok: false as const, message: result.message };
        }

        revalidatePath(`/stores/${storeId}`, "layout");
        return { ok: true as const };
    }
);

export const rejectMembershipRequest = withStoreRole(
    ["OWNER", "MANAGER"],
    async (_user, _membership, storeId: string, membershipId: string) => {
        const result = await rejectMembershipService(storeId, membershipId);

        if (result instanceof AppError) {
            return { ok: false as const, message: result.message };
        }

        revalidatePath(`/stores/${storeId}`, "layout");
        return { ok: true as const };
    }
);

export const promoteMember = withStoreRole(
    ["OWNER", "MANAGER"],
    async (
        _user,
        _membership,
        storeId: string,
        membershipId: string,
        newRole: "OWNER" | "MANAGER" | "STAFF"
    ) => {
        const result = await promoteStoreMemberService(
            storeId,
            membershipId,
            newRole
        );
        console.log("result: ", result);

        if (result instanceof AppError) {
            return { ok: false as const, message: result.message };
        }

        revalidatePath(`/stores/${storeId}`, "layout");
        return { ok: true as const };
    }
);

export const invalidateUserMembership = withStoreRole(
    ["OWNER", "MANAGER"],
    async (_user, _membership, storeId: string, memberId: string) => {
        const result = await invalidStoreMemberService(storeId, memberId);

        if (result instanceof AppError) {
            return { ok: false as const, message: result.message };
        }

        revalidatePath(`/stores/${storeId}`, "layout");
        return { ok: true as const };
    }
);


// dashboard
export const getManagementDashboard = withStoreRole(
    ["OWNER", "MANAGER"],
    async (_user, _membership, storeId: string) =>
        await getManagementDashboardService(storeId)
);

export const getStaffDashboard = withStoreRole(
    ["STAFF"],
    async (_user, _membership, storeId: string) =>
        await getStaffDashboardService(storeId)
);

/**
 * Returns the calling user's membership for the current store.
 *
 * Used by the members page to know which row is "self" and what role
 * ceiling to apply when rendering role-change controls. The wrapper
 * already resolves the membership for its own auth check, so this is a
 * cheap read with no additional DB work.
 */
export const getCurrentMembership = withStoreRole(
    ["OWNER", "MANAGER"],
    async (_user, membership) => {
        if (!membership || membership instanceof AppError) return new AppError("Membership not found");

        return {
            membershipId: membership.id,
            userId: membership.userId,
            role: membership.role as "OWNER" | "MANAGER" | "STAFF",
        };
    }
);

