import { describe, it, expect, vi } from "vitest";

import type { S3Client } from "@aws-sdk/client-s3";
import {
    R2ArtifactStore,
    R2StorageError,
} from "../../lib/storage/r2Storage";

/**
 * Tests for the R2 adapter. The S3 client is mocked per test — a
 * hand-crafted `{ send: vi.fn() }` cast to `S3Client`. No `vi.mock`
 * on the module, no real network.
 *
 * What this covers:
 *   - save: PutObjectCommand shape, returned PipelineResult, URL form
 *   - read: body streaming, missing-body guard, error wrapping
 *   - delete: DeleteObjectCommand shape, error wrapping
 *   - provider literal: "r2"
 *
 * What this does NOT cover:
 *   - Real R2 behavior (credentials, bucket policies, region). That's
 *     covered by a separate manual smoke test against a live bucket.
 *   - `media-pipeline` integration (save called via pipeline.process).
 *     That ships when media-pipeline is installed.
 */

function makeMockSend() {
    return vi.fn();
}

function makeStore(overrides: Partial<{
    send: ReturnType<typeof vi.fn>;
    bucket: string;
    publicUrlBase: string;
}> = {}): { store: R2ArtifactStore; send: ReturnType<typeof vi.fn> } {
    const send = overrides.send ?? makeMockSend();
    const client = { send } as unknown as S3Client;
    const store = new R2ArtifactStore({
        client,
        bucket: overrides.bucket ?? "test-bucket",
        publicUrlBase: overrides.publicUrlBase,
    });
    return { store, send };
}

/* ========================================================================== */

describe("R2ArtifactStore.save", () => {
    it("sends a PutObjectCommand with the file's bytes", async () => {
        const { store, send } = makeStore();
        send.mockResolvedValueOnce({});

        const result = await store.save({
            buffer: Buffer.from("hello"),
            filename: "test-ext/1.0.0.zip",
            mimeType: "application/zip",
            size: 5,
        });

        expect(send).toHaveBeenCalledTimes(1);
        const cmd = send.mock.calls[0][0];
        expect(cmd.input.Bucket).toBe("test-bucket");
        expect(cmd.input.Key).toBe("test-ext/1.0.0.zip");
        expect(cmd.input.ContentType).toBe("application/zip");
        expect(cmd.input.ContentLength).toBe(5);
        expect(Buffer.isBuffer(cmd.input.Body)).toBe(true);
        expect((cmd.input.Body as Buffer).toString("utf-8")).toBe("hello");

        expect(result.path).toBe("test-ext/1.0.0.zip");
        expect(result.url).toBe("r2://test-bucket/test-ext/1.0.0.zip");
        expect(result.size).toBe(5);
        expect(result.originalName).toBe("test-ext/1.0.0.zip");
        expect(result.storedName).toBe("test-ext/1.0.0.zip");
        expect(result.mimeType).toBe("application/zip");
        expect(result.provider).toBe("r2");
        expect(result.metadata).toEqual({});
        expect(result.meta.plugins).toEqual([]);
        expect(result.meta.trace).toEqual([]);
    });

    it("uses publicUrlBase when provided", async () => {
        const { store, send } = makeStore({
            publicUrlBase: "https://cdn.example.com/artifacts",
        });
        send.mockResolvedValueOnce({});

        const result = await store.save({
            buffer: Buffer.from("x"),
            filename: "foo.zip",
            mimeType: "application/zip",
            size: 1,
        });

        expect(result.url).toBe(
            "https://cdn.example.com/artifacts/foo.zip",
        );
    });

    it("uses file.filename verbatim as the R2 key", async () => {
        // The adapter must not derive, sanitize, or prefix the key.
        // Key derivation is the caller's responsibility (a processor
        // when integrated with media-pipeline, or the service layer
        // otherwise).
        const { store, send } = makeStore();
        send.mockResolvedValueOnce({});

        await store.save({
            buffer: Buffer.from("x"),
            filename: "some/deeply/nested/key-v1.2.3.zip",
            mimeType: "application/zip",
            size: 1,
        });

        const cmd = send.mock.calls[0][0];
        expect(cmd.input.Key).toBe("some/deeply/nested/key-v1.2.3.zip");
    });

    it("throws R2StorageError when the S3 client rejects", async () => {
        const { store, send } = makeStore();
        send.mockRejectedValueOnce(
            Object.assign(new Error("network down"), {
                name: "NetworkingError",
            }),
        );

        await expect(
            store.save({
                buffer: Buffer.from("x"),
                filename: "foo.zip",
                mimeType: "application/zip",
                size: 1,
            }),
        ).rejects.toBeInstanceOf(R2StorageError);
    });

    it("preserves the error cause in details", async () => {
        const { store, send } = makeStore();
        send.mockRejectedValueOnce(
            Object.assign(new Error("disk full"), {
                name: "InternalError",
            }),
        );

        try {
            await store.save({
                buffer: Buffer.from("x"),
                filename: "foo.zip",
                mimeType: "application/zip",
                size: 1,
            });
        } catch (err) {
            expect(err).toBeInstanceOf(R2StorageError);
            const details = (err as R2StorageError).cause as Record<
                string,
                unknown
            >;
            expect(details.backend).toBe("r2");
            expect(details.errorName).toBe("InternalError");
            expect(details.errorMessage).toBe("disk full");
        }
    });
});

/* ========================================================================== */

describe("R2ArtifactStore.read", () => {
    it("returns the body as a Buffer (async-iterable stream)", async () => {
        const { store, send } = makeStore();

        // Simulate a Node.js Readable that yields Buffers.
        const stream = (async function* () {
            yield Buffer.from("hello ");
            yield Buffer.from("world");
        })();
        send.mockResolvedValueOnce({ Body: stream });

        const body = await store.read("test-ext/1.0.0.zip");
        expect(body.toString("utf-8")).toBe("hello world");
    });

    it("sends a GetObjectCommand with the exact key", async () => {
        const { store, send } = makeStore();
        const stream = (async function* () {
            yield Buffer.from("x");
        })();
        send.mockResolvedValueOnce({ Body: stream });

        await store.read("some/deeply/nested/key-v1.2.3.zip");

        const cmd = send.mock.calls[0][0];
        expect(cmd.input.Bucket).toBe("test-bucket");
        expect(cmd.input.Key).toBe("some/deeply/nested/key-v1.2.3.zip");
    });

    it("throws when Body is missing", async () => {
        const { store, send } = makeStore();
        send.mockResolvedValueOnce({ Body: undefined });

        await expect(store.read("foo.zip")).rejects.toBeInstanceOf(
            R2StorageError,
        );
    });

    it("throws R2StorageError when the S3 client rejects", async () => {
        const { store, send } = makeStore();
        send.mockRejectedValueOnce(
            Object.assign(new Error("not found"), { name: "NoSuchKey" }),
        );

        await expect(store.read("foo.zip")).rejects.toBeInstanceOf(
            R2StorageError,
        );
    });
});

/* ========================================================================== */

describe("R2ArtifactStore.delete", () => {
    it("sends a DeleteObjectCommand with the exact key", async () => {
        const { store, send } = makeStore();
        send.mockResolvedValueOnce({});

        await store.delete("test-ext/1.0.0.zip");

        expect(send).toHaveBeenCalledTimes(1);
        const cmd = send.mock.calls[0][0];
        expect(cmd.input.Bucket).toBe("test-bucket");
        expect(cmd.input.Key).toBe("test-ext/1.0.0.zip");
    });

    it("throws R2StorageError when the S3 client rejects", async () => {
        const { store, send } = makeStore();
        send.mockRejectedValueOnce(new Error("boom"));

        await expect(store.delete("foo.zip")).rejects.toBeInstanceOf(
            R2StorageError,
        );
    });

    it("resolves successfully when the client accepts", async () => {
        const { store, send } = makeStore();
        send.mockResolvedValueOnce({});

        await expect(store.delete("foo.zip")).resolves.toBeUndefined();
    });
});

/* ========================================================================== */

describe("R2ArtifactStore provider field", () => {
    it("returns provider: 'r2'", async () => {
        const { store, send } = makeStore();
        send.mockResolvedValueOnce({});

        const result = await store.save({
            buffer: Buffer.from("x"),
            filename: "foo.zip",
            mimeType: "application/zip",
            size: 1,
        });
        expect(result.provider).toBe("r2");
    });
});