import { S3Client } from "@aws-sdk/client-s3";

import { R2ArtifactStore } from "./r2Storage";

/**
 * Lazy singleton for the R2 artifact store.
 *
 * Why lazy: importing `prisma/db.ts` at module scope is fine because
 * `DATABASE_URL` is required everywhere in the app. R2 credentials are
 * only required when someone actually submits an extension or (in C6)
 * installs one from the store. Requiring them at import time would
 * break every test and every dev run that doesn't touch extensions.
 *
 * Why a singleton: the S3Client holds a connection pool. Constructing
 * a new one per call would be wasteful and would leak sockets under
 * load. The single instance is reused across all requests in a
 * process, matching how `prisma/db.ts` reuses one postgres client.
 *
 * Env vars required on first use:
 *   R2_ACCOUNT_ID        Cloudflare account ID
 *   R2_ACCESS_KEY_ID     R2 access key (from Cloudflare dashboard)
 *   R2_SECRET_ACCESS_KEY R2 secret key
 *   R2_BUCKET            Bucket name
 * Optional:
 *   R2_PUBLIC_URL_BASE   CDN prefix for `PipelineResult.url`
 *                        (defaults to `r2://<bucket>`)
 */

let _store: R2ArtifactStore | null = null;

export function getR2ArtifactStore(): R2ArtifactStore {
    if (_store) return _store;

    const accountId = requiredEnv("R2_ACCOUNT_ID");
    const accessKeyId = requiredEnv("R2_ACCESS_KEY_ID");
    const secretAccessKey = requiredEnv("R2_SECRET_ACCESS_KEY");
    const bucket = requiredEnv("R2_BUCKET");
    const publicUrlBase = process.env["R2_PUBLIC_URL_BASE"];

    const client = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
    });

    _store = new R2ArtifactStore({
        client,
        bucket,
        ...(publicUrlBase ? { publicUrlBase } : {}),
    });

    return _store;
}

/**
 * Reset the cached store. Test-only — allows tests to swap in a
 * different set of env vars between cases, or to clear state after
 * simulating a full submission.
 */
export function __resetR2ArtifactStoreForTests(): void {
    _store = null;
}

function requiredEnv(name: string): string {
    const value = process.env[name];
    if (!value || value.length === 0) {
        throw new Error(
            `Missing required env var "${name}". ` +
            `Extension submission and store install require Cloudflare R2 configuration. ` +
            `See .env.example for the full list of R2_* variables.`,
        );
    }
    return value;
}