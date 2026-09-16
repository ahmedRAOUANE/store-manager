import { AuthenticationError, AuthorizationError } from "@/errors/auth.error";
import { AppError } from "@/errors/base.error";
import { getActiveMembershipService } from "@/services/storeMembership.services";
import { syncKindeUserService } from "@/services/user.services";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { StoreRole } from "@/zod/membership.schema"
import { cache } from "react";
import { getStoreService } from "@/services/store.services";
import { DefaultModelRow } from "@prisma/orm-postgres/orm-client";
import { Contract } from "@/prisma/contract";
import { GetStore } from "@/zod/store.schema";

type AuthenticatedUser = Exclude<Awaited<ReturnType<typeof getCurrentUser>>, AppError>;

type AuthenticatedHandler<TArgs extends unknown[], TResult> = (
    user: AuthenticatedUser,
    ...args: TArgs
) => TResult | Promise<TResult>;

type StoreMembership = Awaited<
    ReturnType<typeof getActiveMembershipService>
>;

type GlobalRole = AuthenticatedUser["globalRole"];

// current authenticated user
// this function returns instead of throwing because it interacts with the UI directly
// so we do not want to throw an error in the face of the user
export const getCurrentUser = cache(
    async () => {
        try {
            const {
                isAuthenticated,
                getUser: getKindeUser,
            } = getKindeServerSession();

            // isAuthenticated throws a NEXT_REDIRECT when the user is not authenticated
            let isAuthed = false;

            try {
                isAuthed = await isAuthenticated() ?? false;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (error: any) {
                console.log("utils/auth.ts > getCurrentUser > ", error)

                if (error?.digest?.startsWith("NEXT_REDIRECT")) {
                    isAuthed = false;
                } else {
                    return new AppError("auth check failed");
                }
            }

            if (!isAuthed) {
                return new AuthenticationError();
            }

            const kindeUser = await getKindeUser();

            if (!kindeUser?.id) {
                return new AuthenticationError();
            }

            return await syncKindeUserService({
                id: kindeUser.id,
                email: kindeUser.email,
                given_name: kindeUser.given_name,
                family_name: kindeUser.family_name,
                picture: kindeUser.picture,
            });

        } catch (error) {
            console.log(
                "utils/auth.ts > getCurrentUser > ",
                error
            );

            if (error instanceof AuthenticationError) {
                return error;
            }

            return new AuthenticationError();
        }
    }
);

// this function intract directly with the user interface, 
// so we do not want it to throw an error directly in the user's face
export const getCurrentStoreContext: (storeId: string) => Promise<{
    user: DefaultModelRow<Contract, "User", "public">,
    store: GetStore,
    membership: DefaultModelRow<Contract, "StoreMembership", "public">
} | AppError> = cache(
    async (storeId: string) => {
        try {
            const user = await getCurrentUser();
            if (user instanceof AppError) {
                return user;
            }

            const membership =
                await getActiveMembershipService(
                    user.id,
                    storeId
                );

            if (membership instanceof AppError) {
                return membership;
            }

            if (!membership) {
                return new AuthorizationError();
            }

            const store = await getStoreService(storeId);

            if (store instanceof AppError) {
                return store;
            }

            return {
                user,
                store,
                membership,
            };
        } catch (error) {
            console.log("utils/auth.ts > getCurrentStoreContext > ", error)
            return new AppError("context error")
        }
    }
);

export const withAuth = <
    TArgs extends unknown[],
    TResult
>(
    handler: AuthenticatedHandler<TArgs, TResult>
) => {
    return async (...args: TArgs): Promise<TResult> => {
        const user = await getCurrentUser();
        if (user instanceof AppError) throw user;

        return await handler(user, ...args);
    };
};

export const withStoreAccess = <
    TArgs extends [string, ...unknown[]],
    TResult
>(
    handler: (
        user: AuthenticatedUser,
        membership: StoreMembership,
        ...args: TArgs
    ) => TResult | Promise<TResult>
) => {
    return withAuth(async (user, ...args: TArgs) => {
        if (user instanceof AppError) throw user;

        const [storeId] = args;

        const membership = await getActiveMembershipService(
            user.id,
            storeId
        );

        if (membership instanceof AppError) {
            throw membership;
        }

        if (!membership) {
            throw new AuthorizationError();
        }

        return await handler(user, membership, ...args);
    });
};

export const withStoreRole = <
    TRoles extends readonly (typeof StoreRole)[keyof typeof StoreRole][],
    TArgs extends [string, ...unknown[]],
    TResult
>(
    allowedRoles: TRoles,
    handler: (
        user: AuthenticatedUser,
        membership: StoreMembership,
        ...args: TArgs
    ) => TResult | Promise<TResult>
) => {
    return withStoreAccess(
        async (user, membership, ...args: TArgs) => {
            const hasRole =
                membership &&
                typeof membership === "object" &&
                "role" in membership;

            if (!hasRole || !allowedRoles.includes(membership.role as TRoles[number])) {
                throw new AuthorizationError();
            }

            return await handler(
                user,
                membership,
                ...args
            );
        }
    );
};


export const withGlobalRole = <
    TRoles extends readonly GlobalRole[],
    TArgs extends unknown[],
    TResult
>(
    allowedRoles: TRoles,
    handler: (
        user: AuthenticatedUser,
        ...args: TArgs
    ) => TResult | Promise<TResult>
) => {
    return withAuth(async (user, ...args: TArgs) => {
        if (user instanceof AppError) throw user;

        if (!allowedRoles.includes(user.globalRole)) {
            throw new AuthorizationError();
        }

        return await handler(user, ...args);
    });
};
