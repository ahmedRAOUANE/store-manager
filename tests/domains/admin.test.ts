import { describe, it, expect } from "vitest";
import { addAdminService } from "../services/adminDashboard.services";
import { models } from "../prisma/db";

describe("admin service tests", () => {
    it(
        "addAdminService is a no-op when multiple users exist",
        { tags: ["create", "admin"] },
        async () => {
            const userCount = await models.User
                .aggregate((a) => ({ count: a.count() }));

            // Precondition: this test assumes a populated DB with more
            // than one user. If this fails, either the DB was wiped
            // or the assertion below no longer matches reality — both
            // are signals to revisit the test, not the service.
            expect(userCount.count).toBeGreaterThan(1);

            const result = await addAdminService();

            // `addAdminService` is documented to be a no-op (returns
            // `undefined`) when more than one user exists.
            expect(result).toBeUndefined();
        },
    );
});