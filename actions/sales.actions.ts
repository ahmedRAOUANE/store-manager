"use server";

import { AppError } from "@/errors/base.error";
import { createSaleService, getSaleByIdService, getSalesService, getSalesWithIdService, updateSaleService } from "@/services/sale.services";
import { withStoreRole } from "@/utils/auth";
import { CreateSaleInput, UpdateSaleInput } from "@/zod/sale.schema";

export const getAllSales = withStoreRole(
    ["OWNER", "MANAGER"],
    async (_user, _membership, storeId) => 
        await getSalesService(storeId)
    
);

export const getSalesWithUserId = withStoreRole(
    ["STAFF"],
    async (user, _membership, storeId) => await getSalesWithIdService(storeId, user.id)
) 

export const getSaleById = withStoreRole(
    ["OWNER", "MANAGER", "STAFF"],
    async (_user, _membership, storeId, saleId: string) => 
        await getSaleByIdService(storeId, saleId)
);

export const createSale = withStoreRole(
    ["OWNER", "MANAGER", "STAFF"],
    async (user, _membership, storeId, saleData: CreateSaleInput) => {
        const result = await createSaleService(user.id, storeId, saleData);

        if (result instanceof AppError) {
            return { ok: false as const, message: result.message };
        }

        /**
         * Return a plain, serializable object.
         *
         * The full sale row carries `createdAt`, `saleDate`, and `updatedAt`
         * as `Temporal.Instant`, which the RSC serializer can't send to the
         * client. The client only needs enough to confirm and clear the cart.
         */
        return {
            ok: true,
            sale: {
                id: result.id,
                invoiceNumber: result.invoiceNumber,
                totalAmount: result.totalAmount,
                amountPaid: result.amountPaid,
                amountDue: result.amountDue,
            },
            message: "sale created successfully"
        };
    }
);

export const updateSale = withStoreRole(
    ["OWNER", "MANAGER", "STAFF"],
    async (_user, _membership, storeId, saleId: string, saleData: UpdateSaleInput) => 
        await updateSaleService(
            storeId,
            saleId,
            saleData
        )
    
);