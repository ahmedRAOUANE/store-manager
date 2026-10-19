import { toAdminUserRow, type AdminUserRow } from "@/zod/adminUser.schema";
import { DatabaseError } from "@/errors/db.error";
import { ValidationError } from "@/errors/validation.error";
import { models } from "@/prisma/db";

import {
    CreateUserInput,
    CreateUserSchema,
    GetUserSchema,
    UpdateUserInput,
    UpdateUserLocaleInput,
    UpdateUserLocaleSchema,
    UpdateUserSchema,
} from "@/zod/user.schema";
import { addAdminService } from "./adminDashboard.services";


type KindeUser = {
    id: string;
    email?: string | null;
    given_name?: string | null;
    family_name?: string | null;
    picture?: string | null;
};


export const syncKindeUserService = async (kindeUser: KindeUser) => {
    try {
        const existingUser = await models.User
            .where({ kindeId: kindeUser.id })
            .first();

        if (!existingUser) {
            const newUser = await models.User.create({
                kindeId: kindeUser.id,
                email: kindeUser.email ?? "",
                firstName: kindeUser.given_name ?? null,
                lastName: kindeUser.family_name ?? null,
                imageUrl: kindeUser.picture ?? null,
            });

            await addAdminService();
            return newUser;
        }

        return existingUser;
    } catch (error) {
        console.log(
            "services/user.services.ts > syncKindeUserService > ",
            error
        );

        throw new DatabaseError(
            "unable to sync all users with the db",
            error as Record<string, unknown>
        );
    }
};


// admin only

// replace the existing getAllUsersService with this:
export const getAllUsersService = async (): Promise<
    AdminUserRow[] | ValidationError
> => {
    try {
        const dbUsers = await models.User.all();

        /*
         * Per-row validation.
         *
         * Unlike most services in the codebase, this does not use
         * `GetUserSchema.array().safeParse(...)` because a single bad
         * row would reject the whole array. The admin users page must
         * render every user (valid or not) — silently hiding invalid
         * rows would defeat the purpose of the admin view.
         *
         * `toAdminUserRow` sets `isValid` and `issues` per row. The
         * page renders invalid rows with a warning badge and lets the
         * admin decide what to do (e.g. delete, backfill, or wait for
         * the upcoming DB cleanup).
         *
         * No `ValidationError` is returned today — the per-row mapper
         * cannot fail the batch. The `| ValidationError` return type
         * is preserved for consistency with the other services and to
         * leave room for a future "reject on empty result" rule.
         */
        return dbUsers.map(toAdminUserRow);
    } catch (error) {
        console.log(
            "services/user.services.ts > getAllUsersService > ",
            error,
        );

        throw new DatabaseError(
            "unable to get all users from the db",
            error as Record<string, unknown>,
        );
    }
};


export const getUserService = async (userId: string) => {
    try {
        const dbUser = await models.User
            .where({ id: userId })
            .first();

        const parsedUser = GetUserSchema.safeParse(dbUser);

        if (!parsedUser.success) {
            console.log(
                "services/user.services.ts > getUserService > ",
                parsedUser.error
            );

            return new ValidationError(
                "invalid user recieved from the db"
            );
        }

        return parsedUser.data;
    } catch (error) {
        console.log(
            "services/user.services.ts > getUserService > ",
            error
        );

        throw new DatabaseError("unable to get user from the db", error as Record<string, unknown>);
    }
};

export const updateUserLocaleService = async (
    userId: string,
    userData: UpdateUserLocaleInput,
) => {
    try {
        const parsedLocale = UpdateUserLocaleSchema.safeParse(userData);

        if (!parsedLocale.success) {
            console.log(
                "services/user.services.ts > updateUserLocaleService > ",
                parsedLocale.error,
            );

            return new ValidationError(
                "invalid locale",
            );
        }

        return await models.User
            .where({ id: userId })
            .update({
                locale: parsedLocale.data.locale,
            });
    } catch (error) {
        console.log(
            "services/user.services.ts > updateUserLocaleService > ",
            error,
        );

        throw new DatabaseError(
            "unable to update user locale in the db",
            error as Record<string, unknown>,
        );
    }
};


export const createAppUserService = async (
    userData: CreateUserInput
) => {
    try {
        const parsedUser = CreateUserSchema.safeParse(userData);

        if (!parsedUser.success) {
            console.log(
                "services/user.services.ts > createAppUserService > ",
                parsedUser.error
            );

            return new ValidationError(
                "invalid user recieved from the db"
            );
        }

        return await models.User.create(parsedUser.data);

    } catch (error) {
        console.log(
            "services/user.services.ts > createAppUserService > ",
            error
        );

        throw new DatabaseError("unable to push user to the db", error as Record<string, unknown>);
    }
};


export const updateAppUserService = async (
    userData: UpdateUserInput
) => {
    try {
        const parsedUser = UpdateUserSchema.safeParse(userData);

        if (!parsedUser.success) {
            console.log(
                "services/user.services.ts > updateAppUserService > ",
                parsedUser.error
            );

            return new ValidationError(
                "invalid user recieved from the db"
            );
        }

        return await models.User
            .where({
                id: parsedUser.data.id,
                kindeId: parsedUser.data.kindeId,
            })
            .update(parsedUser.data);

    } catch (error) {
        console.log(
            "services/user.services.ts > updateAppUserService > ",
            error
        );

        throw new DatabaseError("unable to update user in the db", error as Record<string, unknown>);
    }
};