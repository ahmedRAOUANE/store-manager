import { describe, it, expect } from "vitest";
import { ZipFile } from "yazl";
import { inspectZip } from "../../utils/zip-extract";
import { ValidationError } from "../../errors/validation.error";

/**
 * Build a zip buffer from a spec: { "path/to/file": "content" }.
 * Directories are implicit in path structure — no explicit dir entries.
 */
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
            Buffer.isBuffer(content) ? content : Buffer.from(content, "utf-8"),
            name,
        );
    }
    zip.end();

    return bufferPromise;
}

/**
 * CRC32 (IEEE 802.3) — needed to build a valid STORED-entry zip
 * byte-by-byte. yauzl verifies CRCs, so this cannot be faked.
 */
function crc32(buf: Buffer): number {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
        crc = crc ^ buf[i];
        for (let k = 0; k < 8; k++) {
            crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
        }
    }
    return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Hand-build a minimal single-entry zip. Needed for tests that verify
 * rejection of malicious entry names — yazl (the safe builder) refuses
 * to create them, so we bypass it and emit raw zip bytes.
 *
 * Produces a valid STORED (uncompressed) zip with one entry. Structure:
 *   - Local file header (30 bytes) + name + content
 *   - Central directory entry (46 bytes) + name
 *   - End of central directory (22 bytes)
 */
function makeMinimalZip(
    entryName: string,
    content: Buffer = Buffer.from("x"),
): Buffer {
    const nameBuf = Buffer.from(entryName, "utf-8");
    const crc = crc32(content);

    // Local file header
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // signature
    local.writeUInt16LE(20, 4);         // version needed
    local.writeUInt16LE(0, 6);          // flags
    local.writeUInt16LE(0, 8);          // compression: stored
    local.writeUInt16LE(0, 10);         // mod time
    local.writeUInt16LE(0, 12);         // mod date
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(content.length, 18); // compressed size
    local.writeUInt32LE(content.length, 22); // uncompressed size
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28); // extra field length

    // Central directory entry
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); // signature
    central.writeUInt16LE(20, 4);         // version made by
    central.writeUInt16LE(20, 6);         // version needed
    central.writeUInt16LE(0, 8);          // flags
    central.writeUInt16LE(0, 10);         // compression
    central.writeUInt16LE(0, 12);         // mod time
    central.writeUInt16LE(0, 14);         // mod date
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(content.length, 20);
    central.writeUInt32LE(content.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30); // extra field length
    central.writeUInt16LE(0, 32); // comment length
    central.writeUInt16LE(0, 34); // disk number
    central.writeUInt16LE(0, 36); // internal attrs
    central.writeUInt32LE(0, 38); // external attrs
    central.writeUInt32LE(0, 42); // offset of local header

    const localSize = local.length + nameBuf.length + content.length;
    const centralSize = central.length + nameBuf.length;

    // End of central directory
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0); // signature
    eocd.writeUInt16LE(0, 4);          // disk number
    eocd.writeUInt16LE(0, 6);          // central dir start disk
    eocd.writeUInt16LE(1, 8);          // entries on disk
    eocd.writeUInt16LE(1, 10);         // total entries
    eocd.writeUInt32LE(centralSize, 12);
    eocd.writeUInt32LE(localSize, 16); // offset to central dir
    eocd.writeUInt16LE(0, 20);         // comment length

    return Buffer.concat([
        local,
        nameBuf,
        content,
        central,
        nameBuf,
        eocd,
    ]);
}

const VALID_FILES: Record<string, string> = {
    "manifest.json": JSON.stringify({
        id: "test-ext",
        version: "1.0.0",
        name: "Test Extension",
    }),
    "index.js": "export default { hooks: {}, notifications: {} };",
    "source/package.json": JSON.stringify({ name: "test-ext" }),
};

describe("inspectZip", () => {
    describe("accepts valid zips", () => {
        it("returns entry metadata for a minimal valid zip", async () => {
            const zip = await inspectZip(await buildZip(VALID_FILES));
            try {
                expect(zip.entries).toHaveLength(3);
                expect(zip.entries.map((e) => e.fileName).sort()).toEqual([
                    "index.js",
                    "manifest.json",
                    "source/package.json",
                ]);
                expect(zip.totalBytes).toBeGreaterThan(0);
            } finally {
                zip.close();
            }
        });

        it("readFile returns the exact bytes of an entry", async () => {
            const zip = await inspectZip(await buildZip(VALID_FILES));
            try {
                const manifest = await zip.readFile("manifest.json");
                const parsed = JSON.parse(manifest.toString("utf-8"));
                expect(parsed.id).toBe("test-ext");
                expect(parsed.version).toBe("1.0.0");
            } finally {
                zip.close();
            }
        });

        it("identifies directory entries", async () => {
            const zip = await inspectZip(
                makeMinimalZip("source/", Buffer.alloc(0)),
            );
            try {
                const dir = zip.entries.find(
                    (e) => e.fileName === "source/",
                );
                expect(dir?.isDirectory).toBe(true);
            } finally {
                zip.close();
            }
        });

        it("close is idempotent", async () => {
            const zip = await inspectZip(await buildZip(VALID_FILES));
            expect(() => {
                zip.close();
                zip.close();
            }).not.toThrow();
        });
    });

    describe("rejects structural problems", () => {
        it("rejects a non-zip buffer", async () => {
            await expect(
                inspectZip(Buffer.from("this is not a zip file")),
            ).rejects.toBeInstanceOf(ValidationError);
        });

        it("rejects an empty zip", async () => {
            await expect(
                inspectZip(await buildZip({})),
            ).rejects.toThrow(/contains no entries/);
        });

        it("rejects a missing entry on readFile", async () => {
            const zip = await inspectZip(await buildZip(VALID_FILES));
            try {
                await expect(
                    zip.readFile("does-not-exist.json"),
                ).rejects.toThrow(/not found in zip/);
            } finally {
                zip.close();
            }
        });
    });

    describe("rejects unsafe entry names", () => {
        it("rejects path traversal in entry name", async () => {
            let error: unknown;
            try {
                await inspectZip(makeMinimalZip("../etc/passwd"));
            } catch (err) {
                error = err;
            }
            expect(error).toBeInstanceOf(ValidationError);
            // Either our `validateEntry` (path traversal segment check)
            // or yauzl's internal `invalid relative path` check may
            // fire. Both are safe rejections. This test asserts the
            // security property ("rejected") without coupling to which
            // layer caught it.
            expect((error as Error).message).toMatch(
                /path traversal|invalid relative path/,
            );
        });

        it("rejects absolute Unix paths", async () => {
            await expect(
                inspectZip(makeMinimalZip("/etc/passwd")),
            ).rejects.toThrow(/absolute path/);
        });

        it("rejects absolute Windows paths", async () => {
            let error: unknown;
            try {
                await inspectZip(makeMinimalZip("C:/Windows/System32"));
            } catch (err) {
                error = err;
            }
            expect(error).toBeInstanceOf(ValidationError);
            // yauzl rejects drive-prefixed paths before our
            // `validateEntry` sees the entry. Accept either wording.
            expect((error as Error).message).toMatch(
                /absolute Windows path|absolute path/,
            );
        });

        it("normalizes backslashes to forward slashes on Windows", async () => {
            // yauzl converts '\' to '/' on Windows before our own
            // `validateEntry` check runs. The entry name never
            // contains a raw backslash downstream — the normalization
            // is itself the mitigation. On Linux/macOS, yauzl may not
            // normalize and our own backslash check would fire
            // instead; either behavior is safe.
            const zip = await inspectZip(
                makeMinimalZip("source\\package.json"),
            );
            try {
                for (const entry of zip.entries) {
                    expect(entry.fileName).not.toContain("\\");
                }
            } finally {
                zip.close();
            }
        });
    });

    describe("rejects when limits are exceeded", () => {
        it("rejects when entry count exceeds limit", async () => {
            const files: Record<string, string> = {};
            for (let i = 0; i < 10; i++) {
                files[`file-${i}.txt`] = "x";
            }
            await expect(
                inspectZip(await buildZip(files), { maxEntries: 5 }),
            ).rejects.toThrow(/too many entries/);
        });

        it("rejects when total uncompressed size exceeds limit", async () => {
            await expect(
                inspectZip(
                    await buildZip({ "big.txt": "x".repeat(1000) }),
                    { maxTotalBytes: 500 },
                ),
            ).rejects.toThrow(/exceeds total size limit/);
        });

        it("rejects when a single file exceeds per-file limit", async () => {
            await expect(
                inspectZip(
                    await buildZip({ "big.txt": "x".repeat(1000) }),
                    { maxFileBytes: 500 },
                ),
            ).rejects.toThrow(/declares .* bytes \(max 500\)/);
        });
    });

    // Symlink rejection is not tested here because `yazl` does not
    // provide a public API for constructing symlink entries. The
    // check is exercised in production whenever a genuinely
    // symlinked zip reaches ingestion. If this becomes a common case,
    // add a pre-built base64 fixture with an S_IFLNK entry.
});