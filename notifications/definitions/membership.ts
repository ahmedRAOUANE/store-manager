import { z } from "zod";
import { StoreRole } from "@/zod/membership.schema";
import { defineNotification, derivePresentation, requireStoreId } from "../definition";
import { getStoreOwnersAndManagers, resolveAffectedUser } from "../recipients";

/**
 * Payload shared by the three membership lifecycle events.
 *
 * `storeName` is captured at event time so a historical notification
 * remains meaningful even if the store is later renamed.
 */
const StoreNamePayloadSchema = z
    .object({
        storeName: z.string().trim().min(1).max(200),
    })
    .strict();

/**
 * MEMBER_ROLE_CHANGED carries the previous and new roles so the message
 * can describe the transition without a second lookup at render time.
 *
 * The refinement rejects same-to-same changes at the boundary. A caller
 * that has nothing to announce should not publish.
 */
const MemberRoleChangedPayloadSchema = z
    .object({
        storeName: z.string().trim().min(1).max(200),
        previousRole: StoreRole,
        newRole: StoreRole,
    })
    .strict()
    .refine((payload) => payload.previousRole !== payload.newRole, {
        message: "The previous and new roles must differ.",
        path: ["newRole"],
    });

/**
 * MEMBERSHIP_ACCEPTED
 *
 * Fired when a pending membership is activated by a store owner or
 * manager. Notifies the member whose request was accepted.
 *
 * Recipients: the affected user only.
 */
export const membershipAccepted = defineNotification({
    type: "MEMBERSHIP_ACCEPTED",
    payloadSchema: StoreNamePayloadSchema,
    presentation: derivePresentation("MEMBERSHIP_ACCEPTED"),
    resolveRecipients: resolveAffectedUser,
});

/**
 * MEMBERSHIP_REJECTED
 *
 * Fired when a pending membership is rejected. Notifies the member
 * whose request was rejected.
 *
 * Recipients: the affected user only.
 */
export const membershipRejected = defineNotification({
    type: "MEMBERSHIP_REJECTED",
    payloadSchema: StoreNamePayloadSchema,
    presentation: derivePresentation("MEMBERSHIP_REJECTED"),
    resolveRecipients: resolveAffectedUser,
});

/**
 * MEMBERSHIP_INVALIDATED
 *
 * Fired when an active membership is revoked. Notifies the member whose
 * access was removed.
 *
 * Recipients: the affected user only.
 */
export const membershipInvalidated = defineNotification({
    type: "MEMBERSHIP_INVALIDATED",
    payloadSchema: StoreNamePayloadSchema,
    presentation: derivePresentation("MEMBERSHIP_INVALIDATED"),
    resolveRecipients: resolveAffectedUser,
});

/**
 * MEMBER_ROLE_CHANGED
 *
 * Fired when a member's role is updated. Notifies the affected member.
 * The actor performing the change is not notified.
 *
 * Recipients: the affected user only.
 */
export const memberRoleChanged = defineNotification({
    type: "MEMBER_ROLE_CHANGED",
    payloadSchema: MemberRoleChangedPayloadSchema,
    presentation: derivePresentation("MEMBER_ROLE_CHANGED"),
    resolveRecipients: resolveAffectedUser,
});

/**
 * Payload for MEMBERSHIP_REQUESTED.
 *
 * `requesterName` is captured at event time — the owner sees the name
 * the user had when they asked to join, not the name they might have
 * later.
 */
const MembershipRequestedPayloadSchema = z
    .object({
        storeName: z.string().trim().min(1).max(200),
        requesterName: z.string().trim().min(1).max(200),
    })
    .strict();

/**
 * MEMBERSHIP_REQUESTED
 *
 * Fired when a user asks to join a store. Notifies the store's
 * decision-makers (OWNER and MANAGER) so they can accept or reject.
 *
 * Recipients: active OWNER and MANAGER members of the store.
 */
export const membershipRequested = defineNotification({
    type: "MEMBERSHIP_REQUESTED",
    payloadSchema: MembershipRequestedPayloadSchema,
    presentation: derivePresentation("MEMBERSHIP_REQUESTED"),
    resolveRecipients: (tx, ctx) =>
        getStoreOwnersAndManagers(tx, requireStoreId(ctx)),
});