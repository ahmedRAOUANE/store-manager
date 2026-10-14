
import { describe, expect, it } from "vitest";
import { crossedIntoLowStock } from "../utils/notification-transitions";

describe("crossedIntoLowStock", () => {
    it("detects a downward crossing of the threshold", () => {
        expect(
            crossedIntoLowStock(
                { stockQuantity: 10, minimumStock: 5 },
                { stockQuantity: 5, minimumStock: 5 },
            ),
        ).toBe(true);
    });

    it("detects a crossing below the threshold", () => {
        expect(
            crossedIntoLowStock(
                { stockQuantity: 6, minimumStock: 5 },
                { stockQuantity: 4, minimumStock: 5 },
            ),
        ).toBe(true);
    });

    it("does not notify when stock decreases but remains above the threshold", () => {
        expect(
            crossedIntoLowStock(
                { stockQuantity: 10, minimumStock: 5 },
                { stockQuantity: 8, minimumStock: 5 },
            ),
        ).toBe(false);
    });

    it("does not notify for another decrease while already low", () => {
        expect(
            crossedIntoLowStock(
                { stockQuantity: 4, minimumStock: 5 },
                { stockQuantity: 2, minimumStock: 5 },
            ),
        ).toBe(false);
    });

    it("does not notify when stock increases", () => {
        expect(
            crossedIntoLowStock(
                { stockQuantity: 4, minimumStock: 5 },
                { stockQuantity: 8, minimumStock: 5 },
            ),
        ).toBe(false);
    });

    it("does not notify for a threshold-only change", () => {
        expect(
            crossedIntoLowStock(
                { stockQuantity: 8, minimumStock: 5 },
                { stockQuantity: 8, minimumStock: 10 },
            ),
        ).toBe(false);
    });

    it("allows a new crossing after stock recovers above the threshold", () => {
        expect(
            crossedIntoLowStock(
                { stockQuantity: 8, minimumStock: 5 },
                { stockQuantity: 5, minimumStock: 5 },
            ),
        ).toBe(true);
    });

    it("rejects invalid snapshots", () => {
        expect(
            crossedIntoLowStock(
                { stockQuantity: Number.NaN, minimumStock: 5 },
                { stockQuantity: 4, minimumStock: 5 },
            ),
        ).toBe(false);
    });
});
