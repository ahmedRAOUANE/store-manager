import { getAllUsersService } from "@/services/user.services";
import { describe, it } from "vitest";

describe("usesr tests", () => {
    it("should get all users", {tags: ["get", "all", "users"]}, async () => {
        const users = await getAllUsersService();
        console.log("all users: ", users);
    })
})