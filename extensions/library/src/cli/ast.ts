import { readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

import {
    Node,
    Project,
    SyntaxKind,
    type AsExpression,
    type CallExpression,
    type Identifier,
    type NoSubstitutionTemplateLiteral,
    type NonNullExpression,
    type ParenthesizedExpression,
    type PropertyAccessExpression,
    type SourceFile,
    type StringLiteral,
} from "ts-morph";

/**
 * Analyzer for extension source files.
 *
 * Walks every `.ts` file under `<sourceDir>/src/`, finds calls to the
 * extension API (`ctx.extensions.db.*`, `ctx.notifications.publish`,
 * etc.), and produces a `UsageReport` describing what the extension
 * actually does. The report is a raw observation — no judgment about
 * whether the usage is permitted. `verify.ts` (the next file) does the
 * cross-check against declared capabilities.
 *
 * This is deliberately a *pattern-matching* pass, not a type-checking
 * pass. It matches by AST structure (`X.extensions.db.insert(...)`
 * regardless of what `X` is), not by resolving types. This means:
 *
 *   - The parameter name doesn't matter (`ctx`, `context`, `c` — all match).
 *   - Aliasing is not detected (`const db = ctx.extensions.db; db.insert(...)`).
 *   - Destructuring is not detected (`const { db } = ctx.extensions`).
 *   - Cross-function access is not detected (`doInsert(ctx)` where
 *     `doInsert` is defined elsewhere and never named `ctx`).
 *
 * The blind spots are why the verify layer treats "declared but
 * unused" as a warning: a false "unused" is a missed detection, not
 * a real capability violation. Used-but-undeclared is an error
 * because if the analyzer *saw* a use, the declaration must exist.
 */

/* ==========================================================================
 * Public types
 * ========================================================================== */

/**
 * A source location and message for one detection problem.
 *
 * `file` is relative to the extension's `<sourceDir>`, using forward
 * slashes for cross-platform consistency in error messages.
 */
export interface AnalysisIssue {
    file: string;
    line: number;
    column: number;
    message: string;
}

/**
 * Everything the analyzer observed about one extension's source code.
 *
 * All fields describe *what was used*, not whether it was permitted.
 * Cross-checking against declarations is `verify.ts`'s job.
 */
export interface UsageReport {
    /** A `ctx.extensions.db.find(...)` call was seen. */
    usesDbRead: boolean;
    /** A `ctx.extensions.db.insert/update/delete(...)` call was seen. */
    usesDbWrite: boolean;
    /** A `ctx.extensions.storage.get(...)` call was seen. */
    usesStorageRead: boolean;
    /** A `ctx.extensions.storage.set/delete(...)` call was seen. */
    usesStorageWrite: boolean;
    /** Event names passed to `ctx.notifications.publish(...)`. */
    usesNotificationsPublish: Set<string>;
    /** A `ctx.http.fetch(...)` call was seen. */
    usesHttpFetch: boolean;
    /** A `ctx.log.info/warn/error(...)` call was seen. */
    usesLogsWrite: boolean;

    /** Tables read via `db.find(tableName, ...)`. */
    tablesRead: Set<string>;
    /** Tables written via `db.insert/update/delete(tableName, ...)`. */
    tablesWritten: Set<string>;

    /**
     * Detection failures — cases where the analyzer saw the right
     * shape but couldn't extract a literal argument (per B3-D5).
     */
    errors: AnalysisIssue[];
}

/* ==========================================================================
 * Public API
 * ========================================================================== */

/**
 * Analyze all `.ts` files under `<sourceDir>/src/` and return a
 * `UsageReport`. Never throws on malformed source (ts-morph parses
 * best-effort). Throws only on filesystem-level failures (source
 * directory missing, unreadable files).
 */
export async function analyzeSource(
    sourceDir: string,
): Promise<UsageReport> {
    const report: UsageReport = {
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
    };

    const project = new Project({
        skipAddingFilesFromTsConfig: true,
        compilerOptions: { allowJs: false },
    });

    // Collect .ts files explicitly rather than using ts-morph's
    // `addSourceFilesAtPaths`. On Windows, that API with an absolute
    // path from `tmpdir()` (e.g.
    // `C:/Users/.../AppData/Local/Temp/ast-detect-XXXX/src/**/*.ts`)
    // was observed to match zero files. Explicit `readdir` +
    // `addSourceFileAtPath` per file is cross-platform and
    // deterministic.
    const srcDir = resolve(sourceDir, "src");
    const files = await collectTsFiles(srcDir);
    for (const file of files) {
        project.addSourceFileAtPath(file);
    }

    for (const sourceFile of project.getSourceFiles()) {
        walkCalls(sourceFile, sourceDir, report);
    }

    return report;
}

/* ==========================================================================
 * Traversal
 * ========================================================================== */

function walkCalls(
    sourceFile: SourceFile,
    sourceDir: string,
    report: UsageReport,
): void {
    const filePath = sourceFile.getFilePath();
    const relFile = relative(sourceDir, filePath).replace(/\\/g, "/");

    for (const call of sourceFile.getDescendantsOfKind(
        SyntaxKind.CallExpression,
    )) {
        const match = matchCapabilityCall(call);
        if (!match) continue;

        // If the call requires a literal-name argument, extract it.
        let extractedValue: string | null = null;
        if (match.requiresLiteralArg) {
            const args = call.getArguments();
            const argResult = extractStringArg(args[0]);
            if (argResult.value === null) {
                const position = getPosition(call);
                report.errors.push({
                    file: relFile,
                    line: position.line,
                    column: position.column,
                    message:
                        `Non-literal ${match.argLabel} passed to \`${match.methodLabel}(...)\`. ` +
                        `${argResult.reason ?? "Expected a string literal or const-resolvable identifier."} ` +
                        `The analyzer cannot verify the capability was declared at build time.`,
                });
                continue;
            }
            extractedValue = argResult.value;
        }

        // Record the observation.
        switch (match.capability) {
            case "db.read":
                report.usesDbRead = true;
                if (extractedValue) report.tablesRead.add(extractedValue);
                break;
            case "db.write":
                report.usesDbWrite = true;
                if (extractedValue) report.tablesWritten.add(extractedValue);
                break;
            case "storage.read":
                report.usesStorageRead = true;
                break;
            case "storage.write":
                report.usesStorageWrite = true;
                break;
            case "notifications.publish":
                if (extractedValue) {
                    report.usesNotificationsPublish.add(extractedValue);
                }
                break;
            case "http.fetch":
                report.usesHttpFetch = true;
                break;
            case "logs.write":
                report.usesLogsWrite = true;
                break;
        }
    }
}

/* ==========================================================================
 * Pattern matching
 * ========================================================================== */

interface CapabilityMatch {
    capability:
    | "db.read"
    | "db.write"
    | "storage.read"
    | "storage.write"
    | "notifications.publish"
    | "http.fetch"
    | "logs.write";
    /** Whether the first argument must be a literal string. */
    requiresLiteralArg: boolean;
    /** Human label for the first arg — used in error messages. */
    argLabel: string;
    /** Human label for the method — used in error messages. */
    methodLabel: string;
}

/**
 * Match a call expression against the extension API surface.
 *
 * Pattern grammar (informal):
 *
 *   `<Ident>.extensions.db.insert|update|delete(table, ...)`   → db.write
 *   `<Ident>.extensions.db.find(table, ...)`                   → db.read
 *   `<Ident>.extensions.storage.get(...)`                      → storage.read
 *   `<Ident>.extensions.storage.set|delete(...)`               → storage.write
 *   `<Ident>.notifications.publish(event, ...)`                → notifications.publish
 *   `<Ident>.http.fetch(...)`                                  → http.fetch
 *   `<Ident>.log.info|warn|error(...)`                         → logs.write
 *
 * NonNullExpression (`ctx!`) and ParenthesizedExpression (`(ctx)`)
 * wrappers are unwrapped before matching — the developer can write
 * `ctx!.extensions!.db!.insert!(...)` and still be caught.
 */
function matchCapabilityCall(call: CallExpression): CapabilityMatch | null {
    const callee = unwrap(call.getExpression());
    if (callee.getKind() !== SyntaxKind.PropertyAccessExpression) return null;
    const methodAccess = callee as PropertyAccessExpression;

    const methodName = methodAccess.getName();
    const receiver = unwrap(methodAccess.getExpression());
    if (receiver.getKind() !== SyntaxKind.PropertyAccessExpression) return null;

    const receiverAccess = receiver as PropertyAccessExpression;
    const receiverName = receiverAccess.getName();
    const grandReceiver = unwrap(receiverAccess.getExpression());

    // ── db / storage: require an intermediate `.extensions` ────────────
    if (receiverName === "db" || receiverName === "storage") {
        if (grandReceiver.getKind() !== SyntaxKind.PropertyAccessExpression) {
            return null;
        }
        const extAccess = grandReceiver as PropertyAccessExpression;
        if (extAccess.getName() !== "extensions") return null;

        if (receiverName === "db") {
            if (methodName === "insert" || methodName === "update" || methodName === "delete") {
                return {
                    capability: "db.write",
                    requiresLiteralArg: true,
                    argLabel: "tableName",
                    methodLabel: `extensions.db.${methodName}`,
                };
            }
            if (methodName === "find") {
                return {
                    capability: "db.read",
                    requiresLiteralArg: true,
                    argLabel: "tableName",
                    methodLabel: "extensions.db.find",
                };
            }
            return null;
        }

        // storage
        if (methodName === "get") {
            return {
                capability: "storage.read",
                requiresLiteralArg: false,
                argLabel: "",
                methodLabel: "extensions.storage.get",
            };
        }
        if (methodName === "set" || methodName === "delete") {
            return {
                capability: "storage.write",
                requiresLiteralArg: false,
                argLabel: "",
                methodLabel: `extensions.storage.${methodName}`,
            };
        }
        return null;
    }

    // ── notifications / http / log: no intermediate required ───────────
    // The base is `X.notifications`, `X.http`, or `X.log` where X is any
    // identifier. That pattern is distinctive enough that a false positive
    // is unlikely — no one writes `someObj.notifications.publish(...)`
    // outside an extension context.

    if (receiverName === "notifications" && methodName === "publish") {
        return {
            capability: "notifications.publish",
            requiresLiteralArg: true,
            argLabel: "eventName",
            methodLabel: "notifications.publish",
        };
    }

    if (
        receiverName === "log" &&
        (methodName === "info" || methodName === "warn" || methodName === "error")
    ) {
        return {
            capability: "logs.write",
            requiresLiteralArg: false,
            argLabel: "",
            methodLabel: `log.${methodName}`,
        };
    }

    if (receiverName === "http" && methodName === "fetch") {
        return {
            capability: "http.fetch",
            requiresLiteralArg: false,
            argLabel: "",
            methodLabel: "http.fetch",
        };
    }

    return null;
}

/* ==========================================================================
 * Argument extraction (B3-D6 const resolution)
 * ========================================================================== */

interface ExtractedArg {
    value: string | null;
    reason?: string;
}

/**
 * Extract the string value of an argument expression.
 *
 * Accepts:
 *   - String literals: `"audit_log"`
 *   - Template literals without substitutions: `` `audit_log` ``
 *   - `as const`-wrapped literals: `"audit_log" as const`
 *   - Identifiers that resolve to a `const X = <literal>` declaration,
 *     recursively up to 5 levels of indirection (defensive limit —
 *     longer chains are pathological).
 *
 * Rejects everything else with a reason string that names the problem.
 */
function extractStringArg(arg: Node | undefined): ExtractedArg {
    return extractStringArgRecursive(arg, 0);
}

const MAX_RESOLUTION_DEPTH = 5;

function extractStringArgRecursive(
    arg: Node | undefined,
    depth: number,
): ExtractedArg {
    if (depth > MAX_RESOLUTION_DEPTH) {
        return {
            value: null,
            reason: `Const resolution exceeded ${MAX_RESOLUTION_DEPTH} levels of indirection.`,
        };
    }

    if (!arg) {
        return { value: null, reason: "No argument supplied." };
    }

    const unwrapped = unwrap(arg);

    // ── String literal ────────────────────────────────────────────
    if (unwrapped.getKind() === SyntaxKind.StringLiteral) {
        return { value: (unwrapped as StringLiteral).getLiteralValue() };
    }

    // ── Template literal with no substitutions ────────────────────
    if (unwrapped.getKind() === SyntaxKind.NoSubstitutionTemplateLiteral) {
        return {
            value: (unwrapped as NoSubstitutionTemplateLiteral).getLiteralValue(),
        };
    }

    // ── `... as const` — recurse into the inner expression ────────
    if (unwrapped.getKind() === SyntaxKind.AsExpression) {
        return extractStringArgRecursive(
            (unwrapped as AsExpression).getExpression(),
            depth + 1,
        );
    }

    // ── Identifier — try to resolve to a const declaration ────────
    if (unwrapped.getKind() === SyntaxKind.Identifier) {
        const id = unwrapped as Identifier;
        const idText = id.getText();
        const defs = id.getDefinitionNodes();

        if (defs.length === 0) {
            return {
                value: null,
                reason: `Identifier "${idText}" could not be resolved to a declaration.`,
            };
        }

        const def = defs[0];

        // Imported symbols are explicitly rejected — resolving them would
        // require loading the imported module, and cross-file const
        // resolution is out of scope for B3 (see D4 in this file's header).
        if (Node.isImportSpecifier(def) || Node.isImportClause(def)) {
            return {
                value: null,
                reason: `Identifier "${idText}" is imported from another module. Use a local \`const\` or the literal directly.`,
            };
        }

        if (!Node.isVariableDeclaration(def)) {
            return {
                value: null,
                reason: `Identifier "${idText}" resolves to a non-variable declaration.`,
            };
        }

        const varStatement = def.getVariableStatement();
        if (!varStatement || varStatement.getDeclarationKind() !== "const") {
            return {
                value: null,
                reason: `Identifier "${idText}" is not a \`const\` binding.`,
            };
        }

        const init = def.getInitializer();
        if (!init) {
            return {
                value: null,
                reason: `Const "${idText}" has no initializer.`,
            };
        }

        return extractStringArgRecursive(init, depth + 1);
    }

    // ── Everything else — describe the shape for the error message ────
    return {
        value: null,
        reason: `Expression of kind "${SyntaxKind[unwrapped.getKind()]}" is not a string literal or resolvable \`const\`.`,
    };
}

/* ==========================================================================
 * Helpers
 * ========================================================================== */

/**
 * Unwrap `NonNullExpression` (`expr!`) and `ParenthesizedExpression`
 * (`(expr)`) nodes to reveal the underlying expression. Handles
 * arbitrarily nested combinations.
 */
function unwrap(node: Node): Node {
    let current = node;
    for (; ;) {
        const kind = current.getKind();
        if (kind === SyntaxKind.NonNullExpression) {
            current = (current as NonNullExpression).getExpression();
            continue;
        }
        if (kind === SyntaxKind.ParenthesizedExpression) {
            current = (current as ParenthesizedExpression).getExpression();
            continue;
        }
        return current;
    }
}

/**
 * Compute the 1-based line and column of a node's start position.
 * ts-morph's `getStartLineNumber()` is 1-based; column is computed
 * from the difference between the node's start offset and the start
 * of the current line's offset.
 */
function getPosition(node: Node): { line: number; column: number } {
    const sourceFile = node.getSourceFile();
    const startPos = node.getStart();
    const line = sourceFile.getLineAndColumnAtPos(startPos);
    return { line: line.line, column: line.column };
}

/**
 * Recursively collect `.ts` files under `dir`. Skips `.d.ts` declaration
 * files (they contain no runtime behavior). Returns absolute paths in
 * the platform's native separator format — ts-morph's
 * `addSourceFileAtPath` accepts both.
 *
 * A missing `dir` returns an empty array rather than throwing — the
 * caller (`analyzeSource`) is often called against a directory whose
 * `src/` may not exist yet. Downstream source loaders (`loadCapabilities`,
 * `loadEntry`) throw their own clearer errors for that case; the
 * analyzer shouldn't be the one surfacing "directory missing".
 */
async function collectTsFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    let entries: import("node:fs").Dirent[];
    try {
        entries = await readdir(dir, { withFileTypes: true });
    } catch {
        return [];
    }
    for (const entry of entries) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await collectTsFiles(full)));
        } else if (
            entry.isFile() &&
            entry.name.endsWith(".ts") &&
            !entry.name.endsWith(".d.ts")
        ) {
            files.push(full);
        }
    }
    return files;
}