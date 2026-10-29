#!/usr/bin/env tsx

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * CLI entry point for `store-manager-ext`.
 *
 * This is the target of the `bin` field in the library's `package.json`.
 * On install, pnpm reads the shebang (`#!/usr/bin/env tsx`) and generates
 * cross-platform shims that invoke `tsx` against this file. On Unix the
 * shim is a shell script; on Windows it's a `.cmd` that spawns
 * `node_modules/.bin/tsx`.
 *
 * Commands:
 *   - `init`  — scaffold a new extension (implemented in `./init.ts`)
 *   - `build` — compile an extension to a dist directory (implemented in `./build.ts`)
 *   - `--help`, `--version`
 *
 * In B2-2, `init` and `build` are stubs that throw. B2-3 replaces the
 * `init` stub, B2-5 replaces the `build` stub. Both replacements are
 * localized to the corresponding `if (command === ...)` block.
 */

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const [command] = args;

    if (command === undefined || command === "--help" || command === "-h") {
        printHelp();
        return;
    }

    if (command === "--version" || command === "-v") {
        printVersion();
        return;
    }

    if (command === "init") {
        const { handleInitCommand } = await import("./init");
        await handleInitCommand(args.slice(1));
        return;
    }

    if (command === "build") {
        const { handleBuildCommand } = await import("./build");
        await handleBuildCommand(args.slice(1));
        return;
    }

    if (command === "pack") {
        const { handlePackCommand } = await import("./pack");
        await handlePackCommand(args.slice(1));
        return;
    }

    throw new Error(
        `Unknown command "${command}". Run \`store-manager-ext --help\` for usage.`,
    );
}

function printHelp(): void {
    console.log(
        [
            "store-manager-ext — extension development CLI",
            "",
            "Usage:",
            "  store-manager-ext init <dir> [options]    Scaffold a new extension",
            "  store-manager-ext build [dir] [options]   Build an extension",
            "  store-manager-ext pack <dir> [options]    Package a built extension into a .zip",
            "  store-manager-ext --help                  Show this message",
            "  store-manager-ext --version               Show version",
            "",
            "Run `store-manager-ext <command> --help` for command-specific options.",
        ].join("\n"),
    );
}

function printVersion(): void {
    try {
        const here = dirname(fileURLToPath(import.meta.url));
        const pkgPath = join(here, "..", "..", "package.json");
        const raw = readFileSync(pkgPath, "utf-8");
        const pkg = JSON.parse(raw) as { version?: string };
        console.log(pkg.version ?? "unknown");
    } catch {
        // If package.json is missing (e.g., the CLI is being executed from
        // an unexpected working directory), fall back to a placeholder
        // rather than crashing --version. Not expected to happen in
        // practice; the bin path and package.json are siblings.
        console.log("unknown");
    }
}

main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ ${message}\n`);
    process.exit(1);
});