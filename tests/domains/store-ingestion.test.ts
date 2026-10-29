import { describe, it, expect, afterEach, vi } from "vitest";
import { ZipFile } from "yazl";
import type { S3Client } from "@aws-sdk/client-s3";

import { models } from "../../prisma/db";
import { AppError } from "../../errors/base.error";
import { ValidationError } from "../../errors/validation.error";
import { DatabaseError } from "../../errors/db.error";
import {
    R2ArtifactStore,
    R2StorageError,
} from "../../lib/storage/r2Storage";
import { submitExtensionService } from "../../services/storeIngestion.services";

/* ==========================================================================
 * Fixtures
 * ========================================================================== */

/**
 * Shared owner + admin — matches the convention used across all other
 * domain tests. Assumed to exist in the dev DB.
 */
const adminId = "52b45375-ce27-4859-8839-d991d3634330";

const createdExtensionIds: string[] = [];

function trackExtension(id: string): void {
    createdExtensionIds.push(id);
}

afterEach(async () => {
    for (const id of createdExtensionIds) {
        await models.ExtensionVersion
            .where({ extensionId: id })
            .deleteAll();
        await models.Extension.where({ id }).delete();
    }
    createdExtensionIds.length = 0;
});

async function buildZip(
    files: Record<string, string | Buffer>,
): Promise<Buffer> {
    const zip = new ZipFile();
    const bufferPromise = new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        zip.outputStream.on("data", (chunk: Buffer) => chunks.push(chunk));
        zip.outputStream.on("end", () => resolve(Buffer.concat(chunks)));
        zip.outputStream.on("error", reject);
    });
    for (const [name, content] of Object.entries(files)) {
        zip.addBuffer(
            Buffer.isBuffer(content)
                ? content
                : Buffer.from(content, "utf-8"),
            name,
        );
    }
    zip.end();
    return bufferPromise;
}

function validManifest(
    id: string,
    version: string,
    overrides: Record<string, unknown> = {},
): Record<string, unknown> {
    return {
        id,
        version,
        name: "Test Extension",
        author: { name: "Test Author" },
        scope: "user",
        eligibility: { minimumGlobalRole: "USER" },
        libraryVersion: "^1.0.0",
        capabilities: {
            "db.read": false,
            "db.write": false,
            "storage.read": false,
            "storage.write": false,
            "notifications.publish": [],
            "http.fetch": [],
            "logs.write": false,
        },
        hooks: ["product.created"],
        tables: {},
        notifications: {},
        translations: {
            en: { notifications: {} },
            ar: { notifications: {} },
        },
        ...overrides,
    };
}

async function buildValidZip(
    id: string,
    version: string,
    overrides: Record<string, unknown> = {},
): Promise<Buffer> {
    return buildZip({
        "manifest.json": JSON.stringify(validManifest(id, version, overrides)),
        "index.js": "export default { hooks: {}, notifications: {} };",
    });
}

function makeStore(): {
    store: R2ArtifactStore;
    send: ReturnType<typeof vi.fn>;
} {
    const send = vi.fn().mockResolvedValue({});
    const client = { send } as unknown as S3Client;
    const store = new R2ArtifactStore({
        client,
        bucket: "test-bucket",
        publicUrlBase: "https://cdn.example.com/artifacts",
    });
    return { store, send };
}

/* ==========================================================================
 * Happy path
 * ========================================================================== */

describe("submitExtensionService — happy path", () => {
    it("creates Extension + ExtensionVersion rows with status pending", async () => {
        const extId = `test-ingest-${crypto.randomUUID().slice(0, 8)}`;
        trackExtension(extId);

        const zip = await buildValidZip(extId, "1.0.0");
        const { store, send } = makeStore();

        const result = await submitExtensionService(
            { buffer: zip, filename: "upload.zip", submittedById: adminId },
            store,
        );

        expect(result).not.toBeInstanceOf(AppError);
        if (result instanceof AppError) return;

        expect(result.extensionId).toBe(extId);
        expect(result.version).toBe("1.0.0");
        expect(result.artifactUrl).toBe(
            `https://cdn.example.com/artifacts/${extId}/1.0.0.zip`,
        );
        expect(result.artifactChecksum).toMatch(/^sha256:[a-f0-9]{64}$/);
        expect(result.versionId).toBeDefined();

        // Verify DB state.
        const ext = await models.Extension
            .where({ id: extId })
            .first();
        expect(ext).not.toBeNull();
        expect(ext!.name).toBe("Test Extension");
        expect(ext!.authorName).toBe("Test Author");

        const version = await models.ExtensionVersion
            .where({ id: result.versionId })
            .first();
        expect(version).not.toBeNull();
        expect(version!.status).toBe("pending");
        expect(version!.submittedById).toBe(adminId);
        expect(version!.artifactUrl).toBe(result.artifactUrl);
        expect(version!.artifactChecksum).toBe(result.artifactChecksum);
        expect(version!.reviewedById).toBeNull();
        expect(version!.reviewedAt).toBeNull();

        // R2 received exactly one PutObject call with the derived key.
        expect(send).toHaveBeenCalledTimes(1);
        const cmd = send.mock.calls[0][0];
        expect(cmd.input.Key).toBe(`${extId}/1.0.0.zip`);
    });

    it("reuses existing Extension on second version of the same extension", async () => {
        const extId = `test-ingest-${crypto.randomUUID().slice(0, 8)}`;
        trackExtension(extId);

        const { store } = makeStore();

        const v1 = await submitExtensionService(
            {
                buffer: await buildValidZip(extId, "1.0.0"),
                filename: "upload.zip",
                submittedById: adminId,
            },
            store,
        );
        expect(v1).not.toBeInstanceOf(AppError);

        const v2 = await submitExtensionService(
            {
                buffer: await buildValidZip(extId, "1.1.0"),
                filename: "upload.zip",
                submittedById: adminId,
            },
            store,
        );
        expect(v2).not.toBeInstanceOf(AppError);

        // Only one Extension row exists.
        const extensions = await models.Extension
            .where({ id: extId })
            .all();
        expect(extensions).toHaveLength(1);

        // Both versions exist.
        const versions = await models.ExtensionVersion
            .where({ extensionId: extId })
            .all();
        expect(versions).toHaveLength(2);
    });
});

/* ==========================================================================
 * Rejection paths — expected user errors (returned as AppError)
 * ========================================================================== */

describe("submitExtensionService — validation rejections", () => {
    it("rejects an empty buffer", async () => {
        const { store } = makeStore();
        const result = await submitExtensionService(
            {
                buffer: Buffer.alloc(0),
                filename: "empty.zip",
                submittedById: adminId,
            },
            store,
        );
        expect(result).toBeInstanceOf(ValidationError);
        expect((result as ValidationError).message).toMatch(/empty/);
    });

    it("rejects a buffer exceeding the size cap", async () => {
        const { store } = makeStore();
        // 4.6 MB — one byte over the 4.5 MB cap.
        const buffer = Buffer.alloc(Math.ceil(4.5 * 1024 * 1024) + 1);
        const result = await submitExtensionService(
            { buffer, filename: "big.zip", submittedById: adminId },
            store,
        );
        expect(result).toBeInstanceOf(ValidationError);
        expect((result as ValidationError).message).toMatch(/exceeds/);
    });

    it("rejects a non-zip buffer", async () => {
        const { store } = makeStore();
        const result = await submitExtensionService(
            {
                buffer: Buffer.from("not a zip"),
                filename: "x.zip",
                submittedById: adminId,
            },
            store,
        );
        expect(result).toBeInstanceOf(ValidationError);
    });

    it("rejects a zip without manifest.json", async () => {
        const zip = await buildZip({ "index.js": "export default {};" });
        const { store } = makeStore();
        const result = await submitExtensionService(
            { buffer: zip, filename: "x.zip", submittedById: adminId },
            store,
        );
        expect(result).toBeInstanceOf(ValidationError);
        expect((result as ValidationError).message).toMatch(
            /missing manifest\.json/,
        );
    });

    it("rejects a manifest.json that is not valid JSON", async () => {
        const zip = await buildZip({
            "manifest.json": "{ not json",
        });
        const { store } = makeStore();
        const result = await submitExtensionService(
            { buffer: zip, filename: "x.zip", submittedById: adminId },
            store,
        );
        expect(result).toBeInstanceOf(ValidationError);
        expect((result as ValidationError).message).toMatch(
            /not valid JSON/,
        );
    });

    it("rejects a manifest that fails ManifestSchema", async () => {
        const extId = `test-ingest-${crypto.randomUUID().slice(0, 8)}`;
        trackExtension(extId);

        // Invalid: extension ID is uppercase.
        const zip = await buildValidZip(extId, "1.0.0", {
            id: extId.toUpperCase(),
        });
        const { store } = makeStore();
        const result = await submitExtensionService(
            { buffer: zip, filename: "x.zip", submittedById: adminId },
            store,
        );
        expect(result).toBeInstanceOf(ValidationError);
        expect((result as ValidationError).message).toMatch(
            /invalid manifest/,
        );
    });

    it("rejects duplicate (extensionId, version) without touching R2", async () => {
        const extId = `test-ingest-${crypto.randomUUID().slice(0, 8)}`;
        trackExtension(extId);

        const { store, send } = makeStore();

        const first = await submitExtensionService(
            {
                buffer: await buildValidZip(extId, "1.0.0"),
                filename: "upload.zip",
                submittedById: adminId,
            },
            store,
        );
        expect(first).not.toBeInstanceOf(AppError);

        // Reset the send spy so we can check the second call.
        send.mockClear();

        const second = await submitExtensionService(
            {
                buffer: await buildValidZip(extId, "1.0.0"),
                filename: "upload.zip",
                submittedById: adminId,
            },
            store,
        );

        expect(second).toBeInstanceOf(AppError);
        expect((second as AppError).message).toMatch(/already exists/);
        // R2 was not called on the duplicate path.
        expect(send).not.toHaveBeenCalled();
    });
});

/* ==========================================================================
 * Rejection paths — unexpected failures (thrown, not returned)
 * ========================================================================== */

describe("submitExtensionService — infrastructure failures", () => {
    it("throws R2StorageError when R2 rejects the upload", async () => {
        const extId = `test-ingest-${crypto.randomUUID().slice(0, 8)}`;
        trackExtension(extId);

        const send = vi.fn().mockRejectedValueOnce(
            Object.assign(new Error("S3 unavailable"), {
                name: "ServiceUnavailable",
            }),
        );
        const client = { send } as unknown as S3Client;
        const store = new R2ArtifactStore({
            client,
            bucket: "test-bucket",
        });

        const zip = await buildValidZip(extId, "1.0.0");

        await expect(
            submitExtensionService(
                { buffer: zip, filename: "upload.zip", submittedById: adminId },
                store,
            ),
        ).rejects.toBeInstanceOf(R2StorageError);

        // No DB rows created.
        const ext = await models.Extension.where({ id: extId }).first();
        expect(ext).toBeNull();
        const versions = await models.ExtensionVersion
            .where({ extensionId: extId })
            .all();
        expect(versions).toHaveLength(0);
    });

    it("throws DatabaseError when the FK target user does not exist", async () => {
        const extId = `test-ingest-${crypto.randomUUID().slice(0, 8)}`;
        trackExtension(extId);

        const { store } = makeStore();
        const zip = await buildValidZip(extId, "1.0.0");
        const fakeUserId = crypto.randomUUID(); // no such user

        await expect(
            submitExtensionService(
                {
                    buffer: zip,
                    filename: "upload.zip",
                    submittedById: fakeUserId,
                },
                store,
            ),
        ).rejects.toBeInstanceOf(DatabaseError);

        // Orphan R2 object is expected per media-pipeline §12 —
        // this test doesn't verify cleanup, only that the DB was
        // not left in a partial state.
        const versions = await models.ExtensionVersion
            .where({ extensionId: extId })
            .all();
        expect(versions).toHaveLength(0);
    });
});