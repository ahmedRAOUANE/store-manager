import { describe, it, expect } from "vitest";
import {
    getAllUsersService,
    updateUserLocaleService,
} from "../../services/user.services";
import { AppError } from "../../errors/base.error";

describe("user service tests", () => {
    it(
        "getAllUsersService returns rows with isValid flags and issues arrays",
        { tags: ["get", "all", "users"] },
        async () => {
            const users = await getAllUsersService();

            expect(users).not.toBeInstanceOf(AppError);
            if (users instanceof AppError) return;

            expect(Array.isArray(users)).toBe(true);
            expect(users.length).toBeGreaterThan(0);

            for (const user of users) {
                expect(typeof user.isValid).toBe("boolean");
                expect(Array.isArray(user.issues)).toBe(true);

                if (user.isValid) {
                    expect(user.issues).toHaveLength(0);
                } else {
                    expect(user.issues.length).toBeGreaterThan(0);
                }
            }
        },
    );

    it(
        "every row marked valid has a usable email",
        { tags: ["get", "all", "users"] },
        async () => {
            const users = await getAllUsersService();
            if (users instanceof AppError) throw users;

            for (const user of users.filter((u: {isValid: boolean}) => u.isValid)) {
                expect(typeof user.email).toBe("string");
                expect(user.email).not.toBeNull();
                expect((user.email as string).trim().length).toBeGreaterThan(
                    0,
                );
            }
        },
    );

    it(
        "every row marked invalid has no usable email",
        { tags: ["get", "all", "users"] },
        async () => {
            const users = await getAllUsersService();
            if (users instanceof AppError) throw users;

            for (const user of users.filter((u: { isValid: boolean }) => !u.isValid)) {
                const usable =
                    typeof user.email === "string" &&
                    user.email.trim().length > 0;
                expect(usable).toBe(false);
            }
        },
    );

    it(
        "should change the locale of an existing user",
        { tags: ["update", "locale"] },
        async () => {
            const userId = "cc0a75fe-5817-46b6-a157-377ad5aa7891";
            const lang = await updateUserLocaleService(userId, {
                locale: "ar",
            });

            expect(lang).not.toBeInstanceOf(AppError);
        },
    );
});