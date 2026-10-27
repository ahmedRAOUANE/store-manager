import { constants } from "node:fs";
import { access, mkdir, readdir, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { parseArgs } from "node:util";

import {
    buildScaffold,
    type ScaffoldInput,
    type ScaffoldScope,
} from "./templates";

const EXTENSION_ID_REGEX = /^[a-z][a-z0-9-]*$/;
const SEMVER_REGEX = /^\d+\.\d+\.\d+$/;

const VALID_ROLES = ["OWNER", "MANAGER", "STAFF"] as const;
type ValidRole = typeof VALID_ROLES[number];

/**
 * Options for `runInit` — everything `init` needs to write a scaffold,
 * without any CLI or prompt concerns. Tests call this directly with a
 * `targetDir` under a temp directory; the CLI path constructs the same
 * shape via `handleInitCommand`.
 */
export interface RunInitOptions extends ScaffoldInput {
    targetDir: string;
}

/**
 * CLI entry for `init`. Parses flags, prompts for missing values,
 * delegates to `runInit`. All errors throw; the top-level catch in
 * `index.ts` prints them cleanly.
 */
export async function handleInitCommand(args: string[]): Promise<void> {
    if (args.includes("--help") || args.includes("-h")) {
        printInitHelp();
        return;
    }

    const parsed = parseInitArgs(args);
    const options = await gatherInitInput(parsed);
    await runInit(options);
}

/**
 * Write a scaffold to disk. Pure I/O — no prompts, no CLI concerns.
 * Validates input, checks the target directory, then writes every file
 * from `buildScaffold()`'s map.
 */
export async function runInit(options: RunInitOptions): Promise<void> {
    validateInitInput(options);
    await checkTargetDir(options.targetDir);

    const files = buildScaffold(options);
    const targetRoot = resolve(process.cwd(), options.targetDir);

    for (const [relPath, content] of Object.entries(files)) {
        const absPath = join(targetRoot, relPath);
        await mkdir(dirname(absPath), { recursive: true });
        await writeFile(absPath, content, "utf-8");
    }

    printSuccess(options, Object.keys(files));
}

/* ==========================================================================
 * Argument parsing
 * ========================================================================== */

interface ParsedInitArgs {
    targetDir: string;
    name?: string;
    version?: string;
    description?: string;
    author?: string;
    scope?: ScaffoldScope;
    requiresStoreRole?: readonly ValidRole[];
}

function parseInitArgs(args: string[]): ParsedInitArgs {
    const { values, positionals } = parseArgs({
        args,
        options: {
            name: { type: "string" },
            version: { type: "string" },
            description: { type: "string" },
            author: { type: "string" },
            scope: { type: "string" },
            "store-role": { type: "string" },
        },
        strict: true,
        allowPositionals: true,
    });

    const [targetDir] = positionals;
    if (targetDir === undefined) {
        throw new Error(
            "init requires a directory argument. Usage: store-manager-ext init <dir>",
        );
    }

    const scope = parseScope(values.scope);
    const requiresStoreRole = parseStoreRole(values["store-role"], scope);

    return {
        targetDir,
        name: values.name,
        version: values.version,
        description: values.description,
        author: values.author,
        scope,
        requiresStoreRole,
    };
}

function parseScope(raw: string | undefined): ScaffoldScope | undefined {
    if (raw === undefined) return undefined;
    if (raw !== "user" && raw !== "store" && raw !== "admin") {
        throw new Error(
            `--scope must be one of: user, store, admin (got "${raw}")`,
        );
    }
    return raw;
}

function parseStoreRole(
    raw: string | undefined,
    scope: ScaffoldScope | undefined,
): readonly ValidRole[] | undefined {
    if (raw === undefined) return undefined;
    if (scope !== undefined && scope !== "store") {
        throw new Error("--store-role is only valid with --scope=store");
    }
    const roles = raw.split(",").map((r) => r.trim());
    for (const role of roles) {
        if (!VALID_ROLES.includes(role as ValidRole)) {
            throw new Error(
                `Invalid store role "${role}". Must be one of: ${VALID_ROLES.join(", ")}`,
            );
        }
    }
    return roles as ValidRole[];
}

/* ==========================================================================
 * Interactive input
 * ========================================================================== */

async function gatherInitInput(
    parsed: ParsedInitArgs,
): Promise<RunInitOptions> {
    const defaultName = basename(resolve(parsed.targetDir));

    const resolved: RunInitOptions = {
        targetDir: parsed.targetDir,
        name: parsed.name ?? defaultName,
        version: parsed.version ?? "1.0.0",
        description: parsed.description ?? "",
        author: parsed.author ?? "",
        scope: parsed.scope ?? "user",
        requiresStoreRole: parsed.requiresStoreRole,
    };

    const everythingProvided =
        parsed.name !== undefined &&
        parsed.version !== undefined &&
        parsed.description !== undefined &&
        parsed.author !== undefined &&
        parsed.scope !== undefined;

    if (everythingProvided) {
        return resolved;
    }

    if (!stdin.isTTY) {
        const missing: string[] = [];
        if (parsed.name === undefined) missing.push("--name");
        if (parsed.version === undefined) missing.push("--version");
        if (parsed.description === undefined) missing.push("--description");
        if (parsed.author === undefined) missing.push("--author");
        if (parsed.scope === undefined) missing.push("--scope");
        throw new Error(
            `Not all required values were provided and stdin is not a TTY. ` +
            `Provide the following as flags: ${missing.join(", ")}`,
        );
    }

    const rl = createInterface({ input: stdin, output: stdout });
    try {
        if (parsed.name === undefined) {
            resolved.name = await promptWithValidation(
                rl,
                `Extension name (lowercase, hyphens only) [${defaultName}]: `,
                defaultName,
                (v) => EXTENSION_ID_REGEX.test(v),
            );
        }
        if (parsed.version === undefined) {
            resolved.version = await promptWithValidation(
                rl,
                "Version [1.0.0]: ",
                "1.0.0",
                (v) => SEMVER_REGEX.test(v),
            );
        }
        if (parsed.description === undefined) {
            resolved.description = (
                await rl.question("Description (optional): ")
            ).trim();
        }
        if (parsed.author === undefined) {
            resolved.author = (
                await rl.question("Author name (optional): ")
            ).trim();
        }
        if (parsed.scope === undefined) {
            const scopeAnswer = await promptWithValidation(
                rl,
                "Scope (user/store/admin) [user]: ",
                "user",
                (v) => v === "user" || v === "store" || v === "admin",
            );
            resolved.scope = scopeAnswer as ScaffoldScope;
        }
        if (
            resolved.scope === "store" &&
            parsed.requiresStoreRole === undefined
        ) {
            const roleAnswer = (
                await rl.question(
                    "Required store roles (comma-separated) [OWNER,MANAGER]: ",
                )
            ).trim();
            if (roleAnswer !== "") {
                resolved.requiresStoreRole = parseStoreRole(roleAnswer, "store");
            }
            // Empty input → keep undefined → templates.ts defaults to OWNER,MANAGER
        }
    } finally {
        rl.close();
    }

    return resolved;
}

async function promptWithValidation(
    rl: ReturnType<typeof createInterface>,
    question: string,
    defaultValue: string,
    validate: (value: string) => boolean,
): Promise<string> {
    for (; ;) {
        const raw = (await rl.question(question)).trim();
        const value = raw === "" ? defaultValue : raw;
        if (validate(value)) return value;
        console.log("  ⚠ Invalid input. Please try again.");
    }
}

/* ==========================================================================
 * Validation + target directory check
 * ========================================================================== */

function validateInitInput(options: RunInitOptions): void {
    if (!EXTENSION_ID_REGEX.test(options.name)) {
        throw new Error(
            `Invalid extension name "${options.name}". Must be lowercase, start with a letter, and contain only letters, digits, and hyphens.`,
        );
    }
    if (!SEMVER_REGEX.test(options.version)) {
        throw new Error(
            `Invalid version "${options.version}". Must be semver (e.g. 1.0.0).`,
        );
    }
    if (options.scope !== "store" && options.requiresStoreRole !== undefined) {
        throw new Error("requiresStoreRole is only valid for store-scoped extensions");
    }
}

async function checkTargetDir(targetDir: string): Promise<void> {
    const absolute = resolve(process.cwd(), targetDir);
    try {
        await access(absolute, constants.F_OK);
    } catch {
        return; // Doesn't exist — fine, we'll create it
    }
    const entries = await readdir(absolute);
    if (entries.length > 0) {
        throw new Error(
            `Target directory "${targetDir}" already exists and is not empty. ` +
            `Remove it or choose a different directory.`,
        );
    }
}

/* ==========================================================================
 * Output
 * ========================================================================== */

function printSuccess(options: RunInitOptions, files: string[]): void {
    console.log("");
    console.log(`✅ Created extension "${options.name}" in ${options.targetDir}`);
    console.log("");
    console.log("Files written:");
    for (const file of files) {
        console.log(`  ${file}`);
    }
    console.log("");
    console.log("Next steps:");
    console.log(`  cd ${options.targetDir}`);
    console.log(`  # Edit src/index.ts to implement your hook handlers`);
    console.log(`  # Edit src/capabilities.ts to declare required capabilities`);
    console.log(`  store-manager-ext build .`);
    console.log("");
}

function printInitHelp(): void {
    console.log(
        [
            "Usage: store-manager-ext init <dir> [options]",
            "",
            "Options:",
            "  --name=<name>               Extension name (lowercase, hyphens only)",
            "  --version=<version>         Semver version (default: 1.0.0)",
            "  --description=<text>        Human-readable description",
            "  --author=<name>             Author name",
            "  --scope=<user|store|admin>  Extension scope (default: user)",
            "  --store-role=<roles>        Comma-separated roles (only with --scope=store)",
            "",
            "If options are omitted, interactive prompts will ask for them.",
        ].join("\n"),
    );
}