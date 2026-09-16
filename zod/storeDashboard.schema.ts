import { z } from "zod";
import { UuidSchema } from "./general.schema";

export const DashboardSalesSchema = z.object({
    todayCount: z.number().nonnegative(),
    todayRevenue: z.number().nonnegative(),

    monthCount: z.number().nonnegative(),
    monthRevenue: z.number().nonnegative(),

    outstanding: z.number().nonnegative(),
});

export const DashboardPurchasesSchema = z.object({
    todayCount: z.number().nonnegative(),
    todayAmount: z.number().nonnegative(),

    monthCount: z.number().nonnegative(),
    monthAmount: z.number().nonnegative(),

    outstanding: z.number().nonnegative(),
});

export const DashboardInventorySchema = z.object({
    productCount: z.number().nonnegative(),
    lowStockCount: z.number().nonnegative(),

    inventoryValue: z.number().nonnegative(),
});

export const DashboardProfitSchema = z.object({
    today: z.number(),
    month: z.number(),
});

export const DashboardRecentSaleSchema = z.object({
    id: UuidSchema,
    invoiceNumber: z.string(),
    totalAmount: z.number().nonnegative(),
    amountDue: z.number().nonnegative(),
    saleDate: z.instanceof(Temporal.Instant),
});

export const DashboardRecentPurchaseSchema = z.object({
    id: UuidSchema,
    invoiceNumber: z.string(),
    totalAmount: z.number().nonnegative(),
    amountDue: z.number().nonnegative(),
    purchaseDate: z.instanceof(Temporal.Instant),
    supplier: z.object({
        id: UuidSchema,
        name: z.string()
    })
});

export const DashboardLowStockProductSchema = z.object({
    id: UuidSchema,
    name: z.string(),
    sku: z.string(),
    stockQuantity: z.number().nonnegative(),
    minimumStock: z.number().nonnegative(),
});

export const StoreDashboardSchema = z.object({
    sales: DashboardSalesSchema,
    purchases: DashboardPurchasesSchema,
    inventory: DashboardInventorySchema,
    profit: DashboardProfitSchema,

    recentSales: DashboardRecentSaleSchema.array(),
    recentPurchases: DashboardRecentPurchaseSchema.array(),

    lowStockProducts: DashboardLowStockProductSchema.array(),
});

export type StoreDashboard = z.infer<typeof StoreDashboardSchema>;

// staff
export const StaffDashboardSalesSchema = z.object({
    todayCount: z.number().nonnegative(),
    todayRevenue: z.number().nonnegative(),
});

export const StaffDashboardInventorySchema = z.object({
    productCount: z.number().nonnegative(),
    lowStockCount: z.number().nonnegative(),
});

export const StaffDashboardRecentSaleSchema = z.object({
    id: UuidSchema,
    invoiceNumber: z.string(),
    totalAmount: z.number().nonnegative(),
    amountDue: z.number().nonnegative(),
    saleDate: z.instanceof(Temporal.Instant),
});

export const StaffDashboardSchema = z.object({
    sales: StaffDashboardSalesSchema,
    inventory: StaffDashboardInventorySchema,
    recentSales: StaffDashboardRecentSaleSchema.array(),
    lowStockProducts: DashboardLowStockProductSchema.array(),
});

export type StaffDashboard = z.infer<
    typeof StaffDashboardSchema
>;