import {
    describe,
    it,
    expect,
    beforeAll,
    afterAll,
    beforeEach,
    afterEach,
    vi,
} from "vitest";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

// ─── Mocks (hoisted above all imports) ─────────────────────────────────
//
// `getCurrentUser` is mocked so the test controls who the "session"
// is. `getR2ArtifactStore` is mocked so we can inspect PutObject
// calls and avoid needing real R2 credentials. Nothing else is mocked
// — the auth wrappers, the service, the zip extraction, and the DB
// all run for real.
vi.mock("@/access/context", () => ({
    getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/storage/r2Client", () => ({
    getR2ArtifactStore: vi.fn(),
    __resetR2ArtifactStoreForTests: vi.fn(),
}));

// ─── Imports (after mocks) ─────────────────────────────────────────────
import type { S3Client } from "@aws-sdk/client-s3";
import { getCurrentUser } from "../../access/context";
import { getR2ArtifactStore } from "../../lib/storage/r2Client";
// import { submitExtension } from "../actions/store.actions";
import { submitExtension } from "../../actions/extensionsStore.actions";
import { runInit } from "../../extensions/library/src/cli/init";
import { runPack } from "../../extensions/library/src/cli/pack";
import { models } from "../../prisma/db";
import { R2ArtifactStore } from "../../lib/storage/r2Storage";
import {
    AuthenticationError,
    AuthorizationError,
} from "../../errors/auth.error";

/* ==========================================================================
 * Fixtures
 * ========================================================================== */

const mockedGetCurrentUser = vi.mocked(getCurrentUser);
const mockedGetR2ArtifactStore = vi.mocked(getR2ArtifactStore);

const createdDirs: string[] = [];
const createdExtensionIds: string[] = [];
let adminUser: Awaited<ReturnType<typeof models.User.create>>;
let mockSend: ReturnType<typeof vi.fn>;

/**
 * Manifest matching what `store-manager-ext build` produces for a
 * scaffolded user-scope extension. Must pass `ManifestSchema`.
 */
function makeValidManifest(extId: string, version: string) {
    return {
        id: extId,
        version,
        name: extId,
        author: { name: "Test Author" },
        scope: "user" as const,
        eligibility: { minimumGlobalRole: "USER" as const },
        libraryVersion: "^1.0.0",
        capabilities: {
            "db.read": false,
            "db.write": false,
            "storage.read": false,
            "storage.write": false,
            "notifications.publish": [] as string[],
            "http.fetch": [] as string[],
            "logs.write": false,
        },
        hooks: ["product.created"] as const,
        tables: {},
        notifications: {},
        translations: {
            en: { notifications: {} },
            ar: { notifications: {} },
        },
        buildMetadata: {
            builtWith: "@store-manager/extensions@1.0.0",
            builtAt: new Date().toISOString(),
            artifactChecksum: "sha256:" + "0".repeat(64),
        },
    };
}

/**
 * Scaffold via `runInit`, simulate `build` by writing `dist/` directly
 * (fast — avoids the esbuild subprocess), then run the real `runPack`.
 * Returns the produced zip bytes, exactly as a developer would upload.
 */
async function buildAndPackFixture(
    extId: string,
    version = "1.0.0",
): Promise<Buffer> {
    const root = await mkdtemp(join(tmpdir(), "rt-fixture-"));
    createdDirs.push(root);
    const target = join(root, extId);

    await runInit({
        targetDir: target,
        name: extId,
        version,
        description: "round-trip test",
        author: "Test Author",
        scope: "user",
    });

    await mkdir(join(target, "dist"), { recursive: true });
    await writeFile(
        join(target, "dist", "manifest.json"),
        JSON.stringify(makeValidManifest(extId, version), null, 2),
        "utf-8",
    );
    await writeFile(
        join(target, "dist", "index.js"),
        "export default { hooks: { 'product.created': async () => {} }, notifications: {} };",
        "utf-8",
    );

    const result = await runPack({ dir: target });
    return readFile(result.outputPath);
}

function makeFormData(
    zipBuffer: Buffer,
    filename = "upload.zip",
): FormData {
    const fd = new FormData();
    const zipBytes = new Uint8Array(zipBuffer);
    fd.set(
        "file",
        new File([zipBytes], filename, { type: "application/zip" }),
    );
    return fd;
}

/* ==========================================================================
 * Setup / teardown
 * ========================================================================== */

beforeAll(async () => {
    // A real admin row — required because the FK constraint on
    // `ExtensionVersion.submittedById` references `user.id`. The mock
    // of `getCurrentUser` returns this row, so the action's service
    // call writes `submittedById = adminUser.id` and the FK is valid.
    adminUser = await models.User.create({
        kindeId: `rt-admin-${crypto.randomUUID()}`,
        email: `rt-admin-${crypto.randomUUID()}@test.local`,
        firstName: "Round",
        lastName: "Trip",
        globalRole: "ADMIN",
    });

    mockSend = vi.fn().mockResolvedValue({});
    const mockStore = new R2ArtifactStore({
        client: { send: mockSend } as unknown as S3Client,
        bucket: "test-bucket",
        publicUrlBase: "https://cdn.example.com/artifacts",
    });
    mockedGetR2ArtifactStore.mockReturnValue(mockStore);
});

beforeEach(() => {
    // Default session: the admin from beforeAll. Overridden per-test
    // for auth-failure cases.
    mockedGetCurrentUser.mockResolvedValue(adminUser);
    mockSend.mockClear();
});

afterEach(async () => {
    for (const extId of createdExtensionIds) {
        await models.ExtensionVersion
            .where({ extensionId: extId })
            .deleteAll();
        await models.Extension.where({ id: extId }).delete();
    }
    createdExtensionIds.length = 0;

    for (const dir of createdDirs) {
        try {
            await rm(dir, { recursive: true, force: true });
        } catch {
            // temp dirs — cleanup is best-effort
        }
    }
    createdDirs.length = 0;
});

afterAll(async () => {
    await models.User.where({ id: adminUser.id }).delete();
});

/* ==========================================================================
 * Round-trip tests
 * ========================================================================== */

describe("submitExtension — round-trip (pack → action → service → DB)", () => {
    it("submits a packed zip end-to-end and creates a pending version", async () => {
        const extId = `rt-${crypto.randomUUID().slice(0, 8)}`;
        createdExtensionIds.push(extId);

        const zipBuffer = await buildAndPackFixture(extId);
        const result = await submitExtension(makeFormData(zipBuffer));

        expect(result.ok).toBe(true);
        if (!result.ok) return;

        expect(result.extensionId).toBe(extId);
        expect(result.version).toBe("1.0.0");

        // Extension catalog row — created by the action's service call.
        const ext = await models.Extension.where({ id: extId }).first();
        expect(ext).not.toBeNull();
        expect(ext!.name).toBe(extId);
        expect(ext!.authorName).toBe("Test Author");

        // ExtensionVersion — the C5 review queue's pending row.
        const version = await models.ExtensionVersion
            .where({ id: result.versionId })
            .first();
        expect(version).not.toBeNull();
        expect(version!.status).toBe("pending");
        expect(version!.submittedById).toBe(adminUser.id);
        expect(version!.reviewedById).toBeNull();
        expect(version!.reviewedAt).toBeNull();
        expect(version!.artifactUrl).toBe(
            `https://cdn.example.com/artifacts/${extId}/1.0.0.zip`,
        );
        expect(version!.artifactChecksum).toMatch(/^sha256:[a-f0-9]{64}$/);

        // R2 received exactly one PutObject call, with the derived key.
        expect(mockSend).toHaveBeenCalledTimes(1);
        const cmd = mockSend.mock.calls[0][0];
        expect(cmd.input.Bucket).toBe("test-bucket");
        expect(cmd.input.Key).toBe(`${extId}/1.0.0.zip`);
        expect(Buffer.isBuffer(cmd.input.Body)).toBe(true);
    });

    it("returns ok:false for a non-zip filename", async () => {
        const fd = new FormData();
        fd.set(
            "file",
            new File([Buffer.from("hello")], "test.txt", {
                type: "text/plain",
            }),
        );

        const result = await submitExtension(fd);

        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.message).toMatch(/Only \.zip/);

        // R2 was never touched — the extraction rejected the file first.
        expect(mockSend).not.toHaveBeenCalled();
    });

    it("returns ok:false for a duplicate (extensionId, version)", async () => {
        const extId = `rt-${crypto.randomUUID().slice(0, 8)}`;
        createdExtensionIds.push(extId);

        const zipBuffer = await buildAndPackFixture(extId);

        const first = await submitExtension(makeFormData(zipBuffer));
        expect(first.ok).toBe(true);

        // Reset the mock so the second call's "no R2 upload" assertion
        // is unambiguous.
        mockSend.mockClear();

        const second = await submitExtension(makeFormData(zipBuffer));
        expect(second.ok).toBe(false);
        if (second.ok) return;
        expect(second.message).toMatch(/already exists/);

        // The service's duplicate pre-check fires before R2 upload.
        expect(mockSend).not.toHaveBeenCalled();
    });

    it("throws AuthenticationError when the user is unauthenticated", async () => {
        mockedGetCurrentUser.mockResolvedValueOnce(new AuthenticationError());

        const extId = `rt-${crypto.randomUUID().slice(0, 8)}`;
        createdExtensionIds.push(extId);
        const zipBuffer = await buildAndPackFixture(extId);

        await expect(
            submitExtension(makeFormData(zipBuffer)),
        ).rejects.toBeInstanceOf(AuthenticationError);

        // No DB writes for an auth failure — the wrapper throws before
        // the handler runs.
        const ext = await models.Extension.where({ id: extId }).first();
        expect(ext).toBeNull();
    });

    it("throws AuthorizationError when the user is not an admin", async () => {
        const nonAdmin = { ...adminUser, globalRole: "USER" as const };
        mockedGetCurrentUser.mockResolvedValueOnce(nonAdmin);

        const extId = `rt-${crypto.randomUUID().slice(0, 8)}`;
        createdExtensionIds.push(extId);
        const zipBuffer = await buildAndPackFixture(extId);

        await expect(
            submitExtension(makeFormData(zipBuffer)),
        ).rejects.toBeInstanceOf(AuthorizationError);

        const ext = await models.Extension.where({ id: extId }).first();
        expect(ext).toBeNull();
    });
});