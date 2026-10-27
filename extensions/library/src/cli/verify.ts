import type { CapabilityDeclaration } from "../types";
import type { AnalysisIssue, UsageReport } from "./ast";

/**
 * The declaration side of a verification pass.
 *
 * Assembled by `build.ts` from three sources:
 *
 *   - `capabilities` — the default export of `src/capabilities.ts`
 *   - `tableNames` — `Object.keys(tables)` where `tables` was loaded
 *     from `src/tables/*.ts`
 *   - `notificationNames` — `Object.keys(notifications)` where
 *     `notifications` was loaded from `src/notifications/*.ts`
 *
 * Only names are needed here. Full definitions (columns, payload
 * schemas) are validated by `ManifestSchema` at a later stage; verify's
 * job is capability/table/notification name matching.
 */
export interface DeclaredSurface {
    capabilities: CapabilityDeclaration;
    tableNames: readonly string[];
    notificationNames: readonly string[];
}

/**
 * Outcome of a verification pass.
 *
 * `errors` and `warnings` are human-readable strings with actionable
 * fix instructions. `analyzerErrors` is the structured version of the
 * analyzer's detection failures — provided separately so callers that
 * want file:line:column access (future LSP integration, IDE plugins)
 * don't have to re-parse strings.
 */
export interface VerificationResult {
    /**
     * Errors that must prevent the build from succeeding. Includes
     * capability mismatch errors AND analyzer-detected non-literal
     * argument errors (formatted with `file:line:col:` prefix).
     */
    errors: string[];
    /**
     * Warnings that should be printed but do not fail the build.
     * Declared-but-unused capabilities, tables, and notifications.
     */
    warnings: string[];
    /**
     * Analyzer errors in structured form. Same underlying issues as
     * those prepended to `errors`, provided for callers that want
     * precise location data.
     */
    analyzerErrors: AnalysisIssue[];
}

/**
 * Cross-check a `UsageReport` against declared capabilities, tables,
 * and notification names.
 *
 * The asymmetry — used-but-not-declared is an error, declared-but-not-
 * used is a warning — reflects the two failure modes:
 *
 *   - Used-but-not-declared: the extension is attempting something
 *     it didn't request permission for. At runtime it would throw
 *     `ExtensionCapabilityError` on first execution. Catching it at
 *     build time is strictly better than catching it at runtime.
 *
 *   - Declared-but-not-used: the extension requested more than it
 *     needs. Doesn't break anything, but the store's Phase C review
 *     process will flag over-declaration, so surfacing it early
 *     helps the developer.
 *
 * Any blind spot in the analyzer (`const db = ctx.extensions.db;
 * db.insert(...)`) produces a false "declared but unused" warning,
 * not a false error. That's why warnings are the safe default for
 * the declared-but-unused direction.
 */
export function verifyUsage(
    report: UsageReport,
    declared: DeclaredSurface,
): VerificationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const caps = declared.capabilities;
    const declaredTableNames = new Set(declared.tableNames);
    const declaredNotifNames = new Set(declared.notificationNames);

    const declaredPublishEvents = caps["notifications.publish"] ?? [];
    const declaredPublishSet = new Set(declaredPublishEvents);
    const declaredHttpDomains = caps["http.fetch"] ?? [];

    // ── Analyzer errors first ──────────────────────────────────────
    // These represent cases where the analyzer saw a capability call
    // but couldn't resolve its argument to a literal. They block
    // further verification for those call sites.
    for (const issue of report.errors) {
        errors.push(
            `${issue.file}:${issue.line}:${issue.column}: ${issue.message}`,
        );
    }

    // ── Capability errors: used but not declared ───────────────────
    if (report.usesDbRead && caps["db.read"] !== true) {
        errors.push(
            `Capability "db.read" is used (ctx.extensions.db.find) but not declared. ` +
            `Add "db.read": true to src/capabilities.ts.`,
        );
    }
    if (report.usesDbWrite && caps["db.write"] !== true) {
        errors.push(
            `Capability "db.write" is used (ctx.extensions.db.insert/update/delete) but not declared. ` +
            `Add "db.write": true to src/capabilities.ts.`,
        );
    }
    if (report.usesStorageRead && caps["storage.read"] !== true) {
        errors.push(
            `Capability "storage.read" is used (ctx.extensions.storage.get) but not declared. ` +
            `Add "storage.read": true to src/capabilities.ts.`,
        );
    }
    if (report.usesStorageWrite && caps["storage.write"] !== true) {
        errors.push(
            `Capability "storage.write" is used (ctx.extensions.storage.set/delete) but not declared. ` +
            `Add "storage.write": true to src/capabilities.ts.`,
        );
    }
    if (report.usesHttpFetch && declaredHttpDomains.length === 0) {
        errors.push(
            `Capability "http.fetch" is used (ctx.http.fetch) but no domains are declared. ` +
            `Add "http.fetch": ["<domain>"] to src/capabilities.ts.`,
        );
    }
    if (report.usesLogsWrite && caps["logs.write"] !== true) {
        errors.push(
            `Capability "logs.write" is used (ctx.log.info/warn/error) but not declared. ` +
            `Add "logs.write": true to src/capabilities.ts.`,
        );
    }

    // ── Notification publish errors ────────────────────────────────
    for (const event of report.usesNotificationsPublish) {
        if (!declaredPublishSet.has(event)) {
            errors.push(
                `Notification "${event}" is published but not listed in ` +
                `capabilities["notifications.publish"]. ` +
                `Add it to src/capabilities.ts.`,
            );
        }
        if (!declaredNotifNames.has(event)) {
            errors.push(
                `Notification "${event}" is published but no definition exists at ` +
                `src/notifications/${event}.ts. ` +
                `Create it and import it in src/index.ts's \`notifications\` map.`,
            );
        }
    }

    // ── Table read/write errors ────────────────────────────────────
    for (const table of report.tablesRead) {
        if (!declaredTableNames.has(table)) {
            errors.push(
                `Table "${table}" is read (ctx.extensions.db.find) but not declared. ` +
                `Create src/tables/${table}.ts and add it to the \`tables\` map in src/index.ts.`,
            );
        }
    }
    for (const table of report.tablesWritten) {
        if (!declaredTableNames.has(table)) {
            errors.push(
                `Table "${table}" is written (ctx.extensions.db.insert/update/delete) but not declared. ` +
                `Create src/tables/${table}.ts and add it to the \`tables\` map in src/index.ts.`,
            );
        }
    }

    // ── Capability warnings: declared but unused ───────────────────
    if (caps["db.read"] === true && !report.usesDbRead) {
        warnings.push(
            `Capability "db.read" is declared but no \`ctx.extensions.db.find(...)\` call was detected. ` +
            `Remove it from src/capabilities.ts if unused.`,
        );
    }
    if (caps["db.write"] === true && !report.usesDbWrite) {
        warnings.push(
            `Capability "db.write" is declared but no \`ctx.extensions.db.insert/update/delete(...)\` call was detected. ` +
            `Remove it from src/capabilities.ts if unused.`,
        );
    }
    if (caps["storage.read"] === true && !report.usesStorageRead) {
        warnings.push(
            `Capability "storage.read" is declared but no \`ctx.extensions.storage.get(...)\` call was detected. ` +
            `Remove it from src/capabilities.ts if unused.`,
        );
    }
    if (caps["storage.write"] === true && !report.usesStorageWrite) {
        warnings.push(
            `Capability "storage.write" is declared but no \`ctx.extensions.storage.set/delete(...)\` call was detected. ` +
            `Remove it from src/capabilities.ts if unused.`,
        );
    }
    if (declaredHttpDomains.length > 0 && !report.usesHttpFetch) {
        warnings.push(
            `Capability "http.fetch" declares ${declaredHttpDomains.length} domain(s) ` +
            `but no \`ctx.http.fetch(...)\` call was detected. ` +
            `Remove it from src/capabilities.ts if unused.`,
        );
    }
    if (caps["logs.write"] === true && !report.usesLogsWrite) {
        warnings.push(
            `Capability "logs.write" is declared but no \`ctx.log.info/warn/error(...)\` call was detected. ` +
            `Remove it from src/capabilities.ts if unused.`,
        );
    }

    // ── Notification warnings: declared but not published ──────────
    for (const event of declaredPublishEvents) {
        if (!report.usesNotificationsPublish.has(event)) {
            warnings.push(
                `Notification "${event}" is declared in capabilities["notifications.publish"] ` +
                `but never published via \`ctx.notifications.publish("${event}", ...)\`. ` +
                `Remove it or add the publish call.`,
            );
        }
    }

    // ── Table warnings: declared but never accessed ────────────────
    for (const table of declaredTableNames) {
        if (!report.tablesRead.has(table) && !report.tablesWritten.has(table)) {
            warnings.push(
                `Table "${table}" is declared but never accessed via \`ctx.extensions.db.*\`. ` +
                `Remove it from src/tables/ and from the \`tables\` map in src/index.ts if unused.`,
            );
        }
    }

    return {
        errors,
        warnings,
        analyzerErrors: report.errors,
    };
}