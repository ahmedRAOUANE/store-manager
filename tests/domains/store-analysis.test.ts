import { describe, it, expect } from "vitest";
import { ZipFile } from "yazl";

import { ManifestSchema } from "@store-manager/extensions";
import { inspectZip, type InspectedZip } from "../../utils/zip-extract";
import { analyzeSubmissionSource } from "../../services/storeAnalysis.services";

/* ==========================================================================
 * Fixtures
 * ========================================================================== */

function baseManifest(overrides: Record<string, unknown> = {}) {
    return {
        id: "test-ext",
        version: "1.0.0",
        name: "Test Extension",
        author: { name: "Test Author" },
        scope: "user",
        eligibility: { minimumGlobalRole: "USER" },
        libraryVersion: "^1.0.0",
        capabilities: {
            "db.read": false,
            "db.write": false,
            "storage.read": false,
            "storage.write": false,
            "notifications.publish": [] as string[],
            "http.fetch": [] as string[],
            "logs.write": false,
        },
        hooks: ["product.created"] as const,
        tables: {},
        notifications: {},
        translations: {
            en: { notifications: {} },
            ar: { notifications: {} },
        },
        ...overrides,
    };
}

function parseManifest(overrides: Record<string, unknown> = {}) {
    const parsed = ManifestSchema.safeParse(baseManifest(overrides));
    if (!parsed.success) {
        throw new Error(
            `fixture manifest failed: ${parsed.error.message}`,
        );
    }
    return parsed.data;
}

async function buildZip(
    files: Record<string, string>,
): Promise<Buffer> {
    const zip = new ZipFile();
    const bufferPromise = new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        zip.outputStream.on("data", (chunk: Buffer) => chunks.push(chunk));
        zip.outputStream.on("end", () => resolve(Buffer.concat(chunks)));
        zip.outputStream.on("error", reject);
    });
    for (const [name, content] of Object.entries(files)) {
        zip.addBuffer(Buffer.from(content, "utf-8"), name);
    }
    zip.end();
    return bufferPromise;
}

/**
 * Build a zip with a valid manifest at root and the given source files
 * laid out under source/src/. Returns an open InspectedZip handle —
 * caller must close.
 */
async function buildSourceZip(
    sourceFiles: Record<string, string>,
    manifestOverrides: Record<string, unknown> = {},
): Promise<{ zip: InspectedZip; close: () => void }> {
    const files: Record<string, string> = {
        "manifest.json": JSON.stringify(
            baseManifest(manifestOverrides),
            null,
            2,
        ),
        "index.js": "// built artifact\n",
        "source/package.json": JSON.stringify({ name: "test-ext" }),
        "source/tsconfig.json": "{}",
    };
    for (const [relPath, content] of Object.entries(sourceFiles)) {
        files[`source/src/${relPath}`] = content;
    }
    const buffer = await buildZip(files);
    const zip = await inspectZip(buffer);
    return { zip, close: () => zip.close() };
}

/* ==========================================================================
 * Happy path
 * ========================================================================== */

describe("analyzeSubmissionSource — happy path", () => {
    it("returns a structured report for a clean submission", async () => {
        const { zip, close } = await buildSourceZip({
            "index.ts":
                "export default { hooks: {}, notifications: {} };\n",
        });
        try {
            const result = await analyzeSubmissionSource(
                zip,
                parseManifest(),
            );
            expect(result.ok).toBe(true);
            if (!result.ok) return;

            const r = result.report;
            expect(r.usesDbRead).toBe(false);
            expect(r.usesDbWrite).toBe(false);
            expect(r.usesStorageRead).toBe(false);
            expect(r.usesStorageWrite).toBe(false);
            expect(r.usesHttpFetch).toBe(false);
            expect(r.usesLogsWrite).toBe(false);
            expect(r.usesNotificationsPublish).toEqual([]);
            expect(r.tablesRead).toEqual([]);
            expect(r.tablesWritten).toEqual([]);
            expect(r.analyzerErrors).toEqual([]);
            expect(r.warnings).toEqual([]);
            expect(r.analyzedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        } finally {
            close();
        }
    });

    it("preserves nested subdirectories under source/src/", async () => {
        const { zip, close } = await buildSourceZip({
            "index.ts":
                "export default { hooks: {}, notifications: {} };\n",
            "hooks/product.created.ts":
                "export const handler = async () => {};\n",
            "utils/helper.ts":
                "export const x = 1;\n",
        });
        try {
            const result = await analyzeSubmissionSource(
                zip,
                parseManifest(),
            );
            expect(result.ok).toBe(true);
        } finally {
            close();
        }
    });
});

/* ==========================================================================
 * Rejection paths
 * ========================================================================== */

describe("analyzeSubmissionSource — rejections", () => {
    it("rejects when source/src/ is missing from the zip", async () => {
        const buffer = await buildZip({
            "manifest.json": JSON.stringify(baseManifest()),
            "index.js": "// built\n",
        });
        const zip = await inspectZip(buffer);
        try {
            const result = await analyzeSubmissionSource(
                zip,
                parseManifest(),
            );
            expect(result.ok).toBe(false);
            if (result.ok) return;
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toMatch(/source tree/);
        } finally {
            zip.close();
        }
    });

    it("rejects when source uses an undeclared capability", async () => {
        const { zip, close } = await buildSourceZip({
            "index.ts": `
                export default {
                    hooks: {
                        "product.created": async (ctx) => {
                            await ctx.extensions.db.insert("audit_log", {});
                        },
                    },
                };
            `,
        });
        try {
            const result = await analyzeSubmissionSource(
                zip,
                parseManifest(), // db.write: false
            );
            expect(result.ok).toBe(false);
            if (result.ok) return;
            expect(
                result.errors.some((e: string) => /"db\.write"/.test(e)),
            ).toBe(true);
        } finally {
            close();
        }
    });

    it("rejects when source uses an undeclared table", async () => {
        const { zip, close } = await buildSourceZip({
            "index.ts": `
                export default {
                    hooks: {
                        "product.created": async (ctx) => {
                            await ctx.extensions.db.find("audit_log", {});
                        },
                    },
                };
            `,
        });
        try {
            const result = await analyzeSubmissionSource(
                zip,
                parseManifest({
                    capabilities: { "db.read": true },
                    tables: { other_log: { columns: { x: "text" } } },
                }),
            );
            expect(result.ok).toBe(false);
            if (result.ok) return;
            expect(
                result.errors.some((e: string) =>
                    /Table "audit_log".*not declared/.test(e),
                ),
            ).toBe(true);
        } finally {
            close();
        }
    });

    it("rejects on a non-literal table name", async () => {
        const { zip, close } = await buildSourceZip({
            "index.ts": `
                declare function getTable(): string;
                export default {
                    hooks: {
                        "product.created": async (ctx) => {
                            const t = getTable();
                            await ctx.extensions.db.insert(t, {});
                        },
                    },
                };
            `,
        });
        try {
            const result = await analyzeSubmissionSource(
                zip,
                parseManifest({
                    capabilities: { "db.write": true },
                }),
            );
            expect(result.ok).toBe(false);
            if (result.ok) return;
            expect(
                result.errors.some((e: string) => /Non-literal tableName/.test(e)),
            ).toBe(true);
            expect(result.analyzerErrors.length).toBeGreaterThan(0);
        } finally {
            close();
        }
    });
});

/* ==========================================================================
 * Warning path — declared-but-unused is NOT a rejection
 * ========================================================================== */

describe("analyzeSubmissionSource — warnings", () => {
    it("does not reject when a declared capability is unused (warning only)", async () => {
        const { zip, close } = await buildSourceZip({
            "index.ts":
                "export default { hooks: {}, notifications: {} };\n",
        });
        try {
            const result = await analyzeSubmissionSource(
                zip,
                parseManifest({
                    capabilities: { "db.write": true },
                }),
            );
            expect(result.ok).toBe(true);
            if (!result.ok) return;
            expect(result.report.warnings.length).toBeGreaterThan(0);
            expect(
                result.report.warnings.some((w: string) => /"db\.write"/.test(w)),
            ).toBe(true);
        } finally {
            close();
        }
    });
});