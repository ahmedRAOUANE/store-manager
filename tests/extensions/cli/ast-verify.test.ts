import { describe, it, expect } from "vitest";

import {
    verifyUsage,
    type DeclaredSurface,
} from "../../../extensions/library/src/cli/verify";
import type { UsageReport } from "../../../extensions/library/src/cli/ast";

/**
 * Construct a `UsageReport` with all usage fields at their empty
 * defaults. Tests override only the fields relevant to their scenario.
 */
function makeReport(overrides: Partial<UsageReport> = {}): UsageReport {
    return {
        usesDbRead: false,
        usesDbWrite: false,
        usesStorageRead: false,
        usesStorageWrite: false,
        usesNotificationsPublish: new Set(),
        usesHttpFetch: false,
        usesLogsWrite: false,
        tablesRead: new Set(),
        tablesWritten: new Set(),
        errors: [],
        ...overrides,
    };
}

function makeDeclared(
    overrides: Partial<DeclaredSurface> = {},
): DeclaredSurface {
    return {
        capabilities: {},
        tableNames: [],
        notificationNames: [],
        ...overrides,
    };
}

/* ==========================================================================
 * Error cases â€” capability used but not declared
 * ========================================================================== */

describe("verify: capability used but not declared", () => {
    it("errors on db.read usage without declaration", () => {
        const r = verifyUsage(
            makeReport({ usesDbRead: true }),
            makeDeclared(),
        );
        expect(r.errors).toHaveLength(1);
        expect(r.errors[0]).toMatch(/"db\.read".*used.*not declared/);
    });

    it("errors on db.write usage without declaration", () => {
        const r = verifyUsage(
            makeReport({ usesDbWrite: true }),
            makeDeclared(),
        );
        expect(r.errors).toHaveLength(1);
        expect(r.errors[0]).toMatch(/"db\.write".*used.*not declared/);
    });

    it("errors on storage.read usage without declaration", () => {
        const r = verifyUsage(
            makeReport({ usesStorageRead: true }),
            makeDeclared(),
        );
        expect(r.errors).toHaveLength(1);
        expect(r.errors[0]).toMatch(/"storage\.read".*used.*not declared/);
    });

    it("errors on storage.write usage without declaration", () => {
        const r = verifyUsage(
            makeReport({ usesStorageWrite: true }),
            makeDeclared(),
        );
        expect(r.errors).toHaveLength(1);
        expect(r.errors[0]).toMatch(/"storage\.write".*used.*not declared/);
    });

    it("errors on http.fetch usage with no domains declared", () => {
        const r = verifyUsage(
            makeReport({ usesHttpFetch: true }),
            makeDeclared(),
        );
        expect(r.errors).toHaveLength(1);
        expect(r.errors[0]).toMatch(/"http\.fetch".*no domains/);
    });

    it("errors on logs.write usage without declaration", () => {
        const r = verifyUsage(
            makeReport({ usesLogsWrite: true }),
            makeDeclared(),
        );
        expect(r.errors).toHaveLength(1);
        expect(r.errors[0]).toMatch(/"logs\.write".*used.*not declared/);
    });

    it("does not error on db.write usage when db.write is declared", () => {
        const r = verifyUsage(
            makeReport({ usesDbWrite: true, tablesWritten: new Set(["t"]) }),
            makeDeclared({
                capabilities: { "db.write": true },
                tableNames: ["t"],
            }),
        );
        expect(r.errors).toHaveLength(0);
    });
});

/* ==========================================================================
 * Error cases â€” notifications
 * ========================================================================== */

describe("verify: notification errors", () => {
    it("errors on published event not in capabilities", () => {
        const r = verifyUsage(
            makeReport({
                usesNotificationsPublish: new Set(["LOG_CHANGED"]),
            }),
            makeDeclared({ notificationNames: ["LOG_CHANGED"] }),
        );
        expect(
            r.errors.some((e) => /not listed in capabilities/.test(e)),
        ).toBe(true);
    });

    it("errors on published event with no definition", () => {
        const r = verifyUsage(
            makeReport({
                usesNotificationsPublish: new Set(["LOG_CHANGED"]),
            }),
            makeDeclared({
                capabilities: { "notifications.publish": ["LOG_CHANGED"] },
            }),
        );
        expect(
            r.errors.some((e) =>
                /no definition exists at src\/notifications/.test(e),
            ),
        ).toBe(true);
    });

    it("does not error when both declared and defined", () => {
        const r = verifyUsage(
            makeReport({
                usesNotificationsPublish: new Set(["LOG_CHANGED"]),
            }),
            makeDeclared({
                capabilities: { "notifications.publish": ["LOG_CHANGED"] },
                notificationNames: ["LOG_CHANGED"],
            }),
        );
        expect(r.errors).toHaveLength(0);
    });
});

/* ==========================================================================
 * Error cases â€” tables
 * ========================================================================== */

describe("verify: table errors", () => {
    it("errors on read of undeclared table", () => {
        const r = verifyUsage(
            makeReport({
                usesDbRead: true,
                tablesRead: new Set(["audit_log"]),
            }),
            makeDeclared({ capabilities: { "db.read": true } }),
        );
        expect(
            r.errors.some((e) =>
                /Table "audit_log".*read.*not declared/.test(e),
            ),
        ).toBe(true);
    });

    it("errors on write of undeclared table", () => {
        const r = verifyUsage(
            makeReport({
                usesDbWrite: true,
                tablesWritten: new Set(["audit_log"]),
            }),
            makeDeclared({ capabilities: { "db.write": true } }),
        );
        expect(
            r.errors.some((e) =>
                /Table "audit_log".*written.*not declared/.test(e),
            ),
        ).toBe(true);
    });
});

/* ==========================================================================
 * Warning cases â€” declared but unused
 * ========================================================================== */

describe("verify: warnings for unused declarations", () => {
    it("warns on unused db.read", () => {
        const r = verifyUsage(
            makeReport(),
            makeDeclared({ capabilities: { "db.read": true } }),
        );
        expect(
            r.warnings.some((w) => /"db\.read".*declared but no/.test(w)),
        ).toBe(true);
    });

    it("warns on unused http.fetch domains", () => {
        const r = verifyUsage(
            makeReport(),
            makeDeclared({
                capabilities: { "http.fetch": ["api.example.com"] },
            }),
        );
        expect(
            r.warnings.some((w) => /"http\.fetch".*declares/.test(w)),
        ).toBe(true);
    });

    it("warns on unused declared notification", () => {
        const r = verifyUsage(
            makeReport(),
            makeDeclared({
                capabilities: {
                    "notifications.publish": ["UNUSED_EVENT"],
                },
                notificationNames: ["UNUSED_EVENT"],
            }),
        );
        expect(
            r.warnings.some((w) => /"UNUSED_EVENT".*never published/.test(w)),
        ).toBe(true);
    });

    it("warns on unused declared table", () => {
        const r = verifyUsage(
            makeReport(),
            makeDeclared({ tableNames: ["unused_table"] }),
        );
        expect(
            r.warnings.some((w) =>
                /Table "unused_table".*never accessed/.test(w),
            ),
        ).toBe(true);
    });

    it("does not warn when declaration matches usage", () => {
        const r = verifyUsage(
            makeReport({
                usesDbRead: true,
                tablesRead: new Set(["audit_log"]),
            }),
            makeDeclared({
                capabilities: { "db.read": true },
                tableNames: ["audit_log"],
            }),
        );
        expect(r.warnings).toHaveLength(0);
    });
});

/* ==========================================================================
 * Analyzer error passthrough
 * ========================================================================== */

describe("verify: analyzer error passthrough", () => {
    it("includes analyzer errors in `errors` with file:line:col prefix", () => {
        const r = verifyUsage(
            makeReport({
                errors: [
                    {
                        file: "src/index.ts",
                        line: 10,
                        column: 25,
                        message: "Non-literal tableName passed.",
                    },
                ],
            }),
            makeDeclared(),
        );
        expect(r.errors).toHaveLength(1);
        expect(r.errors[0]).toBe(
            "src/index.ts:10:25: Non-literal tableName passed.",
        );
    });

    it("preserves analyzer errors as structured `analyzerErrors`", () => {
        const originalIssue = {
            file: "src/index.ts",
            line: 10,
            column: 25,
            message: "Non-literal tableName passed.",
        };
        const r = verifyUsage(
            makeReport({ errors: [originalIssue] }),
            makeDeclared(),
        );
        expect(r.analyzerErrors).toHaveLength(1);
        expect(r.analyzerErrors[0]).toEqual(originalIssue);
    });
});

/* ==========================================================================
 * Ordering and combined scenarios
 * ========================================================================== */

describe("verify: ordering and combined scenarios", () => {
    it("errors come in analyzer â†’ capability â†’ notification â†’ table order", () => {
        // Craft a report that triggers all four categories:
        //   - an analyzer error (non-literal)
        //   - a capability error (db.write used, not declared)
        //   - notification errors (LOG_CHANGED published, not in caps
        //     and no definition â€” this produces TWO errors)
        //   - a table error (audit_log written, not declared)
        const r = verifyUsage(
            makeReport({
                usesDbWrite: true,
                usesNotificationsPublish: new Set(["LOG_CHANGED"]),
                tablesWritten: new Set(["audit_log"]),
                errors: [
                    {
                        file: "src/index.ts",
                        line: 1,
                        column: 1,
                        message: "analyzer issue",
                    },
                ],
            }),
            makeDeclared(),
        );

        expect(r.errors.length).toBeGreaterThanOrEqual(4);

        const analyzerIdx = r.errors.findIndex((e) =>
            /analyzer issue/.test(e),
        );
        const capIdx = r.errors.findIndex((e) =>
            /"db\.write".*used/.test(e),
        );
        const notifIdx = r.errors.findIndex((e) =>
            /"LOG_CHANGED".*published/.test(e),
        );
        const tableIdx = r.errors.findIndex((e) =>
            /Table "audit_log"/.test(e),
        );

        expect(analyzerIdx).toBeGreaterThanOrEqual(0);
        expect(capIdx).toBeGreaterThan(analyzerIdx);
        expect(notifIdx).toBeGreaterThan(capIdx);
        expect(tableIdx).toBeGreaterThan(notifIdx);
    });

    it("empty usage + empty declaration â†’ no errors, no warnings", () => {
        const r = verifyUsage(makeReport(), makeDeclared());
        expect(r.errors).toHaveLength(0);
        expect(r.warnings).toHaveLength(0);
        expect(r.analyzerErrors).toHaveLength(0);
    });
});