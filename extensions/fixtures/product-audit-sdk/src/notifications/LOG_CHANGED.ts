import { defineNotification } from "@store-manager/extensions";
import { z } from "zod";

/**
 * Fires when a product's `sellingPrice` changes.
 *
 * Compare with the hand-crafted fixture's `LOG_CHANGED` notification:
 *
 *   - Same `name` (`"LOG_CHANGED"`) → the compiler derives the same
 *     presentation keys (`ext.product-audit.LOG_CHANGED.title/body`)
 *     from this declaration's `name` and `package.json`'s `name`.
 *   - Same `payloadSchema` (`{ productName, field }`).
 *   - Same `recipients` (store scope, OWNER/MANAGER, excludeActor).
 *
 * The `presentation` field is intentionally absent — the compiler
 * injects it. This is the SDK's main advantage over hand-crafted:
 * no manual key duplication, no drift between code and manifest.
 */
export default defineNotification({
    name: "LOG_CHANGED",
    payloadSchema: z.object({
        productName: z.string(),
        field: z.string(),
    }),
    recipients: {
        scope: "store",
        roles: ["OWNER", "MANAGER"],
        excludeActor: true,
    },
});