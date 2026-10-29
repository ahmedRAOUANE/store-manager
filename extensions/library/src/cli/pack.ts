import { promises as fs } from "node:fs";
import { join, relative } from "node:path";
import { parseArgs } from "node:util";

import { ZipFile } from "yazl";

import { ManifestSchema } from "../manifest";

/**
 * `store-manager-ext pack` — bundle a built extension into a `.zip`
 * ready for store upload.
 *
 * Input: a directory that has already been scaffolded by
 * `store-manager-ext init` and built by `store-manager-ext build`. The
 * expected layout:
 *
 *   <dir>/
 *   ├── package.json          (from init)
 *   ├── tsconfig.json         (from init)
 *   ├── src/                  (from init + author edits)
 *   │   └── ...
 *   └── dist/                 (from build)
 *       ├── manifest.json
 *       ├── index.js
 *       ├── index.js.map
 *       └── README.md
 *
 * Output: a single zip whose structure matches the C1-D2 upload format:
 *
 *   <name>-<version>.zip
 *   ├── manifest.json         (copied from dist/)
 *   ├── index.js              (copied from dist/)
 *   └── source/
 *       ├── package.json      (copied from root)
 *       ├── tsconfig.json     (copied from root)
 *       └── src/              (recursive walk of src/)
 *
 * The `source/` tree exists so the C5 review UI can render the source
 * alongside the compiled artifact. Every upload carries both.
 *
 * Runs entirely offline — no DB, no network, no R2 credentials. Safe to
 * invoke from any context including CI.
 */

const MAX_ZIP_BYTES = 4.5 * 1024 * 1024; // Vercel Hobby function-body cap

const EXCLUDED_SOURCE_DIRS = new Set(["node_modules", ".git", "dist"]);
const EXCLUDED_SOURCE_PATTERNS: ReadonlyArray<RegExp> = [
    /\.log$/,
    /\.DS_Store$/,
    /\.tmp-/,
];

export interface PackOptions {
    /** The extension directory. */
    readonly dir: string;
    /** Optional output path override. Default: `<dir>/<name>-<version>.zip`. */
    readonly out?: string;
}

export interface PackResult {
    readonly outputPath: string;
    readonly extensionId: string;
    readonly version: string;
    readonly byteLength: number;
}

export async function runPack(options: PackOptions): Promise<PackResult> {
    const { dir, out } = options;

    // ── 1. Verify source structure ────────────────────────────────
    const pkg = await loadPackageJson(dir);
    const manifest = await loadAndValidateManifest(dir);

    if (manifest.id !== pkg.name) {
        throw new Error(
            `manifest.id ("${manifest.id}") must match package.json name ("${pkg.name}") — ` +
            `re-run \`store-manager-ext build\` if you renamed the package`,
        );
    }
    if (manifest.version !== pkg.version) {
        throw new Error(
            `version mismatch: package.json says "${pkg.version}", ` +
            `dist/manifest.json says "${manifest.version}" — ` +
            `re-run \`store-manager-ext build\` to sync`,
        );
    }

    const indexPath = join(dir, "dist", "index.js");
    const indexStat = await statSafe(indexPath);
    if (!indexStat || !indexStat.isFile()) {
        throw new Error(
            `"${indexPath}" not found — run \`store-manager-ext build\` first`,
        );
    }

    const srcDir = join(dir, "src");
    const srcStat = await statSafe(srcDir);
    if (!srcStat || !srcStat.isDirectory()) {
        throw new Error(
            `"${srcDir}" not found — every extension must ship its source for store review`,
        );
    }

    const tsconfigPath = join(dir, "tsconfig.json");
    const tsconfigStat = await statSafe(tsconfigPath);
    if (!tsconfigStat) {
        throw new Error(
            `"${tsconfigPath}" not found — every extension must ship its tsconfig for store review`,
        );
    }

    const sourceFiles = await collectSourceFiles(srcDir);

    // ── 2. Resolve output path ────────────────────────────────────
    const outputPath =
        out ?? join(dir, `${pkg.name}-${pkg.version}.zip`);
    if (
        outputPath.endsWith("/") ||
        outputPath.endsWith("\\")
    ) {
        throw new Error(
            `--out must be a file path, not a directory: "${outputPath}"`,
        );
    }

    // ── 3. Build the zip in memory ────────────────────────────────
    const zip = new ZipFile();

    // Root: compiled artifacts.
    zip.addFile(join(dir, "dist", "manifest.json"), "manifest.json");
    zip.addFile(indexPath, "index.js");

    // source/: package.json, tsconfig.json, src/** — for review.
    zip.addFile(join(dir, "package.json"), "source/package.json");
    zip.addFile(tsconfigPath, "source/tsconfig.json");
    for (const absPath of sourceFiles) {
        const rel = relative(srcDir, absPath).replace(/\\/g, "/");
        zip.addFile(absPath, `source/src/${rel}`);
    }

    zip.end();

    const chunks: Buffer[] = [];
    for await (const chunk of zip.outputStream as AsyncIterable<Buffer>) {
        chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    if (buffer.byteLength > MAX_ZIP_BYTES) {
        throw new Error(
            `packaged zip exceeds ${MAX_ZIP_BYTES} bytes (got ${buffer.byteLength}) — ` +
            `the store will reject it. Trim source/assets, or contact the platform team ` +
            `if the limit needs raising.`,
        );
    }

    // ── 4. Write ──────────────────────────────────────────────────
    await fs.writeFile(outputPath, buffer);

    console.log("");
    console.log(`✅ Packed ${manifest.id}@${manifest.version}`);
    console.log("");
    console.log(`   ${outputPath}`);
    console.log(`   ${buffer.byteLength.toLocaleString()} bytes`);
    console.log("");
    console.log(
        "Next step: upload this file via your store's admin submit page.",
    );
    console.log("");

    return {
        outputPath,
        extensionId: manifest.id,
        version: manifest.version,
        byteLength: buffer.byteLength,
    };
}

/* ==========================================================================
 * Internals
 * ========================================================================== */

interface PackageJsonShape {
    name: string;
    version: string;
}

async function loadPackageJson(dir: string): Promise<PackageJsonShape> {
    const path = join(dir, "package.json");
    const raw = await fs.readFile(path, "utf-8");
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        throw new Error(`"${path}" is not valid JSON`);
    }
    if (
        typeof parsed !== "object" ||
        parsed === null ||
        typeof (parsed as { name?: unknown }).name !== "string" ||
        typeof (parsed as { version?: unknown }).version !== "string"
    ) {
        throw new Error(
            `"${path}" must contain string "name" and "version" fields`,
        );
    }
    return {
        name: (parsed as { name: string }).name,
        version: (parsed as { version: string }).version,
    };
}

async function loadAndValidateManifest(
    dir: string,
): Promise<{ id: string; version: string }> {
    const path = join(dir, "dist", "manifest.json");
    const stat = await statSafe(path);
    if (!stat || !stat.isFile()) {
        throw new Error(
            `"${path}" not found — run \`store-manager-ext build\` first`,
        );
    }
    const raw = await fs.readFile(path, "utf-8");
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        throw new Error(`"${path}" is not valid JSON`);
    }

    const result = ManifestSchema.safeParse(parsed);
    if (!result.success) {
        throw new Error(
            `"${path}" failed ManifestSchema validation:\n` +
            `  ${result.error.issues
                .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
                .join("\n  ")}`,
        );
    }
    return { id: result.data.id, version: result.data.version };
}

async function collectSourceFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        if (EXCLUDED_SOURCE_DIRS.has(entry.name)) continue;
        if (EXCLUDED_SOURCE_PATTERNS.some((re) => re.test(entry.name))) {
            continue;
        }
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await collectSourceFiles(full)));
        } else if (entry.isFile()) {
            // Symlinks skipped — the destination zip validator rejects
            // them anyway, and following them risks including files
            // outside the extension directory.
            files.push(full);
        }
    }
    return files;
}

async function statSafe(
    path: string,
): Promise<Awaited<ReturnType<typeof fs.stat>> | null> {
    try {
        return await fs.stat(path);
    } catch {
        return null;
    }
}

/* ==========================================================================
 * CLI concerns
 * ========================================================================== */

/**
 * CLI entry for `pack`. Parses flags, delegates to `runPack`. Matches
 * the shape of `handleInitCommand` and `handleBuildCommand`: takes raw
 * argv slice, returns void, lets the top-level catch in `index.ts`
 * print errors.
 *
 * `parseArgs` is used (not the manual `args[0]` pattern `build.ts`
 * uses) because `pack` has a real option — `--out` — that needs
 * value-parsing and strict validation. `init.ts` uses the same library
 * for the same reason.
 */
export async function handlePackCommand(args: string[]): Promise<void> {
    if (args.includes("--help") || args.includes("-h")) {
        printPackHelp();
        return;
    }

    const { values, positionals } = parseArgs({
        args,
        options: {
            out: { type: "string" },
        },
        strict: true,
        allowPositionals: true,
    });

    const [dir] = positionals;
    if (dir === undefined) {
        throw new Error(
            "pack requires a directory argument. " +
            "Usage: store-manager-ext pack <dir> [--out <path>]",
        );
    }

    // `runPack` prints its own success message; its return value is
    // discarded here (fire-and-forget from the CLI's perspective).
    await runPack({ dir, out: values.out });
}

function printPackHelp(): void {
    console.log(
        [
            "Usage: store-manager-ext pack <dir> [options]",
            "",
            "Packages the built extension at <dir> into a .zip ready for",
            "upload to the store's admin submit page.",
            "",
            "Options:",
            "  --out=<path>    Output zip path (default: <dir>/<name>-<version>.zip)",
            "",
            "Requires the extension to have been built (dist/ must be present).",
            "",
            "Output structure:",
            "  manifest.json, index.js                    from dist/",
            "  source/package.json                        from extension root",
            "  source/tsconfig.json                       from extension root",
            "  source/src/**                              recursive walk of src/",
            "",
            "The source/ tree ships with every upload so the store's review",
            "process can inspect the code alongside the compiled artifact.",
        ].join("\n"),
    );
}