import { AppError } from "@/errors/base.error";
import { DatabaseError } from "@/errors/db.error";
import { ValidationError } from "@/errors/validation.error";
import { db, models, TransactionClient } from "@/prisma/db";
import { isUuid } from "@/utils/uuid";
import { CreateMembershipInput } from "@/zod/membership.schema";
import { publishNotificationInTransaction } from "@/notifications/publish";
import {
    memberRoleChanged,
    membershipAccepted,
    membershipInvalidated,
    membershipRejected,
    membershipRequested,
} from "@/notifications/definitions/membership";

const getStoreNameInTransaction = async (
    tx: TransactionClient,
    storeId: string,
): Promise<string> => {
    const store = await tx.orm.public.Store
        .where({ id: storeId })
        .first();

    if (!store) {
        throw new Error(
            "Store not found while creating membership notification",
        );
    }

    return store.name;
};

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
            .include('store', (s) => s.select('name'))
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

        return await db.transaction(async (tx) => {
            const created = await tx.orm.public.StoreMembership
                .where({ storeId })
                .create(newMembershipRequest);

            // Resolve the requester's display name inside the same transaction
            // so the event captures what was true at the moment of the request.
            const requester = await tx.orm.public.User
                .where({ id: userId })
                .first();

            const requesterName =
                requester?.firstName?.trim() ||
                requester?.email ||
                "A user";

            await publishNotificationInTransaction(
                tx,
                membershipRequested,
                { storeName: store.name, requesterName },
                { storeId },
            );

            return created;
        });

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

export const promoteStoreMemberService = async (
    storeId: string,
    memberId: string,
    newRole: "STAFF" | "MANAGER" | "OWNER",
) => {
    if (!isUuid(storeId) || !isUuid(memberId)) {
        return new ValidationError(
            "invalid store id or member id provided",
        );
    }

    try {
        return await db.transaction(async (tx) => {
            const member = await tx.orm.public.StoreMembership
                .where({
                    storeId,
                    id: memberId,
                })
                .first();

            if (!member) {
                return new AppError("store member was not found");
            }

            if (member.role === newRole) {
                return member;
            }

            const updated = await tx.orm.public.StoreMembership
                .where({
                    storeId,
                    id: memberId,
                })
                .update({
                    role: newRole,
                });

            if (!updated) {
                return updated;
            }

            const storeName = await getStoreNameInTransaction(
                tx,
                storeId,
            );

            await publishNotificationInTransaction(
                tx,
                memberRoleChanged,
                {
                    storeName,
                    previousRole: member.role,
                    newRole,
                },
                { storeId, affectedUserId: member.userId },
            );

            return updated;
        });
    } catch (error) {
        console.log(
            "services/storeMembership.services.ts > promoteStoreMemberService > ",
            error,
        );

        throw new DatabaseError(
            "unable to update store member",
            error as Record<string, unknown>,
        );
    }
};

export const acceptMembershipService = async (
    storeId: string,
    membershipId: string,
) => {
    if (!isUuid(storeId) || !isUuid(membershipId)) {
        return new ValidationError("invalid store id provided");
    }

    try {
        return await db.transaction(async (tx) => {
            const membership = await tx.orm.public.StoreMembership
                .where({
                    storeId,
                    id: membershipId,
                    status: "PENDING",
                })
                .first();

            if (!membership) {
                return null;
            }

            const updated = await tx.orm.public.StoreMembership
                .where({
                    storeId,
                    id: membershipId,
                    status: "PENDING",
                })
                .update({
                    status: "ACTIVE",
                });

            if (!updated) {
                return updated;
            }

            const storeName = await getStoreNameInTransaction(
                tx,
                storeId,
            );

            await publishNotificationInTransaction(
                tx,
                membershipAccepted,
                { storeName },
                { storeId, affectedUserId: membership.userId },
            );

            return updated;
        });
    } catch (error) {
        console.log(
            "services/storeMembership.services.ts > acceptMembershipService > ",
            error,
        );

        throw new DatabaseError(
            "unable to push membership to the db",
            error as Record<string, unknown>,
        );
    }
};

export const rejectMembershipService = async (
    storeId: string,
    membershipId: string,
) => {
    if (!isUuid(storeId) || !isUuid(membershipId)) {
        return new ValidationError("invalid store id provided");
    }

    try {
        return await db.transaction(async (tx) => {
            const membership = await tx.orm.public.StoreMembership
                .where({
                    storeId,
                    id: membershipId,
                    status: "PENDING",
                })
                .first();

            if (!membership) {
                return null;
            }

            const updated = await tx.orm.public.StoreMembership
                .where({
                    storeId,
                    id: membershipId,
                    status: "PENDING",
                })
                .update({
                    status: "REJECTED",
                });

            if (!updated) {
                return updated;
            }

            const storeName = await getStoreNameInTransaction(
                tx,
                storeId,
            );

            await publishNotificationInTransaction(
                tx,
                membershipRejected,
                { storeName },
                { storeId, affectedUserId: membership.userId },
            );

            return updated;
        });
    } catch (error) {
        console.log(
            "services/storeMembership.services.ts > rejectMembershipService > ",
            error,
        );

        throw new DatabaseError(
            "unable to push membership to the db",
            error as Record<string, unknown>,
        );
    }
};

export const invalidStoreMemberService = async (
    storeId: string,
    memberId: string,
) => {
    if (!isUuid(storeId) || !isUuid(memberId)) {
        return new ValidationError("invalid id provided");
    }

    try {
        return await db.transaction(async (tx) => {
            const member = await tx.orm.public.StoreMembership
                .where({
                    storeId,
                    id: memberId,
                    status: "ACTIVE",
                })
                .first();

            if (!member) {
                return new AppError(
                    "active store member was not found",
                );
            }

            if (member.role === "OWNER") {
                return new AppError(
                    "store owner cannot be fired",
                );
            }

            const updated = await tx.orm.public.StoreMembership
                .where({
                    storeId,
                    id: memberId,
                    status: "ACTIVE",
                })
                .update({
                    status: "INVALIDATED",
                });

            if (!updated) {
                return new AppError(
                    "active store member was not found",
                );
            }

            const storeName = await getStoreNameInTransaction(
                tx,
                storeId,
            );

            await publishNotificationInTransaction(
                tx,
                membershipInvalidated,
                { storeName },
                { storeId, affectedUserId: member.userId },
            );

            return updated;
        });
    } catch (error) {
        console.log(
            "services/storeMembership.services.ts > invalidStoreMemberService > ",
            error,
        );

        throw new DatabaseError(
            "unable to invalidate store member",
            error as Record<string, unknown>,
        );
    }
};