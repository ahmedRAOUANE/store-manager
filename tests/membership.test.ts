
import {
    acceptMembershipService,
    invalidStoreMemberService,
    promoteStoreMemberService,
    rejectMembershipService,
    requestMembershipService,
} from "../services/storeMembership.services";
import {
    activateStoreService,
    createStoreService,
} from "../services/store.services";
import { models } from "../prisma/db";
import { describe, expect, it } from "vitest";
import type { CreateStoreInput } from "../zod/store.schema";

describe("membership notification tests", () => {
    const ownerId = "52b45375-ce27-4859-8839-d991d3634330";

    const createActiveStore = async () => {
        const storeData: CreateStoreInput = {
            name: `Membership test store ${crypto.randomUUID()}`,
            description: null,
            phone: null,
            email: null,
            address: null,
            currency: "DZ",
            timezone: "UTC",
        };

        const store = await createStoreService(ownerId, storeData);

        if (store instanceof Error) {
            throw store;
        }

        const activation = await activateStoreService(store.id);
        expect(activation).toBe(true);

        return store;
    };

    const getNonOwnerUserId = async () => {
        const users = await models.User.all();
        const user = users.find((candidate) => candidate.id !== ownerId);

        if (!user) {
            throw new Error(
                "Membership tests require an existing user other than the store owner",
            );
        }

        return user.id;
    };

    const createPendingMembership = async () => {
        const store = await createActiveStore();
        const userId = await getNonOwnerUserId();

        const membership = await requestMembershipService(
            store.id,
            userId,
        );

        if (membership instanceof Error) {
            throw membership;
        }

        expect(membership).toHaveProperty("id");

        return { store, userId, membership };
    };

    const getNotifications = async (
        storeId: string,
        recipientId: string,
        type:
            | "MEMBERSHIP_ACCEPTED"
            | "MEMBERSHIP_REJECTED"
            | "MEMBER_ROLE_CHANGED"
            | "MEMBERSHIP_INVALIDATED"
            | "MEMBERSHIP_REQUESTED"
    ) => {
        return models.Notification
            .where({ storeId, recipientId, type })
            .all();
    };

    it("accepts a pending membership and notifies the member", async () => {
        const { store, userId, membership } =
            await createPendingMembership();

        const result = await acceptMembershipService(
            store.id,
            membership.id,
        );

        expect(result).not.toBeInstanceOf(Error);

        const updatedMembership = await models.StoreMembership
            .where({ id: membership.id, storeId: store.id })
            .first();

        expect(updatedMembership?.status).toBe("ACTIVE");

        const notifications = await getNotifications(
            store.id,
            userId,
            "MEMBERSHIP_ACCEPTED",
        );

        expect(notifications).toHaveLength(1);
        expect(notifications[0].payload).toEqual({
            storeName: store.name,
        });
    });

    it("rejects a pending membership and notifies the member", async () => {
        const { store, userId, membership } =
            await createPendingMembership();

        const result = await rejectMembershipService(
            store.id,
            membership.id,
        );

        expect(result).not.toBeInstanceOf(Error);

        const updatedMembership = await models.StoreMembership
            .where({ id: membership.id, storeId: store.id })
            .first();

        expect(updatedMembership?.status).toBe("REJECTED");

        const notifications = await getNotifications(
            store.id,
            userId,
            "MEMBERSHIP_REJECTED",
        );

        expect(notifications).toHaveLength(1);
        expect(notifications[0].payload).toEqual({
            storeName: store.name,
        });
    });

    it("changes a member's role and notifies the member", async () => {
        const { store, userId, membership } =
            await createPendingMembership();

        const accepted = await acceptMembershipService(
            store.id,
            membership.id,
        );

        expect(accepted).not.toBeNull();

        const result = await promoteStoreMemberService(
            store.id,
            membership.id,
            "MANAGER",
        );

        expect(result).not.toBeInstanceOf(Error);

        const updatedMembership = await models.StoreMembership
            .where({ id: membership.id, storeId: store.id })
            .first();

        expect(updatedMembership?.role).toBe("MANAGER");

        const notifications = await getNotifications(
            store.id,
            userId,
            "MEMBER_ROLE_CHANGED",
        );

        expect(notifications).toHaveLength(1);
        expect(notifications[0].payload).toEqual({
            storeName: store.name,
            previousRole: "STAFF",
            newRole: "MANAGER",
        });
    });

    it("invalidates an active membership and notifies the member", async () => {
        const { store, userId, membership } =
            await createPendingMembership();

        const accepted = await acceptMembershipService(
            store.id,
            membership.id,
        );

        expect(accepted).not.toBeNull();

        const result = await invalidStoreMemberService(
            store.id,
            membership.id,
        );

        expect(result).not.toBeInstanceOf(Error);

        const updatedMembership = await models.StoreMembership
            .where({ id: membership.id, storeId: store.id })
            .first();

        expect(updatedMembership?.status).toBe("INVALIDATED");

        const notifications = await getNotifications(
            store.id,
            userId,
            "MEMBERSHIP_INVALIDATED",
        );

        expect(notifications).toHaveLength(1);
        expect(notifications[0].payload).toEqual({
            storeName: store.name,
        });
    });

    it("does not notify when the role is unchanged", async () => {
        const { store, userId, membership } =
            await createPendingMembership();

        const result = await promoteStoreMemberService(
            store.id,
            membership.id,
            "STAFF",
        );

        expect(result).not.toBeInstanceOf(Error);

        const notifications = await getNotifications(
            store.id,
            userId,
            "MEMBER_ROLE_CHANGED",
        );

        expect(notifications).toHaveLength(0);
    });

    it("notifies the store owners when a membership is requested", async () => {
    const store = await createActiveStore();
    const userId = await getNonOwnerUserId();

    const membership = await requestMembershipService(
        store.id,
        userId,
    );

    expect(membership).not.toBeInstanceOf(Error);
    expect(membership).toHaveProperty("id");

    const notifications = await getNotifications(
        store.id,
        ownerId,
        "MEMBERSHIP_REQUESTED",
    );

    expect(notifications).toHaveLength(1);
    expect(notifications[0].payload).toMatchObject({
        storeName: store.name,
    });
    expect(
        (notifications[0].payload as { requesterName: string })
            .requesterName,
    ).toBeTruthy();
});
});
