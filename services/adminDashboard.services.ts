import { AppError } from "@/errors/base.error";
import { DatabaseError } from "@/errors/db.error";
import { ValidationError } from "@/errors/validation.error";
import { db, models } from "@/prisma/db";
import { AdminDashboardSchema } from "@/zod/adminDashboard.schema";

// users
export const getTotalUsers = async () => {
    try {
        const result = await models.User.aggregate((aggregate) => ({
            count: aggregate.count(),
        }));

        return {
            total: result.count,
        };
    } catch (error) {
        console.log(
            "services/adminDashboard.services.ts > getTotalUsers",
            error
        );

        throw new DatabaseError(
            "unable to get total users",
            error as Record<string, unknown>
        );
    }
};

// stores
export const getTotalStores = async () => {
    try {
        const result = await models.Store.aggregate((aggregate) => ({
            count: aggregate.count(),
        }));

        return {
            total: result.count,
        };
    } catch (error) {
        console.log(
            "services/adminDashboard.services.ts > getTotalStores",
            error
        );

        throw new DatabaseError(
            "unable to get total stores",
            error as Record<string, unknown>
        );
    }
};

export const getPendingStores = async () => {
    try {
        const result = await models.Store
            .where({
                status: "PENDING",
            })
            .aggregate((aggregate) => ({
                count: aggregate.count(),
            }));

        return {
            pending: result.count,
        };
    } catch (error) {
        console.log(
            "services/adminDashboard.services.ts > getPendingStores",
            error
        );

        throw new DatabaseError(
            "unable to get pending stores",
            error as Record<string, unknown>
        );
    }
};

export const getActiveStores = async () => {
    try {
        const result = await models.Store
            .where({
                status: "ACTIVE",
            })
            .aggregate((aggregate) => ({
                count: aggregate.count(),
            }));

        return {
            active: result.count,
        };
    } catch (error) {
        console.log(
            "services/adminDashboard.services.ts > getActiveStores",
            error
        );

        throw new DatabaseError(
            "unable to get active stores",
            error as Record<string, unknown>
        );
    }
};

export const getSuspendedStores = async () => {
    try {
        const result = await models.Store
            .where({
                status: "SUSPENDED",
            })
            .aggregate((aggregate) => ({
                count: aggregate.count(),
            }));

        return {
            suspended: result.count,
        };
    } catch (error) {
        console.log(
            "services/adminDashboard.services.ts > getSuspendedStores",
            error
        );

        throw new DatabaseError(
            "unable to get suspended stores",
            error as Record<string, unknown>
        );
    }
};

// recent store requests
export const getRecentStoreRequests = async () => {
    try {
        const stores = await models.Store
            .where({
                status: "PENDING",
            })
            .orderBy((store) => store.createdAt.desc())
            .limit(5)
            .all();

        return stores.map((store) => ({
            id: store.id,
            name: store.name,
            createdAt: store.createdAt,
        }));
    } catch (error) {
        console.log(
            "services/adminDashboard.services.ts > getRecentStoreRequests",
            error
        );

        throw new DatabaseError(
            "unable to get recent store requests",
            error as Record<string, unknown>
        );
    }
};

// main dashboard
export const getAdminDashboardService = async () => {
    try {
        const [
            users,
            totalStores,
            pendingStores,
            activeStores,
            suspendedStores,
            recentStoreRequests,
        ] = await Promise.all([
            getTotalUsers(),
            getTotalStores(),
            getPendingStores(),
            getActiveStores(),
            getSuspendedStores(),
            getRecentStoreRequests(),
        ]);

        const dashboard = {
            users,

            stores: {
                ...totalStores,
                ...pendingStores,
                ...activeStores,
                ...suspendedStores,
            },

            recentStoreRequests,
        };

        const parsedDashboard =
            AdminDashboardSchema.safeParse(dashboard);

        if (!parsedDashboard.success) {
            console.log(
                "services/adminDashboard.services.ts > getAdminDashboardService > ",
                parsedDashboard.error
            );

            return new ValidationError(
                "unable to build valid admin dashboard"
            );
        }

        return parsedDashboard.data;
    } catch (error) {
        console.log(
            "services/adminDashboard.services.ts > getAdminDashboardService > ",
            error
        );

        if (error instanceof AppError) {
            return error;
        }

        throw new DatabaseError(
            "unable to get admin dashboard",
            error as Record<string, unknown>
        );
    }
};

/**
 * there are tow cases where the add admin service should work
 * - 1- add an admin when the app first launched 
 *      - the first logged in user should be promoted to admin
 *          this requiures to check every table in the db must be empty for this to work
 * 
 * - 2- an existing admin promotes a user
 *      - this requires building a new set of roles specific for app management
 * 
 * >> keep the second for next versions
 * 
 * >> the current version have a valnarability: currently it updates the only exesting user 
 *      rather than the first user at first launch
 *      it is not priority for now, but needs more consideration for next versions 
 */
export const addAdminService = async () => {
    try {
        return await db.transaction(async (tx) => {
            const users = await tx.orm.public.User
                .select("id")
                .limit(2)
                .all();

            if (users.length === 0) {
                throw new AppError("there are no users in the db"); // this means when a user logged in the db syncronization didn't happen
            }

            if (users.length > 1) {
                return; // this function should be ignored once the users are more than one user
            }

            return await tx.orm.public.User
                .where({ id: users[0].id })
                .update({
                    globalRole: "ADMIN",
                });
        })
    } catch (error) {
        console.log("services/adminDashboard/addAdminService > ", error);
        throw new AppError("failed to add this new admin")
    }
}