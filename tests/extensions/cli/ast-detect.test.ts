import { describe, it, expect, afterEach } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import {
    analyzeSource,
    type UsageReport,
} from "../../../extensions/library/src/cli/ast";

const createdDirs: string[] = [];

async function makeFixture(
    files: Record<string, string>,
): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), "ast-detect-"));
    createdDirs.push(dir);
    for (const [relPath, content] of Object.entries(files)) {
        const absPath = join(dir, relPath);
        await mkdir(dirname(absPath), { recursive: true });
        await writeFile(absPath, content, "utf-8");
    }
    return dir;
}

async function runAnalysis(
    source: string,
    filename = "src/index.ts",
): Promise<UsageReport> {
    const dir = await makeFixture({ [filename]: source });
    return analyzeSource(dir);
}

afterEach(async () => {
    for (const dir of createdDirs) {
        try {
            await rm(dir, { recursive: true, force: true });
        } catch {
            // ignore â€” temp dirs, cleanup is best-effort
        }
    }
    createdDirs.length = 0;
});

/* ==========================================================================
 * Direct method patterns
 * ========================================================================== */

describe("ast: direct method calls", () => {
    it("detects db.insert as db.write + table", async () => {
        const r = await runAnalysis(`async function f(ctx: any) {
    await ctx.extensions.db.insert("audit_log", { x: 1 });
}`);
        expect(r.usesDbWrite).toBe(true);
        expect(r.tablesWritten.has("audit_log")).toBe(true);
        expect(r.errors).toHaveLength(0);
    });

    it("detects db.find as db.read + table", async () => {
        const r = await runAnalysis(`async function f(ctx: any) {
    await ctx.extensions.db.find("audit_log", { x: 1 });
}`);
        expect(r.usesDbRead).toBe(true);
        expect(r.tablesRead.has("audit_log")).toBe(true);
    });

    it("detects db.update as db.write + table", async () => {
        const r = await runAnalysis(`async function f(ctx: any) {
    await ctx.extensions.db.update("audit_log", { x: 1 }, { y: 2 });
}`);
        expect(r.usesDbWrite).toBe(true);
        expect(r.tablesWritten.has("audit_log")).toBe(true);
    });

    it("detects db.delete as db.write + table", async () => {
        const r = await runAnalysis(`async function f(ctx: any) {
    await ctx.extensions.db.delete("audit_log", { x: 1 });
}`);
        expect(r.usesDbWrite).toBe(true);
        expect(r.tablesWritten.has("audit_log")).toBe(true);
    });

    it("detects storage.get as storage.read", async () => {
        const r = await runAnalysis(`async function f(ctx: any) {
    await ctx.extensions.storage.get("key");
}`);
        expect(r.usesStorageRead).toBe(true);
    });

    it("detects storage.set as storage.write", async () => {
        const r = await runAnalysis(`async function f(ctx: any) {
    await ctx.extensions.storage.set("key", 1);
}`);
        expect(r.usesStorageWrite).toBe(true);
    });

    it("detects storage.delete as storage.write", async () => {
        const r = await runAnalysis(`async function f(ctx: any) {
    await ctx.extensions.storage.delete("key");
}`);
        expect(r.usesStorageWrite).toBe(true);
    });

    it("detects notifications.publish with event name", async () => {
        const r = await runAnalysis(`async function f(ctx: any) {
    await ctx.notifications.publish("LOG_CHANGED", { x: 1 });
}`);
        expect(r.usesNotificationsPublish.has("LOG_CHANGED")).toBe(true);
    });

    it("detects http.fetch", async () => {
        const r = await runAnalysis(`async function f(ctx: any) {
    await ctx.http.fetch("https://example.com");
}`);
        expect(r.usesHttpFetch).toBe(true);
    });

    it("detects log.info", async () => {
        const r = await runAnalysis(`async function f(ctx: any) {
    ctx.log.info("msg");
}`);
        expect(r.usesLogsWrite).toBe(true);
    });

    it("detects log.warn", async () => {
        const r = await runAnalysis(`async function f(ctx: any) {
    ctx.log.warn("msg");
}`);
        expect(r.usesLogsWrite).toBe(true);
    });

    it("detects log.error", async () => {
        const r = await runAnalysis(`async function f(ctx: any) {
    ctx.log.error("msg");
}`);
        expect(r.usesLogsWrite).toBe(true);
    });
});

/* ==========================================================================
 * Node unwrapping
 * ========================================================================== */

describe("ast: node unwrapping", () => {
    it("unwraps NonNullExpression at each level", async () => {
        const r = await runAnalysis(`async function f(ctx: any) {
    await ctx!.extensions!.db!.insert!("audit_log", {});
}`);
        expect(r.usesDbWrite).toBe(true);
        expect(r.tablesWritten.has("audit_log")).toBe(true);
        expect(r.errors).toHaveLength(0);
    });

    it("unwraps ParenthesizedExpression at the base", async () => {
        const r = await runAnalysis(`async function f(ctx: any) {
    await (ctx).extensions.db.insert("audit_log", {});
}`);
        expect(r.usesDbWrite).toBe(true);
        expect(r.tablesWritten.has("audit_log")).toBe(true);
    });
});

/* ==========================================================================
 * Const resolution (B3-D6)
 * ========================================================================== */

describe("ast: const resolution", () => {
    it("resolves a const string to its literal value", async () => {
        const r = await runAnalysis(`async function f(ctx: any) {
    const TABLE = "audit_log";
    await ctx.extensions.db.insert(TABLE, {});
}`);
        expect(r.usesDbWrite).toBe(true);
        expect(r.tablesWritten.has("audit_log")).toBe(true);
        expect(r.errors).toHaveLength(0);
    });

    it("resolves through `as const`", async () => {
        const r = await runAnalysis(`async function f(ctx: any) {
    const TABLE = "audit_log" as const;
    await ctx.extensions.db.insert(TABLE, {});
}`);
        expect(r.tablesWritten.has("audit_log")).toBe(true);
        expect(r.errors).toHaveLength(0);
    });

    it("resolves multi-level const indirection", async () => {
        const r = await runAnalysis(`async function f(ctx: any) {
    const A = "audit_log";
    const B = A;
    await ctx.extensions.db.insert(B, {});
}`);
        expect(r.tablesWritten.has("audit_log")).toBe(true);
        expect(r.errors).toHaveLength(0);
    });

    it("resolves template literal without substitutions", async () => {
        const r = await runAnalysis(`async function f(ctx: any) {
    await ctx.extensions.db.insert(\`audit_log\`, {});
}`);
        expect(r.tablesWritten.has("audit_log")).toBe(true);
        expect(r.errors).toHaveLength(0);
    });
});

/* ==========================================================================
 * Non-literal errors (B3-D5)
 * ========================================================================== */

describe("ast: non-literal errors", () => {
    it("errors on non-const variable", async () => {
        const r = await runAnalysis(`async function f(ctx: any) {
    let TABLE = "audit_log";
    await ctx.extensions.db.insert(TABLE, {});
}`);
        expect(r.errors).toHaveLength(1);
        expect(r.errors[0].message).toMatch(/not a .const. binding/);
    });

    it("errors on function call expression", async () => {
        const r = await runAnalysis(`async function f(ctx: any) {
    const T = getTable();
    await ctx.extensions.db.insert(T, {});
}
declare function getTable(): string;`);
        expect(r.errors).toHaveLength(1);
        expect(r.errors[0].message).toMatch(/Non-literal tableName/);
        expect(r.errors[0].message).toMatch(/kind "CallExpression"/);
    });

    it("errors on unresolvable identifier (imported from missing module)", async () => {
        const r = await runAnalysis(`import { TABLE } from "./constants";
async function f(ctx: any) {
    await ctx.extensions.db.insert(TABLE, {});
}`);
        expect(r.errors.length).toBeGreaterThanOrEqual(1);
        expect(r.errors[0].message).toMatch(/Non-literal tableName/);
    });
});

/* ==========================================================================
 * Nested contexts
 * ========================================================================== */

describe("ast: nested contexts", () => {
    it("detects a call inside an if block", async () => {
        const r = await runAnalysis(`async function f(ctx: any) {
    if (true) {
        await ctx.extensions.db.insert("audit_log", {});
    }
}`);
        expect(r.usesDbWrite).toBe(true);
    });

    it("detects a call inside a try/catch", async () => {
        const r = await runAnalysis(`async function f(ctx: any) {
    try {
        await ctx.extensions.db.insert("audit_log", {});
    } catch { /* ignore */ }
}`);
        expect(r.usesDbWrite).toBe(true);
    });

    it("detects a call inside a forEach callback", async () => {
        const r = await runAnalysis(`async function f(ctx: any, items: any[]) {
    items.forEach(async (item) => {
        await ctx.extensions.db.insert("audit_log", item);
    });
}`);
        expect(r.usesDbWrite).toBe(true);
    });

    it("detects a call inside an arrow assigned to a const", async () => {
        const r = await runAnalysis(`const handler = async (ctx: any) => {
    await ctx.extensions.db.insert("audit_log", {});
};
export default handler;`);
        expect(r.usesDbWrite).toBe(true);
    });
});

/* ==========================================================================
 * False positives and multi-file aggregation
 * ========================================================================== */

describe("ast: false positives and multi-file", () => {
    it("ignores unrelated method chains", async () => {
        const r = await runAnalysis(`async function f(foo: any) {
    await foo.bar.baz("x");
    await foo.db.insert("x", {});
    await foo.extensions.insert("x", {});
}`);
        // foo.db.insert doesn't match (no `.extensions` intermediate).
        // foo.extensions.insert doesn't match (no `.db` intermediate).
        expect(r.usesDbWrite).toBe(false);
        expect(r.errors).toHaveLength(0);
    });

    it("aggregates detections across multiple files", async () => {
        const dir = await makeFixture({
            "src/a.ts": `async function a(ctx: any) {
    await ctx.extensions.db.insert("audit_log", {});
}`,
            "src/b.ts": `async function b(ctx: any) {
    await ctx.extensions.db.insert("events_log", {});
}`,
        });
        const r = await analyzeSource(dir);
        expect(r.tablesWritten.has("audit_log")).toBe(true);
        expect(r.tablesWritten.has("events_log")).toBe(true);
    });

    it("produces an empty report for a file with no capability calls", async () => {
        const r = await runAnalysis(`const x = 1;
export default x;`);
        expect(r.usesDbWrite).toBe(false);
        expect(r.usesDbRead).toBe(false);
        expect(r.usesStorageRead).toBe(false);
        expect(r.usesStorageWrite).toBe(false);
        expect(r.usesNotificationsPublish.size).toBe(0);
        expect(r.usesHttpFetch).toBe(false);
        expect(r.usesLogsWrite).toBe(false);
        expect(r.tablesRead.size).toBe(0);
        expect(r.tablesWritten.size).toBe(0);
        expect(r.errors).toHaveLength(0);
    });
});

/* ==========================================================================
 * Position accuracy
 * ========================================================================== */

describe("ast: position accuracy", () => {
    it("reports correct file, line, and column for a non-literal error", async () => {
        const r = await runAnalysis(`import { TABLE } from "./constants";
async function f(ctx: any) {
    await ctx.extensions.db.insert(TABLE, {});
}`);
        expect(r.errors).toHaveLength(1);
        const err = r.errors[0];
        expect(err.file).toBe("src/index.ts");
        expect(err.line).toBe(3);
        // 1-based column of `ctx` on line 3:
        // 4 spaces + "await " (6) + 1 = 11
        expect(err.column).toBe(11);
    });
});