
import { describe, it } from "vitest";
import { models } from "../prisma/db";
import "temporal-polyfill/full/global";

describe("notifications cruds tests", () => {
    it("gets all notifications", {tags: ["get", "all", "notification"]}, async () => {
        const nots = await models.Notification.all();
        console.log("all notifications: ", nots);
    })
});
