import { DatabaseError } from "@/errors/db.error";
import { AppError } from "@/errors/base.error";
import { models } from "@/prisma/db";
import { monthStart, todayStart, tomorrowStart } from "@/utils/dates";
import { isUuid } from "@/utils/uuid";
import { ValidationError } from "@/errors/validation.error";
import { GetSaleItem } from "@/zod/saleItem.schema";
import { StaffDashboardSchema, StoreDashboardSchema } from "@/zod/storeDashboard.schema";

// sales
export const getTodaysSales = async (storeId: string) => {
    try {
        return await models.Sale
            .where({ storeId })
            .where((sale) =>
                sale.saleDate.gte(todayStart)
            )
            .where((sale) =>
                sale.saleDate.lt(tomorrowStart)
            )
            .aggregate((agg) => ({
                count: agg.count(),
                revenue: agg.sum("totalAmount"),
            }));
    } catch (error) {
        console.log(
            "services/storeDashboard.services.ts > getTodaysSales",
            error
        );

        throw new DatabaseError(
            "unable to get today's sales",
            error as Record<string, unknown>
        );
    }
};

export const getThisMonthsSales = async (storeId: string) => {
    try {
        return await models.Sale
            .where({
                storeId,
            })
            .where((sale) => sale.saleDate.gte(monthStart))
            .where((sale) => sale.saleDate.lt(tomorrowStart))
            .aggregate((agg) => ({
                count: agg.count(),
                revenue: agg.sum("totalAmount"),
            }));
    } catch (error) {
        console.log("services/storeDashboard.services.ts > getTodaysSales", error);
        throw new DatabaseError(
            "unable to get todays sales",
            error as Record<string, unknown>
        );
    }
}

export const getRecentSales = async (storeId: string) => {
    try {
        const sales = await models.Sale
            .where({ storeId })
            .orderBy((u) => u.saleDate.desc())
            .limit(5)
            .all();

        return sales.map((sale) => ({
            id: sale.id,
            invoiceNumber: sale.invoiceNumber,
            totalAmount: sale.totalAmount,
            amountDue: sale.amountDue,
            saleDate: sale.saleDate,
        }));
    } catch (error) {
        console.log(
            "services/storeDashboard.services.ts > getRecentSales",
            error
        );

        throw new DatabaseError(
            "unable to get recent sales",
            error as Record<string, unknown>
        );
    }
};

export const getOutstandingSales = async (
    storeId: string
) => {
    try {
        const result = await models.Sale
            .where({ storeId })
            .aggregate((aggregate) => ({
                outstanding: aggregate.sum("amountDue"),
            }));

        return {
            outstanding: result.outstanding ?? 0,
        };
    } catch (error) {
        console.log(
            "services/storeDashboard.services.ts > getOutstandingSales",
            error
        );

        throw new DatabaseError(
            "unable to get outstanding sales",
            error as Record<string, unknown>
        );
    }
};

// purchases
export const getTodaysPurchases = async (storeId: string) => {
    try {
        const result = await models.Purchase
            .where({ storeId })
            .where((purchase) =>
                purchase.purchaseDate.gte(todayStart)
            )
            .where((purchase) =>
                purchase.purchaseDate.lt(tomorrowStart)
            )
            .aggregate((aggregate) => ({
                count: aggregate.count(),
                amount: aggregate.sum("totalAmount"),
            }));

        return {
            todayCount: result.count,
            todayAmount: result.amount ?? 0,
        };
    } catch (error) {
        console.log(
            "services/storeDashboard.services.ts > getTodaysPurchases",
            error
        );

        throw new DatabaseError(
            "unable to get today's purchases",
            error as Record<string, unknown>
        );
    }
};

export const getThisMonthsPurchases = async (storeId: string) => {
    try {
        const result = await models.Purchase
            .where({ storeId })
            .where((purchase) =>
                purchase.purchaseDate.gte(monthStart)
            )
            .where((purchase) =>
                purchase.purchaseDate.lt(tomorrowStart)
            )
            .aggregate((aggregate) => ({
                count: aggregate.count(),
                amount: aggregate.sum("totalAmount"),
            }));

        return {
            monthCount: result.count,
            monthAmount: result.amount ?? 0,
        };
    } catch (error) {
        console.log(
            "services/storeDashboard.services.ts > getThisMonthsPurchases",
            error
        );

        throw new DatabaseError(
            "unable to get this month's purchases",
            error as Record<string, unknown>
        );
    }
};

export const getOutstandingPurchases = async (
    storeId: string
) => {
    try {
        const result = await models.Purchase
            .where({ storeId })
            .aggregate((aggregate) => ({
                outstanding: aggregate.sum("amountDue"),
            }));

        return {
            outstanding: result.outstanding ?? 0,
        };
    } catch (error) {
        console.log(
            "services/storeDashboard.services.ts > getOutstandingPurchases",
            error
        );

        throw new DatabaseError(
            "unable to get outstanding purchases",
            error as Record<string, unknown>
        );
    }
};

export const getRecentPurchases = async (storeId: string) => {
    try {
        const purchases = await models.Purchase
            .where({ storeId })
            .orderBy((u) => u.purchaseDate.desc())
            .limit(5)
            .include('supplier', (s) => {
                return s.select('name', 'id')
            })
            .all();

        return purchases.map((purchase) => ({
            id: purchase.id,
            invoiceNumber: purchase.invoiceNumber,
            totalAmount: purchase.totalAmount,
            amountDue: purchase.amountDue,
            purchaseDate: purchase.purchaseDate,
            supplier: purchase.supplier
        }));
    } catch (error) {
        console.log(
            "services/storeDashboard.services.ts > getRecentPurchases",
            error
        );

        throw new DatabaseError(
            "unable to get recent purchases",
            error as Record<string, unknown>
        );
    }
};

// products
export const getProductCount = async (storeId: string) => {
    try {
        const result = await models.Product
            .where({
                storeId,
                isActive: true,
            })
            .aggregate((aggregate) => ({
                count: aggregate.count(),
            }));

        return {
            productCount: result.count,
        };
    } catch (error) {
        console.log(
            "services/storeDashboard.services.ts > getProductCount",
            error
        );

        throw new DatabaseError(
            "unable to get product count",
            error as Record<string, unknown>
        );
    }
};

export const getInventoryDashboard = async (
    storeId: string
) => {
    try {
        const products = await models.Product
            .where({
                storeId,
                isActive: true,
            })
            .all();

        const lowStockProducts = products
            .filter(
                (product) =>
                    product.stockQuantity <= product.minimumStock
            )
            .map((product) => ({
                id: product.id,
                name: product.name,
                sku: product.sku,
                stockQuantity: product.stockQuantity,
                minimumStock: product.minimumStock,
            }));

        const inventoryValue = products.reduce(
            (total, product) =>
                total +
                product.stockQuantity *
                product.averageCost,
            0
        );

        return {
            productCount: products.length,
            lowStockCount: lowStockProducts.length,
            inventoryValue,
            lowStockProducts,
        };
    } catch (error) {
        console.log(
            "services/storeDashboard.services.ts > getInventoryDashboard",
            error
        );

        throw new DatabaseError(
            "unable to get inventory dashboard",
            error as Record<string, unknown>
        );
    }
};

// profit
export const getProfitDashboard = async (
    storeId: string
) => {
    try {
        const sales = await models.Sale
            .where({ storeId })
            .where((sale) =>
                sale.saleDate.gte(monthStart)
            )
            .where((sale) =>
                sale.saleDate.lt(tomorrowStart)
            )
            .include("items")
            .all();

        const todayItems = sales
            .filter(
                (sale) =>
                    sale.saleDate.epochMilliseconds >= todayStart.epochMilliseconds &&
                    sale.saleDate.epochMilliseconds < tomorrowStart.epochMilliseconds
            )
            .flatMap((sale) => sale.items) as GetSaleItem[];

        const monthItems = sales.flatMap(
            (sale) => sale.items
        ) as GetSaleItem[];

        const today = todayItems.reduce(
            (total, item) =>
                total + item.totalAmount - item.totalCost,
            0
        );

        const month = monthItems.reduce(
            (total, item) =>
                total + item.totalAmount - item.totalCost,
            0
        );

        return {
            today,
            month,
        };
    } catch (error) {
        console.log(
            "services/storeDashboard.services.ts > getProfitDashboard",
            error
        );

        throw new DatabaseError(
            "unable to get profit dashboard",
            error as Record<string, unknown>
        );
    }
};

// management dashboard
export const getManagementDashboardService = async (
    storeId: string
) => {
    if (!isUuid(storeId)) {
        return new ValidationError(
            "received invalid store id"
        );
    }

    try {
        const [
            todaySales,
            monthSales,
            outstandingSales,
            recentSales,

            todayPurchases,
            monthPurchases,
            outstandingPurchases,
            recentPurchases,

            inventory,
            profit,
        ] = await Promise.all([
            getTodaysSales(storeId),
            getThisMonthsSales(storeId),
            getOutstandingSales(storeId),
            getRecentSales(storeId),

            getTodaysPurchases(storeId),
            getThisMonthsPurchases(storeId),
            getOutstandingPurchases(storeId),
            getRecentPurchases(storeId),

            getInventoryDashboard(storeId),
            getProfitDashboard(storeId),
        ]);

        const dashboard = {
            sales: {
                todayCount: todaySales.count,
                todayRevenue: todaySales.revenue ?? 0,

                monthCount: monthSales.count,
                monthRevenue: monthSales.revenue ?? 0,

                outstanding: outstandingSales.outstanding,
            },

            purchases: {
                todayCount: todayPurchases.todayCount,
                todayAmount: todayPurchases.todayAmount,

                monthCount: monthPurchases.monthCount,
                monthAmount: monthPurchases.monthAmount,

                outstanding: outstandingPurchases.outstanding,
            },

            inventory: {
                productCount: inventory.productCount,
                lowStockCount: inventory.lowStockCount,
                inventoryValue: inventory.inventoryValue,
            },

            profit,

            recentSales,
            recentPurchases,

            lowStockProducts: inventory.lowStockProducts,
        };

        const parsedDashboard =
            StoreDashboardSchema.safeParse(dashboard);

        if (!parsedDashboard.success) {
            console.log(
                "services/storeDashboard.services.ts > getStoreDashboardService > ",
                parsedDashboard.error
            );

            return new ValidationError(
                "unable to build valid store dashboard"
            );
        }

        return parsedDashboard.data;
    } catch (error) {
        console.log(
            "services/storeDashboard.services.ts > getStoreDashboardService > ",
            error
        );

        if (error instanceof AppError) {
            return error;
        }

        throw new DatabaseError(
            "unable to get store dashboard",
            error as Record<string, unknown>
        );
    }
};

// staff
export const getStaffDashboardService = async (
    storeId: string
) => {
    if (!isUuid(storeId)) {
        return new ValidationError(
            "received invalid store id"
        );
    }

    try {
        const [
            todaySales,
            recentSales,
            inventory,
        ] = await Promise.all([
            getTodaysSales(storeId),
            getRecentSales(storeId),
            getInventoryDashboard(storeId),
        ]);

        const dashboard = {
            sales: {
                todayCount: todaySales.count,
                todayRevenue: todaySales.revenue ?? 0,
            },

            inventory: {
                productCount: inventory.productCount,
                lowStockCount: inventory.lowStockCount,
            },

            recentSales,

            lowStockProducts: inventory.lowStockProducts,
        };

        const parsedDashboard =
            StaffDashboardSchema.safeParse(dashboard);

        if (!parsedDashboard.success) {
            console.log(
                "services/storeDashboard.services.ts > getStaffDashboardService > ",
                parsedDashboard.error
            );

            return new ValidationError(
                "unable to build valid staff dashboard"
            );
        }

        return parsedDashboard.data;
    } catch (error) {
        console.log(
            "services/storeDashboard.services.ts > getStaffDashboardService > ",
            error
        );

        if (error instanceof AppError) {
            return error;
        }

        throw new DatabaseError(
            "unable to get staff dashboard",
            error as Record<string, unknown>
        );
    }
};