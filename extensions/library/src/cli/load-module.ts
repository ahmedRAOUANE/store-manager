import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Dynamic import of a local `.ts` file, from the `tsx`-provided runtime.
 *
 * Node's ESM resolver requires `file://` URLs for absolute paths on
 * Windows, so we go through `pathToFileURL` even when the path is
 * already absolute. A monotonic counter is appended as a query string
 * to defeat module caching across repeated loads — every call is a
 * fresh module evaluation. Not strictly necessary today (the CLI
 * processes one build per invocation) but future-proofs against a
 * `--watch` mode, where the same file is re-imported repeatedly.
 *
 * The default export is returned directly. Files without a default
 * export throw with a message naming the file, since every `.ts` file
 * in a well-formed extension exports a default. The compiler's other
 * loaders (`loadTableDefinitions`, `loadNotificationDefinitions`) are
 * the sole callers and depend on this contract.
 */
let cacheBuster = 0;

export async function loadModuleDefault<T>(
    absPath: string,
): Promise<T> {
    const resolved = resolve(absPath);
    const url = `${pathToFileURL(resolved).href}?v=${++cacheBuster}`;
    const mod = (await import(url)) as { default?: T };
    if (mod.default === undefined) {
        throw new Error(`Module "${resolved}" has no default export`);
    }
    return mod.default;
}