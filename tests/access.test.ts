import { describe, it, expect } from "vitest";
import { StoreMembership } from "../access/types";
import { hasStoreRole } from "../access/predicates";

describe("hasStoreRole", () => {
    it("returns false for null membership", () => {
        expect(hasStoreRole(null, ["OWNER"])).toBe(false);
    });
    it("returns false when role not in set", () => {
        expect(hasStoreRole({ role: "STAFF" } as StoreMembership, ["OWNER"])).toBe(false);
    });
    it("returns true when role in set", () => {
        expect(hasStoreRole({ role: "OWNER" } as StoreMembership, ["OWNER"])).toBe(true);
    });
    it("returns false for empty role list", () => {
        expect(hasStoreRole({ role: "OWNER" } as StoreMembership, [])).toBe(false);
    });
});