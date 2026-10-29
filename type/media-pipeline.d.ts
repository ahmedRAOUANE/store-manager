/**
 * Module augmentation for `media-pipeline@1.7.0`.
 *
 * `PipelineProvider` is a closed union that ships as `"local"` by
 * default — the library's design intentionally prevents typos like
 * `"r22"` from compiling silently. Adding a new provider name requires
 * this exact `declare module` block (see the library's integration
 * guide §6).
 *
 * What this enables:
 *   - `R2ArtifactStore.save()` returns `{ provider: "r2", ... }`. That
 *     literal is now assignable to `PipelineProvider`, so the store
 *     satisfies `media-pipeline`'s `Storage` type at compile time.
 *   - `createPipeline({ storage: r2Store })` typechecks without a
 *     manual cast at the call site.
 *
 * What this does NOT change:
 *   - The adapter stays self-contained — it does not import from
 *     `media-pipeline`. If the library is ever removed, the adapter
 *     still works (only this augmentation file becomes dead code).
 *   - If `media-pipeline` upgrades to 2.x with a different augmentation
 *     shape, this file updates; the adapter does not.
 *
 * The `import "media-pipeline"` at the top is required — without it,
 * the `declare module` block would be treated as a fresh ambient
 * module declaration rather than an augmentation of the installed one.
 */
import "media-pipeline";

declare module "media-pipeline" {
    interface PipelineProviders {
        r2: "r2";
    }
}

export { };