import type { z } from "zod";
import type { TransactionClient } from "@/prisma/db";
import { isUuid } from "@/utils/uuid";
import type {
    NotificationDefinition,
    NotificationPublishContext,
} from "./definition";

/**
 * Publish one notification event to its resolved recipients.
 *
 * Must be called inside the same transaction as the business mutation
 * that caused the event. There is intentionally no non-transactional
 * variant: a notification that commits independently of its cause can
 * describe a state the database never reached.
 *
 * The caller supplies a *definition* — never a raw type string — so the
 * payload schema, recipient rule, and presentation keys are all
 * guaranteed to travel together. Payload and recipient IDs are validated
 * here; a validation failure throws and rolls the surrounding
 * transaction back.
 *
 * `ctx` must be constructed from trusted server-side values. It is
 * never sourced from a request body.
 */
export const publishNotificationInTransaction = async <
    TDef extends NotificationDefinition,
>(
    tx: TransactionClient,
    definition: TDef,
    payloadInput: z.input<TDef["payloadSchema"]>,
    ctx: NotificationPublishContext,
): Promise<void> => {
    if (ctx.storeId !== null && !isUuid(ctx.storeId)) {
        throw new Error("Invalid notification store id");
    }

    if (
        ctx.affectedUserId !== undefined &&
        !isUuid(ctx.affectedUserId)
    ) {
        throw new Error("Invalid notification affected user id");
    }

    // Parse, don't just validate: strips unknown keys for non-strict
    // schemas, applies transforms, and gives us a value that matches
    // `z.infer<TPayloadSchema>` exactly before it touches the database.
    const payload = definition.payloadSchema.parse(payloadInput);

    const recipients = await definition.resolveRecipients(
        tx,
        ctx,
        payload,
    );

    const uniqueRecipientIds = [...new Set(recipients)];

    for (const recipientId of uniqueRecipientIds) {
        if (!isUuid(recipientId)) {
            throw new Error("Invalid notification recipient id");
        }

        await tx.orm.public.Notification.create({
            recipientId,
            storeId: ctx.storeId,
            type: definition.type,
            payload,
        });
    }
};