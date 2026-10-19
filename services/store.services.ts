import { AppError } from "@/errors/base.error";
import { DatabaseError } from "@/errors/db.error";
import { ValidationError } from "@/errors/validation.error";
import { db, models } from "@/prisma/db";
import { isUuid } from "@/utils/uuid";
import { CreateMembershipInput } from "@/zod/membership.schema";
import { CreateStoreInput, CreateStoreSchema, GetStoreSchema, UpdateStoreInput, UpdateStoreSchema } from "@/zod/store.schema";
import { publishNotificationInTransaction } from "@/notifications/publish";
import { storeActivated, storeSuspended } from "@/notifications/definitions/store";

// for admin only
export const getAllStoresService = async () => {
    try {
        const dbStores = await models.Store.all();

        const parsedStores = GetStoreSchema.array().safeParse(dbStores);
        if (!parsedStores.success) {
            console.log("services/store.services.ts > getStore > ", parsedStores.error);
            return new ValidationError("recieved invalid data from the db");
        }

        return parsedStores.data;
    } catch (error) {
        console.log("services/store.services.ts > getAllStores > ", error)
        throw new DatabaseError("unable to get store form the db", error as Record<string, unknown>);
    }
}

export const getDiscoveryStoresService = async (userId: string) => {
    if (!isUuid(userId)) {
        return new ValidationError("invalid uer id provided")
    };

    try {
        const dbStores = await models.Store
            .where({
                status: "ACTIVE",
            })
            .include('memberships', (m) => m.where({ userId }).select('status', 'role'))
            .all();

        const parsedStores = GetStoreSchema.array().safeParse(dbStores);
        if (!parsedStores.success) {
            console.log("services/store.services.ts > getDiscoveryStoresService > ", parsedStores.error);
            return new ValidationError("recieved invalid data from the db");
        }

        return parsedStores.data;
    } catch (error) {
        console.log("services/store.services.ts > getDiscoveryStoresService > ", error)
        throw new DatabaseError("unable to get store form the db", error as Record<string, unknown>);
    }
}

export const getStoreService = async (storeId: string) => {
    if (!isUuid(storeId)) {
        console.log("services/store.services.ts > getStore > store id", storeId);
        return new ValidationError("invalid user id or store id provided");
    }

    try {
        const dbStore = await models.Store.where({
            id: storeId,
        }).first();

        if (!dbStore) {
            console.log("services/store.services.ts > getStore > can not find store", dbStore);
            return new AppError("no store found");
        }

        const parsedStore = GetStoreSchema.safeParse(dbStore);
        if (!parsedStore.success) {
            console.log("services/store.services.ts > getStore > ", parsedStore.error);
            return new ValidationError("recieved invalid data from the db");
        }

        return parsedStore.data;
    } catch (error) {
        console.log("services/store.services.ts > getStore > ", error)
        throw new DatabaseError("unable to get store form the db", error as Record<string, unknown>);
    }
}

export const createStoreService = async (userId: string, storeData: CreateStoreInput) => {
    const parsedStore = CreateStoreSchema.safeParse(storeData);
    if (!parsedStore.success) {
        console.log("services/store.services.ts > createStoreService > ", parsedStore.error)
        return new ValidationError("recieved invalid store data");
    }

    if (!isUuid(userId)) {
        return new ValidationError(
            "invalid user id provided"
        );
    }

    const membership: CreateMembershipInput = {
        userId,
        role: "OWNER" as const,
        status: "PENDING" as const,
    }

    try {
        const result = await db.transaction(async (tx) => {
            return await tx.orm.public.Store.create({
                ...parsedStore.data,
                status: "PENDING",
                memberships: (memberships) => memberships.create(membership)
            })
        })

        return result;
    } catch (error) {
        console.log("services/store.services.ts > createStoreService > ", error)
        throw new DatabaseError("unable to push store to the db", error as Record<string, unknown>);
    }
}

// this is only for admin to use
export const activateStoreService = async (storeId: string) => {
    if (!isUuid(storeId)) {
        return new ValidationError("invalid store id provided");
    }

    try {
        return await db.transaction(async (tx) => {
            const store = await tx.orm.public.Store
                .where({ id: storeId })
                .first();

            if (!store) {
                return new AppError("store not found");
            }

            if (store.status === "ACTIVE") {
                return new AppError("store is already active");
            }

            /*
             * Conditional update — the WHERE clause includes the status
             * we observed at read time. Under concurrency:
             *
             *   T1: reads PENDING → updates PENDING→ACTIVE (holds row lock)
             *   T2: reads PENDING → attempts PENDING→ACTIVE, blocks on lock
             *   T1: commits
             *   T2: re-evaluates WHERE against the new state (ACTIVE).
             *       No match. 0 rows affected. Bails out without
             *       publishing a duplicate notification.
             *
             * `.update()` returns `null` on 0 rows affected (verified
             * against `markMyNotificationReadService`'s `updated !== null`
             * pattern elsewhere in the codebase).
             */
            const activatedStore = await tx.orm.public.Store
                .where({ id: storeId, status: store.status })
                .update({
                    status: "ACTIVE",
                });

            if (!activatedStore) {
                // Lost the race — a concurrent activation won.
                // No notification should be published.
                return new AppError("store is already active");
            }

            await tx.orm.public.StoreMembership
                .where({
                    storeId,
                    role: "OWNER",
                    status: "PENDING",
                })
                .update({
                    status: "ACTIVE",
                });

            await publishNotificationInTransaction(
                tx,
                storeActivated,
                { storeName: store.name },
                { storeId },
            );

            return activatedStore;
        });
    } catch (error) {
        console.log(
            "services/store.services.ts > activateStoreService > ",
            error,
        );

        throw new DatabaseError(
            "unable to activate store",
            error as Record<string, unknown>,
        );
    }
};

// this is for the every allwed user (owner, manager, admin)
export const updateStoreService = async (storeId: string, storeData: UpdateStoreInput) => {
    if (!isUuid(storeId)) {
        return new ValidationError("invalid store id provided");
    }

    try {
        const parsedStore = UpdateStoreSchema.safeParse(storeData);
        if (!parsedStore.success) {
            console.log("services/store.services.ts > updateStoreService > ", parsedStore.error)
            return new ValidationError("recieved invalid data");
        }

        // allow only one store
        const existingStore = await getStoreService(storeId);
        if (!existingStore) {
            console.log("services/store.services.ts > updateStoreService > the store does not exists")
            return new AppError("the store is not available");
        }

        return await models.Store.where({ id: storeId }).update(parsedStore.data);
    } catch (error) {
        console.log("services/store.services.ts > updateStoreService > ", error)
        throw new DatabaseError("unable to push store to the db", error as Record<string, unknown>);
    }
}

// this is for the every allwed user (owner, admin)
export const suspendStoreService = async (storeId: string) => {
    if (!isUuid(storeId)) {
        return new ValidationError("invalid store id provided");
    }

    try {
        return await db.transaction(async (tx) => {
            const store = await tx.orm.public.Store
                .where({ id: storeId })
                .first();

            if (!store) {
                return new AppError("the store is not available");
            }

            if (store.status === "SUSPENDED") {
                return new AppError("the store is already suspended");
            }

            if (store.status === "PENDING") {
                return new AppError("this store is pending for activation, can not be suspended");
            }

            /*
             * Conditional update — same pattern as activation.
             * Only flip status if it still matches the observed value.
             * Prevents duplicate suspension notifications when two
             * requests race.
             */
            const suspendedStore = await tx.orm.public.Store
                .where({ id: storeId, status: store.status })
                .update({
                    status: "SUSPENDED",
                });

            if (!suspendedStore) {
                // Lost the race — a concurrent suspension won.
                return new AppError("the store is already suspended");
            }

            await publishNotificationInTransaction(
                tx,
                storeSuspended,
                { storeName: store.name },
                { storeId },
            );

            return suspendedStore;
        });
    } catch (error) {
        console.log(
            "services/store.services.ts > suspendStoreService > ",
            error,
        );

        throw new DatabaseError(
            "unable to push store to the db",
            error as Record<string, unknown>,
        );
    }
};