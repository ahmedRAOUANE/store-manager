import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { models } from "../../prisma/db";
import { ManifestSchema } from "@store-manager/extensions";
import { Temporal } from "temporal-polyfill";

/**
 * C1 migration verification — proves the four new ExtensionVersion
 * fields (artifactUrl, submittedById, reviewedById, reviewedAt) and the
 * two reverse relations on User are writable, readable, and queryable.
 *
 * Backward compatibility is proven by test 1: existing A4 install
 * creates work unchanged (all new fields nullable).
 */

const makeManifest = (extensionId: string, version: string) =>
    ManifestSchema.parse({
        id: extensionId,
        version,
        name: "Migration test ext",
        author: { name: "Test" },
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
    });

describe("ExtensionVersion submission/review migration", () => {
    const testExtId = `migration-test-${crypto.randomUUID().slice(0, 8)}`;
    let submitterId: string;
    let reviewerId: string;

    beforeAll(async () => {
        // Fresh users per run — matches the pattern in
        // tests/domains/notifications.test.ts. No FK conflicts because
        // these users own nothing else.
        const submitter = await models.User.create({
            kindeId: `migration-submit-${crypto.randomUUID()}`,
        });
        submitterId = submitter.id;

        const reviewer = await models.User.create({
            kindeId: `migration-review-${crypto.randomUUID()}`,
        });
        reviewerId = reviewer.id;

        await models.Extension.create({
            id: testExtId,
            name: "Migration test ext",
            authorName: "Test",
        });
    });

    afterAll(async () => {
        await models.ExtensionVersion
            .where({ extensionId: testExtId })
            .deleteAll();
        await models.Extension.where({ id: testExtId }).delete();
        await models.User.where({ id: submitterId }).delete();
        await models.User.where({ id: reviewerId }).delete();
    });

    it("accepts null for all new nullable fields (backward compatible)", async () => {
        // Exactly what data.test.ts and install.test.ts already do —
        // proving the migration doesn't break existing creates.
        const version = await models.ExtensionVersion.create({
            extensionId: testExtId,
            version: "1.0.0",
            manifest: makeManifest(testExtId, "1.0.0"),
            artifactPath: "/tmp/fake",
            artifactChecksum: "sha256:fake",
        });

        expect(version.artifactUrl).toBeNull();
        expect(version.submittedById).toBeNull();
        expect(version.reviewedById).toBeNull();
        expect(version.reviewedAt).toBeNull();
    });

    it("writes and reads new fields", async () => {
        const created = await models.ExtensionVersion.create({
            extensionId: testExtId,
            version: "1.1.0",
            manifest: makeManifest(testExtId, "1.1.0"),
            artifactPath: "/tmp/fake-2",
            artifactChecksum: "sha256:fake-2",
            artifactUrl: "r2://test-bucket/migration-test/1.1.0.zip",
            status: "pending",
            submittedById: submitterId,
            reviewedById: reviewerId,
            reviewedAt: Temporal.Instant.fromEpochMilliseconds(Date.now()),
        });

        const fetched = await models.ExtensionVersion
            .where({ id: created.id })
            .first();

        expect(fetched?.artifactUrl).toBe(
            "r2://test-bucket/migration-test/1.1.0.zip",
        );
        expect(fetched?.status).toBe("pending");
        expect(fetched?.submittedById).toBe(submitterId);
        expect(fetched?.reviewedById).toBe(reviewerId);
        expect(fetched?.reviewedAt).not.toBeNull();
    });

    it("reverse relations are queryable from User", async () => {
        // Prove both directions work — submission and review.
        const submitter = await models.User
            .where({ id: submitterId })
            .include("submittedVersions")
            .include("reviewedVersions")
            .first();

        expect(submitter?.submittedVersions).toHaveLength(1);
        expect(submitter?.submittedVersions[0].version).toBe("1.1.0");
        expect(submitter?.reviewedVersions).toHaveLength(0);

        const reviewer = await models.User
            .where({ id: reviewerId })
            .include("submittedVersions")
            .include("reviewedVersions")
            .first();

        expect(reviewer?.submittedVersions).toHaveLength(0);
        expect(reviewer?.reviewedVersions).toHaveLength(1);
        expect(reviewer?.reviewedVersions[0].version).toBe("1.1.0");
    });

    it("status is queryable", async () => {
        // Preps C5's review queue — .where({ status: "pending" }).
        const pending = await models.ExtensionVersion
            .where({ extensionId: testExtId, status: "pending" })
            .all();

        const approved = await models.ExtensionVersion
            .where({ extensionId: testExtId, status: "approved" })
            .all();

        expect(pending).toHaveLength(1);
        expect(pending[0].version).toBe("1.1.0");
        expect(approved).toHaveLength(1);
        expect(approved[0].version).toBe("1.0.0");
    });
});