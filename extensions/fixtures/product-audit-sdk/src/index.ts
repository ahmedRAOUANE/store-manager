import { defineExtension } from "@store-manager/extensions";

import capabilities from "./capabilities";
import onCreateProduct from "./hooks/product.created";
import onUpdateProduct from "./hooks/product.updated";
import LOG_CHANGED from "./notifications/LOG_CHANGED";
import auditLog from "./tables/audit_log";

/**
 * SDK-built reference fixture.
 *
 * Equivalent in runtime behavior to the hand-crafted `product-audit/`
 * fixture in `../product-audit/`. The differences:
 *
 *   - Source is TypeScript using `@store-manager/extensions`
 *   - Bundled by `store-manager-ext build` instead of hand-crafted
 *   - Typed hook handlers instead of untyped async functions
 *   - Notification `presentation` injected by the compiler instead of
 *     hand-written
 *
 * See `README.md` for the rationale on running two fixtures side by
 * side and the known cosmetic `name` field difference.
 */
export default defineExtension({
    capabilities,
    tables: { audit_log: auditLog },
    notifications: { LOG_CHANGED },
    on: {
        "product.created": onCreateProduct,
        "product.updated": onUpdateProduct,
    },
});