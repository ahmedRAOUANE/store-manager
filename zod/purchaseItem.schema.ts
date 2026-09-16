/*
model PurchaseItem {
  id    Uuid @id @default(uuid())

  purchaseId Uuid
  purchase   Purchase @relation(fields: [purchaseId], references: [id], onDelete: Cascade)

  productId Uuid
  product   Product @relation(fields: [productId], references: [id])

  quantity Float

  // Price paid for one unit
  unitCost Float

  discountAmount Float @default(0)
  taxAmount      Float @default(0)

  // Final cost for this line
  totalAmount Float

  // Optional information for products with batches
  batchNumber String?
  expiryDate  DateTime?

  createdAt DateTime @default(now())
  updatedAt temporal.updatedAt()

  @@index([purchaseId])
  @@index([productId])
}
*/

import { z } from "zod";
import { UuidSchema } from "./general.schema";

export const GetPurchaseItemSchema = z.object({
    id: UuidSchema,
    purchaseId: UuidSchema,
    productId: UuidSchema,

    quantity: z.number(),
    unitCost: z.number(),
    discountAmount: z.number().default(0),
    taxAmount: z.number().default(0),
    totalAmount: z.number(),

    batchNumber: z.string().optional().nullable(),
    expiryDate: z.instanceof(Temporal.Instant).optional().nullable(),
    lineSubtotal: z.number().nonnegative().optional().default(0),
    
    createdAt: z.instanceof(Temporal.Instant),
    updatedAt: z.instanceof(Temporal.Instant),
})

export type GetPurchaseItem = z.infer<typeof GetPurchaseItemSchema>;

export const CreatePurchaseItemSchema = GetPurchaseItemSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    purchaseId: true,
})

export type CreatePurchaseItemInput = z.infer<typeof CreatePurchaseItemSchema>;

export const CreatePurchaseItemSchemaWithRequiredPurchaseId = CreatePurchaseItemSchema.extend({
    purchaseId: UuidSchema
})

export type CreatePurchaseItemInputWithRequiredPurchaseId = z.infer<typeof CreatePurchaseItemSchemaWithRequiredPurchaseId>;

export const UpdatePurchaseItemSchema = GetPurchaseItemSchema.omit({
    productId: true,
    createdAt: true,
    updatedAt: true,
})

export type UpdatePurchaseItemInput = z.infer<typeof UpdatePurchaseItemSchema>;
