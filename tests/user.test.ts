import { getAllUsersService, updateUserLocaleService } from "../services/user.services";
import { describe, it } from "vitest";

describe("usesr tests", () => {
    it("should get all users", {tags: ["get", "all", "users"]}, async () => {
        const users = await getAllUsersService();
        console.log("all users: ", users);
    })

    it ("should change the local", {tags: ["update", "locale"]}, async () => {
        const userId = "cc0a75fe-5817-46b6-a157-377ad5aa7891";
        const lang = await updateUserLocaleService(userId, {locale: "ar"});
        console.log("local: ", lang);
    })
})