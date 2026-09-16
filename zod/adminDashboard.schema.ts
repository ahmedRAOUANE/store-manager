import { z } from "zod";
import { UuidSchema } from "./general.schema";

export const AdminDashboardStoreSchema = z.object({
    id: UuidSchema,
    name: z.string(),
    createdAt: z.instanceof(Temporal.Instant),
});

export const AdminDashboardSchema = z.object({
    users: z.object({
        total: z.number().nonnegative(),
    }),

    stores: z.object({
        total: z.number().nonnegative(),
        pending: z.number().nonnegative(),
        active: z.number().nonnegative(),
        suspended: z.number().nonnegative(),
    }),

    recentStoreRequests: AdminDashboardStoreSchema.array(),
});

export type AdminDashboard = z.infer<
    typeof AdminDashboardSchema
>;