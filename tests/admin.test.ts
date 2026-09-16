import { addAdminService } from "@/services/adminDashboard.services";
import { describe, it } from "vitest";

describe("admin tests", () => {
    it("should add new admin", {tags: ["create", "admin"]}, async () => {
        const userId = "52b45375-ce27-4859-8839-d991d3634330"; //! this must be changed 
        const newAdmin = await addAdminService(userId);
        console.log("new added admin: ", newAdmin);
    })
})