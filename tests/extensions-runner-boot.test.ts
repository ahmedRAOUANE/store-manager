import { describe, it, expect, afterEach } from "vitest";

import { startRunner, stopRunner } from "../extensions/runner";

/**
 * Smoke test for the runner's boot path.
 *
 * This does not exercise the extension lifecycle — that's A7's job. It
 * only verifies:
 *
 *   1. `startRunner` completes successfully against the current DB
 *      state (which may be zero installs, or may have leftovers from
 *      other tests — either is a valid boot).
 *
 *   2. `stopRunner` is safe to call whether the runner started or not.
 *
 * The first assertion is the one that would catch a temporal-polyfill
 * regression: if `prisma/db.ts` stops importing
 * `temporal-polyfill/full/global`, the first query inside
 * `loadAllInstalled` throws during timestamp decoding, `startRunner`
 * rejects, and this test fails with a clear signal — instead of A7
 * failing for the same reason with much more setup noise.
 */
describe("runner boot", () => {
    afterEach(() => {
        stopRunner();
    });

    it("starts cleanly against the current DB state", async () => {
        await expect(startRunner()).resolves.toBeUndefined();
    });

    it("stopRunner on a not-started runner is safe", () => {
        // Explicitly not called startRunner here — afterEach from the
        // previous test already stopped it.
        expect(() => stopRunner()).not.toThrow();
    });
});