import { describe, it, expect } from "vitest";
import { StoreMembership } from "../../access/types";
import { canOperateOnStore, hasStoreRole } from "../../access/predicates";

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
    
    it("allows ADMIN to operate on any store status", () => {
        expect(canOperateOnStore("ACTIVE", "ADMIN")).toBe(true);
        expect(canOperateOnStore("PENDING", "ADMIN")).toBe(true);
        expect(canOperateOnStore("SUSPENDED", "ADMIN")).toBe(true);
    });
    
    it("allows USER to operate on ACTIVE stores", () => {
        expect(canOperateOnStore("ACTIVE", "USER")).toBe(true);
    });
    
    it("blocks USER from operating on PENDING stores", () => {
        expect(canOperateOnStore("PENDING", "USER")).toBe(false);
    });
    
    it("blocks USER from operating on SUSPENDED stores", () => {
        expect(canOperateOnStore("SUSPENDED", "USER")).toBe(false);
    });
});

