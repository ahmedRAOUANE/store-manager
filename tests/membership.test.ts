import { requestMembershipService, getAllStoreMembersService } from "@/services/storeMembership.services";
import { describe, it } from "vitest";

describe("membership tests", () => {
    const storeId = "8dacefdb-2c06-41e8-a845-a6a9c2cba418"; //! this should be changed

    it("should reuest new membership from a target store", {tags: ["create", "membership"]}, async () => {
        const userId = "52b45375-ce27-4859-8839-d991d3634330" //! this should be changed
        
        const createdMembership = await requestMembershipService(storeId, userId)
        console.log("created membership: ", createdMembership);
    })

    it ("should get all membership request", {tags: ["get", "all", "memberships"]}, async () => {
        const memberships = await getAllStoreMembersService(storeId)
        console.log("all memberships: ", memberships)
    })
})