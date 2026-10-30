import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

import type { Manifest } from "@store-manager/extensions";

import {
    analyzeSource,
    type AnalysisIssue,
} from "@/extensions/library/src/cli/ast";
import { verifyUsage } from "@/extensions/library/src/cli/verify";
import type { InspectedZip } from "@/utils/zip-extract";

/**
 * Store-side static analysis (C2).
 *
 * Re-runs the library's compiler AST pass against the SUBMITTED
 * SOURCE — not the compiled artifact — and cross-checks its findings
 * against the manifest the submission itself declares. This is the
 * store's independent verification pass.
 *
 * The developer's `store-manager-ext build` already ran `analyzeSource`
 * + `verifyUsage` on their machine. The store cannot trust their
 * machine. Only its own copy of the analyzer runs here.
 *
 * What it catches:
 *   - Submission whose source/ was tampered with after a clean build.
 *   - Submission whose manifest over-declares (worth flagging for the
 *     reviewer — over-declaration is a warning, not an error, because
 *     the extension may need the capability for a hook the review
 *     process hasn't exercised yet).
 *   - Submission whose source uses a capability the manifest does
 *     not declare — this is a hard rejection (used-but-not-declared
 *     is a security boundary, not a style issue).
 *   - Submission missing source/ entirely — hard rejection (the store
 *     cannot review what it cannot see).
 *   - Submission with non-literal table/event names — hard rejection
 *     (the analyzer cannot verify what it cannot resolve statically).
 *
 * What it does NOT catch:
 *   - Runtime behavior — that's C3's job.
 *   - Source replaced with benign code that doesn't match index.js —
 *     that's a deeper integrity problem requiring signature chains
 *     (future).
 *
 * On success, the returned `StaticAnalysisReport` is a plain JSON-safe
 * structure suitable for persisting to `ExtensionVersion.
 * staticAnalysisReport` and for rendering in C5's review UI.
 */

export interface StaticAnalysisReport {
    /** Boolean observations from the analyzer. */
    usesDbRead: boolean;
    usesDbWrite: boolean;
    usesStorageRead: boolean;
    usesStorageWrite: boolean;
    usesHttpFetch: boolean;
    usesLogsWrite: boolean;

    /** Event names observed in `ctx.notifications.publish(...)`. */
    usesNotificationsPublish: string[];

    /** Table names observed in reads and writes. */
    tablesRead: string[];
    tablesWritten: string[];

    /** Non-literal-argument findings from the analyzer. */
    analyzerErrors: AnalysisIssue[];

    /** Declared-but-unused warnings from the verifier. */
    warnings: string[];

    /** ISO timestamp — when this analysis ran. */
    analyzedAt: string;
}

export type StaticAnalysisResult =
    | { ok: true; report: StaticAnalysisReport }
    | { ok: false; errors: string[]; analyzerErrors: AnalysisIssue[] };

const SOURCE_PREFIX = "source/src/";

/**
 * Analyze the source tree inside `zip` against `manifest`.
 *
 * Extracts `source/src/**` to a temp directory, runs the library's
 * `analyzeSource` + `verifyUsage`, and cleans up. The temp directory
 * is unique per call — concurrent submissions do not interfere.
 *
 * Throws only on unexpected I/O failures (temp dir creation, file
 * write). All expected rejections (missing source, undeclared
 * capability, non-literal arg) are returned as `{ ok: false }`.
 */
export async function analyzeSubmissionSource(
    zip: InspectedZip,
    manifest: Manifest,
): Promise<StaticAnalysisResult> {
    // ── 1. Verify source/src/ exists ───────────────────────────────
    const sourceEntries = zip.entries.filter(
        (e) => e.fileName.startsWith(SOURCE_PREFIX) && !e.isDirectory,
    );
    if (sourceEntries.length === 0) {
        return {
            ok: false,
            errors: [
                `Submission is missing its source tree at "${SOURCE_PREFIX}". ` +
                `Every submission must include the source so the store can re-analyze it. ` +
                `Re-run \`store-manager-ext pack\` from the extension directory.`,
            ],
            analyzerErrors: [],
        };
    }

    // ── 2. Extract source/src/** to a temp dir, preserving layout ──
    let tmpRoot: string | null = null;
    try {
        tmpRoot = await mkdtemp(join(tmpdir(), "static-analysis-"));

        for (const entry of sourceEntries) {
            // "source/src/hooks/x.ts" → "src/hooks/x.ts" under tmpRoot
            const relPath = entry.fileName.slice("source/".length);
            const absPath = join(tmpRoot, relPath);
            await mkdir(dirname(absPath), { recursive: true });
            const content = await zip.readFile(entry.fileName);
            await writeFile(absPath, content);
        }

        // ── 3. Run analyzer + verifier ─────────────────────────────
        const usageReport = await analyzeSource(tmpRoot);

        const verification = verifyUsage(usageReport, {
            capabilities: manifest.capabilities,
            tableNames: Object.keys(manifest.tables),
            notificationNames: Object.keys(manifest.notifications),
        });

        // ── 4. Any verification error → reject the submission ──────
        if (verification.errors.length > 0) {
            return {
                ok: false,
                errors: verification.errors,
                analyzerErrors: verification.analyzerErrors,
            };
        }

        // ── 5. Success — structured, JSON-safe report for the DB ───
        return {
            ok: true,
            report: {
                usesDbRead: usageReport.usesDbRead,
                usesDbWrite: usageReport.usesDbWrite,
                usesStorageRead: usageReport.usesStorageRead,
                usesStorageWrite: usageReport.usesStorageWrite,
                usesHttpFetch: usageReport.usesHttpFetch,
                usesLogsWrite: usageReport.usesLogsWrite,
                usesNotificationsPublish: [
                    ...usageReport.usesNotificationsPublish,
                ],
                tablesRead: [...usageReport.tablesRead],
                tablesWritten: [...usageReport.tablesWritten],
                analyzerErrors: usageReport.errors,
                warnings: verification.warnings,
                analyzedAt: new Date().toISOString(),
            },
        };
    } finally {
        if (tmpRoot) {
            try {
                await rm(tmpRoot, { recursive: true, force: true });
            } catch {
                // best-effort — stale temp dirs are harmless
            }
        }
    }
}