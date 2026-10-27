import { defineCapabilities } from "@store-manager/extensions";

/**
 * Capabilities for the Product Audit Log fixture.
 *
 * Matches the hand-crafted fixture's declared capabilities exactly:
 *
 *   - db.read / db.write: reads and writes to the extension's own
 *     `audit_log` table via `ctx.extensions.db`.
 *   - notifications.publish: publishes the `LOG_CHANGED` notification
 *     when a product's selling price changes.
 *   - logs.write: writes structured logs via `ctx.log.info`.
 *
 * Storage and HTTP are not used, so they're omitted (they default to
 * `false` / `[]` at manifest assembly time).
 */
export default defineCapabilities({
    "db.read": true,
    "db.write": true,
    "notifications.publish": ["LOG_CHANGED"],
    "logs.write": true,
});