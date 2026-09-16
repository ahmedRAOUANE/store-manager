import { AppError } from "@/errors/base.error";
import { DatabaseError } from "@/errors/db.error";
import { ValidationError } from "@/errors/validation.error";
import { models } from "@/prisma/db";
import { isUuid } from "@/utils/uuid";
import { CreateMembershipInput } from "@/zod/membership.schema";

// for the user to be able to manage his own memberships
export const getAllMembershipsService = async (userId: string) => {
    if (!isUuid(userId)) {
        console.log("user id: ", userId)
        return new ValidationError("invalid id provided")
    }

    try {
        return await models.StoreMembership
            .where({
                userId
            })
            .all();
    } catch (error) {
        console.log("services/storeMembership.services.ts > getActiveMembershipService > ", error)
        throw new DatabaseError("unable to get membership from the db", error as Record<string, unknown>)
    }
}

export const requestMembershipService = async (
    storeId: string,
    userId: string
) => {
    if (!isUuid(storeId) || !isUuid(userId)) {
        return new ValidationError("invalid id provided");
    }

    try {
        console.log("requestMembership storeId: ", storeId);
        const store = await models.Store
            .where({
                id: storeId,
                status: "ACTIVE",
            })
            .first();

        if (!store) {
            return new AppError("store is not available");
        }

        const existingMembership = await models.StoreMembership
            .where({
                storeId,
                userId,
            })
            .first();

        if (existingMembership) {
            if (existingMembership.status === "ACTIVE") {
                return new AppError("you are already a member of this store");
            }

            if (existingMembership.status === "PENDING") {
                return new AppError("your membership request is already pending");
            }

            if (existingMembership.status === "INVALIDATED") {
                return new AppError("you cannot request to join this store");
            }

            // REJECTED
            // Depending on your business rules, you can either:
            // 1. allow another request
            // 2. reject another request
        }

        const newMembershipRequest: CreateMembershipInput = {
            userId,
            storeId,
            role: "STAFF",
            status: "PENDING",
        };

        return await models.StoreMembership
            .where({ storeId })
            .create(newMembershipRequest);

    } catch (error) {
        console.log(
            "services/storeMembership.services.ts > requestMembershipService > ",
            error
        );

        throw new DatabaseError(
            "unable to push membership to the db",
            error as Record<string, unknown>
        );
    }
};

export const getActiveMembershipService = async (userId: string, storeId: string) => {
    if (!isUuid(userId) || !isUuid(storeId)) {
        console.log("user id: ", userId)
        console.log("store id: ", storeId)
        return new ValidationError("invalid id provided")
    }

    try {
        return await models.StoreMembership
            .where({
                userId,
                storeId,
                status: "ACTIVE",
            })
            .first();
    } catch (error) {
        console.log("services/storeMembership.services.ts > getActiveMembershipService > ", error)
        throw new DatabaseError("unable to get membership from the db", error as Record<string, unknown>)
    }
}

// for the store owner and manager to be able to manage the store members
export const getAllStoreMembersService = async (storeId: string) => {
    if (!isUuid(storeId)) {
        console.log("store id: ", storeId)
        return new ValidationError("invalid store id provided")
    }

    try {
        return await models.StoreMembership
            .where({
                storeId
            })
            .include("user", (user) =>
                user.select("firstName", "lastName", "email", "imageUrl")
            )
            .all();
    } catch (error) {
        console.log("services/storeMembership.services.ts > getAllStoreMembersService > ", error)
        throw new DatabaseError("unable to get membership from the db", error as Record<string, unknown>)
    }
}

export const promoteStoreMemberService = async (storeId: string, memberId: string, newRole: "STAFF" | "MANAGER" | "OWNER") => {
    if (!isUuid(storeId) || !isUuid(memberId)) {
        console.log("store id: ", storeId)
        console.log("member id: ", memberId)
        return new ValidationError("invalid store id or member id provided")
    }

    try {
        const existMember = await models.StoreMembership
            .where({
                storeId,
                id: memberId
            })
            .first();

        if (!existMember) {
            return new AppError("store member was not found")
        }

        const updatedMember = await models.StoreMembership.where({
            storeId,
            id: memberId
        }).update({
            role: newRole
        });

        return updatedMember;
    } catch (error) {
        console.log("services/storeMembership.services.ts > promoteStoreMemberService > ", error)
        throw new DatabaseError("unable to get membership from the db", error as Record<string, unknown>)
    }
}

export const acceptMembershipService = async (storeId: string, membershipId: string) => {
    if (!isUuid(storeId) || !isUuid(membershipId)) {
        console.log("services/storeMembership.services.ts > acceptMembershipService > storeId", storeId)
        console.log("services/storeMembership.services.ts > acceptMembershipService > membershipId", membershipId)
        return new ValidationError("invalid store id provided")
    };

    try {
        return await models.StoreMembership.where({storeId, id: membershipId, status: "PENDING"}).update({status: "ACTIVE"})
    } catch (error) {
        console.log("services/storeMembership.services.ts > acceptMembershipService > ", error)
        throw new DatabaseError("unable to push membership to the db", error as Record<string, unknown>)
    }
}

export const rejectMembershipService = async (storeId: string, membershipId: string) => {
    if (!isUuid(storeId) || !isUuid(membershipId)) {
        console.log("services/storeMembership.services.ts > rejectMembershipService > storeId", storeId)
        console.log("services/storeMembership.services.ts > rejectMembershipService > membershipId", membershipId)
        return new ValidationError("invalid store id provided")
    };

    try {
        return await models.StoreMembership.where({storeId, status: "PENDING", id: membershipId}).update({status: "REJECTED"})
    } catch (error) {
        console.log("services/storeMembership.services.ts > rejectMembershipService > ", error)
        throw new DatabaseError("unable to push membership to the db", error as Record<string, unknown>)
    }
}

export const invalidStoreMemberService = async (
    storeId: string,
    memberId: string
) => {
    if (!isUuid(storeId) || !isUuid(memberId)) {
        console.log(
            "services/storeMembership.services.ts > fireStoreMemberService > storeId",
            storeId
        );
        console.log(
            "services/storeMembership.services.ts > fireStoreMemberService > memberId",
            memberId
        );

        return new ValidationError("invalid id provided");
    }

    try {
        const member = await models.StoreMembership
            .where({
                storeId,
                id: memberId,
                status: "ACTIVE",
            })
            .first();

        if (!member) {
            return new AppError("active store member was not found");
        }

        // Don't allow firing the owner
        if (member.role === "OWNER") {
            return new AppError("store owner cannot be fired");
        }

        return await models.StoreMembership
            .where({
                storeId,
                id: memberId,
                status: "ACTIVE",
            })
            .update({
                status: "INVALIDATED",
            });

    } catch (error) {
        console.log(
            "services/storeMembership.services.ts > fireStoreMemberService > ",
            error
        );

        throw new DatabaseError(
            "unable to fire store member",
            error as Record<string, unknown>
        );
    }
};