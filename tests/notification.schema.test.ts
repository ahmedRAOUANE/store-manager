
import { describe, expect, it } from "vitest";
import {
    NotificationEventSchema,
    validateNotificationEvent,
} from "../zod/notification.schema";

describe("notification event schema", () => {
    it("accepts every approved event type", () => {
        const events = [
            {
                type: "STORE_ACTIVATED",
                payload: { storeName: "Hardware Store" },
            },
            {
                type: "STORE_SUSPENDED",
                payload: { storeName: "Hardware Store" },
            },
            {
                type: "MEMBERSHIP_ACCEPTED",
                payload: { storeName: "Hardware Store" },
            },
            {
                type: "MEMBERSHIP_REJECTED",
                payload: { storeName: "Hardware Store" },
            },
            {
                type: "MEMBER_ROLE_CHANGED",
                payload: {
                    storeName: "Hardware Store",
                    previousRole: "STAFF",
                    newRole: "MANAGER",
                },
            },
            {
                type: "MEMBERSHIP_INVALIDATED",
                payload: { storeName: "Hardware Store" },
            },
            {
                type: "PRODUCT_LOW_STOCK",
                payload: {
                    productId: "0e0fb388-7879-4171-8716-3e9cb0577d8f",
                    productName: "Screwdriver",
                    stockQuantity: 3,
                    minimumStock: 5,
                },
            },
        ] as const;

        for (const event of events) {
            expect(
                NotificationEventSchema.safeParse(event).success,
            ).toBe(true);
        }
    });

    it("rejects unsupported event types", () => {
        expect(
            validateNotificationEvent({
                type: "SOME_UNSUPPORTED_EVENT",
                payload: {},
            }).success,
        ).toBe(false);
    });

    it("rejects unexpected payload fields", () => {
        expect(
            validateNotificationEvent({
                type: "STORE_ACTIVATED",
                payload: {
                    storeName: "Hardware Store",
                    internalSecret: "should-not-be-stored",
                },
            }).success,
        ).toBe(false);
    });

    it("rejects a role-change event when the role did not change", () => {
        expect(
            validateNotificationEvent({
                type: "MEMBER_ROLE_CHANGED",
                payload: {
                    storeName: "Hardware Store",
                    previousRole: "STAFF",
                    newRole: "STAFF",
                },
            }).success,
        ).toBe(false);
    });

    it("rejects invalid low-stock values and identifiers", () => {
        expect(
            validateNotificationEvent({
                type: "PRODUCT_LOW_STOCK",
                payload: {
                    productId: "not-a-uuid",
                    productName: "Screwdriver",
                    stockQuantity: -1,
                    minimumStock: 5,
                },
            }).success,
        ).toBe(false);
    });
});
