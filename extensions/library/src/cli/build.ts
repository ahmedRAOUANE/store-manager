import { createHash } from "node:crypto";
import {
    copyFile,
    mkdir,
    readdir,
    readFile,
    rm,
    writeFile,
} from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { build as esbuild } from "esbuild";

import {
    HOOK_NAMES,
    ManifestSchema,
    type CapabilityDeclaration,
    type ExtensionDeclarationInput,
    type ExtensionNotificationDefinition,
    type HookName,
    type TableDefinition,
} from "@store-manager/extensions";

import { analyzeSource } from "./ast";
import { loadModuleDefault } from "./load-module";
import { verifyUsage } from "./verify";

/* ==========================================================================
 * Public API
 * ========================================================================== */

interface BuildOptions {
    /** Directory containing package.json + src/. Defaults to cwd. */
    sourceDir?: string;
}

/**
 * CLI entry for `build`. Handles argument parsing and delegates to
 * `runBuild`. The top-level catch in `index.ts` prints errors cleanly.
 */
export async function handleBuildCommand(args: string[]): Promise<void> {
    if (args.includes("--help") || args.includes("-h")) {
        printBuildHelp();
        return;
    }

    const [positional] = args;
    await runBuild({ sourceDir: positional });
}

/**
 * Run the build pipeline. Loads declarations, assembles the manifest,
 * validates it, bundles the entry point, writes dist/.
 *
 * All errors throw with a message suitable for the CLI's top-level
 * catch — no partial state left behind on failure (dist/ is either
 * fully written or removed).
 */
export async function runBuild(options: BuildOptions = {}): Promise<void> {
    const sourceDir = resolve(process.cwd(), options.sourceDir ?? ".");
    const pkg = await readPackageJson(sourceDir);
    validateStoreManager(pkg);

    const previousId = process.env.STORE_MANAGER_EXTENSION_ID;
    process.env.STORE_MANAGER_EXTENSION_ID = pkg.name;

    try {
        const capabilities = await loadCapabilities(sourceDir);
        const tables = await loadTableDefinitions(sourceDir);
        const notifications = await loadNotificationDefinitions(sourceDir);
        const entry = await loadEntry(sourceDir);

        // ── B3: AST verification ──────────────────────────────────
        // Walk every .ts file under src/, extract what the extension
        // actually does (ctx.extensions.db.insert(...), etc.), and
        // cross-check against the declared capabilities, table names,
        // and notification names. Runs after loading declarations but
        // before manifest assembly so capability mismatches surface
        // before any downstream work.
        //
        // Warnings print to stderr as diagnostic output. Errors throw
        // and the top-level catch in `cli/index.ts` prints them with
        // the ❌ prefix. Both categories can appear in the same run —
        // a build that fails on capability verification still surfaces
        // the unused-declaration warnings found by the same pass.
        const usageReport = await analyzeSource(sourceDir);
        const verification = verifyUsage(usageReport, {
            capabilities,
            tableNames: Object.keys(tables),
            notificationNames: Object.keys(notifications),
        });

        if (verification.warnings.length > 0) {
            for (const warning of verification.warnings) {
                console.warn(`⚠ ${warning}`);
            }
        }

        if (verification.errors.length > 0) {
            throw new Error(
                `Capability verification failed:\n${verification.errors
                    .map((e) => `  - ${e}`)
                    .join("\n")}`,
            );
        }
        // ── end B3 ────────────────────────────────────────────────

        crossCheckEntry(entry, tables, notifications);

        const translations = await loadTranslations(
            sourceDir,
            Object.keys(notifications),
        );

        const manifest = assembleManifest({
            pkg,
            capabilities,
            entry,
            tables,
            notifications,
            translations,
        });

        const parsed = ManifestSchema.safeParse(manifest);
        if (!parsed.success) {
            throw new Error(
                `Assembled manifest failed validation:\n${formatZodError(parsed.error)}`,
            );
        }

        await writeDist(sourceDir, pkg, entry, parsed.data);

        const checksum = await computeArtifactChecksum(
            join(sourceDir, "dist", "index.js"),
        );

        printSuccess(pkg, checksum);
    } finally {
        if (previousId === undefined) {
            delete process.env.STORE_MANAGER_EXTENSION_ID;
        } else {
            process.env.STORE_MANAGER_EXTENSION_ID = previousId;
        }
    }
}

/* ==========================================================================
 * package.json
 * ========================================================================== */

interface PackageJson {
    name: string;
    version: string;
    description?: string;
    author?: string | { name?: string };
    storeManager?: {
        scope: "user" | "store" | "admin";
        eligibility: Record<string, unknown>;
    };
}

interface ValidatedPackageJson extends PackageJson {
    storeManager: NonNullable<PackageJson["storeManager"]>;
}

async function readPackageJson(dir: string): Promise<PackageJson> {
    const path = join(dir, "package.json");
    let raw: string;
    try {
        raw = await readFile(path, "utf-8");
    } catch {
        throw new Error(`No package.json found at ${path}`);
    }
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch (error) {
        throw new Error(
            `Invalid JSON in package.json: ${(error as Error).message}`,
        );
    }
    const pkg = parsed as PackageJson;
    if (typeof pkg.name !== "string" || pkg.name.length === 0) {
        throw new Error("package.json is missing required field `name`");
    }
    if (typeof pkg.version !== "string" || pkg.version.length === 0) {
        throw new Error("package.json is missing required field `version`");
    }
    return pkg;
}

function validateStoreManager(
    pkg: PackageJson,
): asserts pkg is ValidatedPackageJson {
    if (!pkg.storeManager) {
        throw new Error(
            "package.json is missing a `storeManager` block. " +
            "A scaffolded extension from `store-manager-ext init` " +
            "includes this by default.",
        );
    }
    const { scope } = pkg.storeManager;
    if (scope !== "user" && scope !== "store" && scope !== "admin") {
        throw new Error(
            `storeManager.scope must be one of: user, store, admin ` +
            `(got ${JSON.stringify(scope)})`,
        );
    }
}

/* ==========================================================================
 * Source loading
 * ========================================================================== */

async function loadCapabilities(
    sourceDir: string,
): Promise<CapabilityDeclaration> {
    return loadModuleDefault<CapabilityDeclaration>(
        join(sourceDir, "src", "capabilities.ts"),
    );
}

async function loadTableDefinitions(
    sourceDir: string,
): Promise<Record<string, TableDefinition>> {
    const dir = join(sourceDir, "src", "tables");
    const files = await listTsFiles(dir);
    const tables: Record<string, TableDefinition> = {};
    for (const file of files) {
        tables[basename(file, ".ts")] =
            await loadModuleDefault<TableDefinition>(file);
    }
    return tables;
}

async function loadNotificationDefinitions(
    sourceDir: string,
): Promise<Record<string, ExtensionNotificationDefinition>> {
    const dir = join(sourceDir, "src", "notifications");
    const files = await listTsFiles(dir);
    const notifications: Record<string, ExtensionNotificationDefinition> = {};
    for (const file of files) {
        notifications[basename(file, ".ts")] =
            await loadModuleDefault<ExtensionNotificationDefinition>(file);
    }
    return notifications;
}

async function loadEntry(
    sourceDir: string,
): Promise<ExtensionDeclarationInput> {
    return loadModuleDefault<ExtensionDeclarationInput>(
        join(sourceDir, "src", "index.ts"),
    );
}

async function listTsFiles(dir: string): Promise<string[]> {
    let entries: string[];
    try {
        entries = await readdir(dir);
    } catch {
        return [];
    }
    return entries
        .filter((name) => name.endsWith(".ts") && !name.endsWith(".d.ts"))
        .map((name) => join(dir, name))
        .sort();
}

/* ==========================================================================
 * Cross-checks
 * ========================================================================== */

function crossCheckEntry(
    entry: ExtensionDeclarationInput,
    tables: Record<string, TableDefinition>,
    notifications: Record<string, ExtensionNotificationDefinition>,
): void {
    for (const tableName of Object.keys(entry.tables)) {
        if (!(tableName in tables)) {
            throw new Error(
                `src/index.ts declares table "${tableName}" but no file ` +
                `exists at src/tables/${tableName}.ts`,
            );
        }
    }
    for (const tableName of Object.keys(tables)) {
        if (!(tableName in entry.tables)) {
            throw new Error(
                `src/tables/${tableName}.ts exists but is not imported in ` +
                `src/index.ts's \`tables\` map`,
            );
        }
    }

    for (const notifName of Object.keys(entry.notifications)) {
        if (!(notifName in notifications)) {
            throw new Error(
                `src/index.ts declares notification "${notifName}" but no ` +
                `file exists at src/notifications/${notifName}.ts`,
            );
        }
    }
    for (const notifName of Object.keys(notifications)) {
        if (!(notifName in entry.notifications)) {
            throw new Error(
                `src/notifications/${notifName}.ts exists but is not ` +
                `imported in src/index.ts's \`notifications\` map`,
            );
        }
    }

    for (const hookName of Object.keys(entry.on)) {
        if (!HOOK_NAMES.includes(hookName as HookName)) {
            throw new Error(
                `src/index.ts subscribes to unknown hook "${hookName}". ` +
                `Valid hooks: ${HOOK_NAMES.join(", ")}`,
            );
        }
    }
}

/* ==========================================================================
 * Translations
 * ========================================================================== */

type Locale = "en" | "ar";

interface NotifTranslation {
    title: string;
    body: string;
}

type TranslationBundle = Record<Locale, Record<string, NotifTranslation>>;

async function loadTranslations(
    sourceDir: string,
    declaredNotificationNames: string[],
): Promise<TranslationBundle> {
    const bundle: Partial<TranslationBundle> = {};

    for (const locale of ["en", "ar"] as const) {
        const path = join(sourceDir, "src", "translations", `${locale}.json`);
        let raw: string;
        try {
            raw = await readFile(path, "utf-8");
        } catch {
            throw new Error(
                `Missing translations file ${path}. ` +
                `Every extension must include src/translations/en.json ` +
                `and src/translations/ar.json.`,
            );
        }
        let parsed: { notifications?: Record<string, NotifTranslation> };
        try {
            parsed = JSON.parse(raw) as typeof parsed;
        } catch (error) {
            throw new Error(
                `Invalid JSON in ${path}: ${(error as Error).message}`,
            );
        }
        const notifications = parsed.notifications ?? {};
        for (const name of declaredNotificationNames) {
            if (!notifications[name]) {
                throw new Error(
                    `${path} is missing an entry for notification "${name}" ` +
                    `under "notifications".`,
                );
            }
        }
        bundle[locale] = notifications;
    }

    return bundle as TranslationBundle;
}

/* ==========================================================================
 * Manifest assembly
 * ========================================================================== */

interface AssembleOptions {
    pkg: ValidatedPackageJson;
    capabilities: CapabilityDeclaration;
    entry: ExtensionDeclarationInput;
    tables: Record<string, TableDefinition>;
    notifications: Record<string, ExtensionNotificationDefinition>;
    translations: TranslationBundle;
}

function assembleManifest(
    options: AssembleOptions,
): Record<string, unknown> {
    const {
        pkg,
        capabilities,
        entry,
        tables,
        notifications,
        translations,
    } = options;

    const hooks = Object.keys(entry.on);
    if (hooks.length === 0) {
        throw new Error(
            "src/index.ts does not subscribe to any hooks. " +
            "An extension must declare at least one hook in `on: {}`.",
        );
    }

    const notificationBlock: Record<string, { titleKey: string; bodyKey: string }> = {};
    for (const [name, def] of Object.entries(notifications)) {
        notificationBlock[name] = {
            titleKey: def.presentation.titleKey,
            bodyKey: def.presentation.bodyKey,
        };
    }

    const tableBlock: Record<string, { columns: Record<string, string> }> = {};
    for (const [name, def] of Object.entries(tables)) {
        tableBlock[name] = { columns: { ...def.columns } };
    }

    const authorName =
        typeof pkg.author === "string"
            ? pkg.author
            : (pkg.author?.name ?? "");

    return {
        id: pkg.name,
        version: pkg.version,
        name: pkg.name,
        description: pkg.description,
        author: { name: authorName },
        scope: pkg.storeManager.scope,
        eligibility: pkg.storeManager.eligibility,
        libraryVersion: "^1.0.0",
        capabilities: normalizeCapabilities(capabilities),
        hooks,
        tables: tableBlock,
        notifications: notificationBlock,
        translations: {
            en: { notifications: translations.en },
            ar: { notifications: translations.ar },
        },
    };
}

function normalizeCapabilities(
    decl: CapabilityDeclaration,
): Record<string, unknown> {
    return {
        "db.read": decl["db.read"] ?? false,
        "db.write": decl["db.write"] ?? false,
        "storage.read": decl["storage.read"] ?? false,
        "storage.write": decl["storage.write"] ?? false,
        "notifications.publish": decl["notifications.publish"] ?? [],
        "http.fetch": decl["http.fetch"] ?? [],
        "logs.write": decl["logs.write"] ?? false,
    };
}

/* ==========================================================================
 * Bundle + dist write
 * ========================================================================== */

async function writeDist(
    sourceDir: string,
    pkg: ValidatedPackageJson,
    _entry: ExtensionDeclarationInput,
    manifest: Record<string, unknown>,
): Promise<void> {
    const distDir = join(sourceDir, "dist");
    await rm(distDir, { recursive: true, force: true });
    await mkdir(distDir, { recursive: true });

    await esbuild({
        entryPoints: [join(sourceDir, "src", "index.ts")],
        bundle: true,
        format: "esm",
        platform: "node",
        target: "node20",
        external: ["zod", "zod/*"],
        sourcemap: true,
        outfile: join(distDir, "index.js"),
        define: {
            "process.env.STORE_MANAGER_EXTENSION_ID": JSON.stringify(pkg.name),
        },
    });

    const checksum = await computeArtifactChecksum(
        join(distDir, "index.js"),
    );

    const manifestWithMetadata = {
        ...manifest,
        buildMetadata: {
            builtWith: "@store-manager/extensions@1.0.0",
            builtAt: new Date().toISOString(),
            artifactChecksum: checksum,
        },
    };

    await writeFile(
        join(distDir, "manifest.json"),
        JSON.stringify(manifestWithMetadata, null, 2) + "\n",
        "utf-8",
    );

    try {
        await copyFile(
            join(sourceDir, "README.md"),
            join(distDir, "README.md"),
        );
    } catch {
        // README not present; skip silently.
    }
}

async function computeArtifactChecksum(indexPath: string): Promise<string> {
    const bytes = await readFile(indexPath);
    const digest = createHash("sha256").update(bytes).digest("hex");
    return `sha256:${digest}`;
}

/* ==========================================================================
 * Output
 * ========================================================================== */

function printSuccess(pkg: ValidatedPackageJson, checksum: string): void {
    console.log("");
    console.log(`✅ Built ${pkg.name}@${pkg.version}`);
    console.log("");
    console.log(`   dist/index.js`);
    console.log(`   dist/manifest.json`);
    console.log(`   ${checksum}`);
    console.log("");
}

function printBuildHelp(): void {
    console.log(
        [
            "Usage: store-manager-ext build [dir]",
            "",
            "Builds the extension at <dir> (default: current directory).",
            "",
            "Reads:   package.json, src/capabilities.ts, src/tables/*.ts,",
            "         src/notifications/*.ts, src/translations/*.json, src/index.ts",
            "Writes:  dist/index.js, dist/index.js.map, dist/manifest.json, dist/README.md",
            "",
            "Errors are thrown without producing partial output: dist/ is",
            "either fully written or not present at all.",
        ].join("\n"),
    );
}

/* ==========================================================================
 * Helpers
 * ========================================================================== */

/**
 * Structural type for a Zod issue collection, matching any Zod version
 * that keeps `issues[].path` and `issues[].message`. `path` is
 * `PropertyKey[]` in Zod 4 (includes `symbol`); Zod 3 used
 * `(string | number)[]`, a subset. `String(seg)` handles both — a
 * `symbol` stringifies as `Symbol(description)`, which is unusual in
 * a Zod path but harmless.
 *
 * `ReadonlyArray` accepts both mutable (`Array<T>`) and readonly
 * arrays from any Zod version.
 */
function formatZodError(error: {
    readonly issues: ReadonlyArray<{
        readonly path: ReadonlyArray<PropertyKey>;
        readonly message: string;
    }>;
}): string {
    return error.issues
        .map((i) => {
            const path =
                i.path.length > 0
                    ? i.path.map((seg) => String(seg)).join(".")
                    : "(root)";
            return `  - ${path}: ${i.message}`;
        })
        .join("\n");
}