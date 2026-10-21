/**
 * Next.js boot hook. Runs once per server process (per runtime) before
 * the first request is served.
 *
 * The `NEXT_RUNTIME === "nodejs"` guard, combined with the dynamic
 * `import()`, is essential:
 *
 *   - The runner depends on `prisma/db.ts`, which uses Node-only APIs
 *     (`postgres`, `temporal-polyfill/global`). A static import at the
 *     top of this file would pull those into the edge-runtime build
 *     and fail the build.
 *
 *   - The edge runtime has no business starting a same-process runner
 *     that queries Postgres.
 *
 * In dev, Next reloads `instrumentation.ts` itself when it changes,
 * but does NOT re-run it on other file changes. A full server restart
 * is required to pick up changes to runner code. `startRunner()` has
 * its own idempotency guard for the case where `register()` is
 * somehow called twice.
 *
 * Errors during boot are logged but never re-thrown. A broken extension
 * or an unreachable database must not prevent the app from starting;
 * the runner falls back to "no extensions loaded", which is a valid
 * state for the rest of the app. Subsequent boots retry.
 */
export async function register(): Promise<void> {
    if (process.env.NEXT_RUNTIME !== "nodejs") {
        return;
    }

    try {
        const { startRunner } = await import("@/extensions/runner");
        await startRunner();
    } catch (error) {
        console.error(
            "[extensions] runner failed to start; continuing without extensions:",
            error,
        );
    }
}