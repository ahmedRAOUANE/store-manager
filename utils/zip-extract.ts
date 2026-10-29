import yauzl from "yauzl";
import { ValidationError } from "@/errors/validation.error";

/**
 * Safe zip inspection — the only place in the app that opens arbitrary
 * user-supplied zips.
 *
 * Security posture:
 *   - Rejects path traversal (".."), absolute paths (Unix + Windows),
 *     Windows separators, null bytes, symlinks, and encrypted entries.
 *   - Enforces total-bytes, entry-count, and per-file limits BEFORE
 *     any decompression happens (via the zip's central directory).
 *   - Enforces the per-file limit AGAIN during read — a zip can lie
 *     about `uncompressedSize` in its central directory to bypass the
 *     pre-check. Streaming counter catches that.
 *
 * Extraction posture:
 *   - Never writes to the filesystem. Entries are inspected in memory.
 *   - `readFile(name)` extracts a specific entry into a Buffer.
 *   - `close()` releases the underlying file handle; caller must invoke
 *     it in a `finally` block.
 *
 * What this file does NOT do:
 *   - Validate extension-specific structure (required files, manifest
 *     schema). That's `storeIngestion.services.ts`'s concern.
 *   - Extract everything to disk. C2 (AST analysis) will add a
 *     `extractTo(dir)` mode; C1 only needs the manifest in memory.
 */

interface ZipLimits {
    maxTotalBytes: number;
    maxEntries: number;
    maxFileBytes: number;
}

const DEFAULT_LIMITS: ZipLimits = {
    maxTotalBytes: 20 * 1024 * 1024, // 20 MB — matches C1-D6
    maxEntries: 1000,                // matches C1-D6
    maxFileBytes: 10 * 1024 * 1024,  // per-file cap for decompression-bomb defense
};

export interface ZipEntryInfo {
    readonly fileName: string;
    readonly uncompressedSize: number;
    readonly isDirectory: boolean;
}

export interface InspectedZip {
    readonly entries: readonly ZipEntryInfo[];
    readonly totalBytes: number;

    /**
     * Read the full content of a single entry into a Buffer.
     *
     * Rejects if the entry does not exist, its declared size exceeds
     * `maxFileBytes`, or its actual decompressed size exceeds
     * `maxFileBytes` mid-stream (defense against lying central
     * directories).
     */
    readFile(name: string): Promise<Buffer>;

    /**
     * Release the underlying file handle. Idempotent — calling twice
     * is safe. Caller must invoke this in a `finally` block.
     */
    close(): void;
}

export async function inspectZip(
    buffer: Buffer,
    limits: Partial<ZipLimits> = {},
): Promise<InspectedZip> {
    const effectiveLimits: ZipLimits = { ...DEFAULT_LIMITS, ...limits };

    const zipFile = await openZipBuffer(buffer);

    let closed = false;
    const closeOnce = (): void => {
        if (!closed) {
            closed = true;
            zipFile.close();
        }
    };

    try {
        // Collect all entries via the 'entry' event. This is the
        // version-stable pattern — independent of whether yauzl
        // populates a `.entries` array (it doesn't, in 3.x).
        const rawEntries = await collectAllEntries(zipFile);

        if (rawEntries.length === 0) {
            throw new ValidationError("zip contains no entries");
        }

        if (rawEntries.length > effectiveLimits.maxEntries) {
            throw new ValidationError(
                `zip has too many entries (${rawEntries.length} > ${effectiveLimits.maxEntries})`,
            );
        }

        const entries: ZipEntryInfo[] = [];
        let totalBytes = 0;

        for (const entry of rawEntries) {
            validateEntry(entry, effectiveLimits);

            totalBytes += entry.uncompressedSize;
            if (totalBytes > effectiveLimits.maxTotalBytes) {
                throw new ValidationError(
                    `zip exceeds total size limit (${totalBytes} > ${effectiveLimits.maxTotalBytes} bytes)`,
                );
            }

            entries.push({
                fileName: entry.fileName,
                uncompressedSize: entry.uncompressedSize,
                isDirectory: entry.fileName.endsWith("/"),
            });
        }

        const readFile = async (name: string): Promise<Buffer> => {
            const entry = rawEntries.find((e) => e.fileName === name);
            if (!entry) {
                throw new ValidationError(
                    `entry "${name}" not found in zip`,
                );
            }
            return readEntryBuffer(zipFile, entry, effectiveLimits.maxFileBytes);
        };

        return {
            entries,
            totalBytes,
            readFile,
            close: closeOnce,
        };
    } catch (error) {
        closeOnce();
        throw error;
    }
}

/**
 * Collect all entries from a lazily-opened zipFile.
 *
 * yauzl emits one `'entry'` event per central-directory record.
 * After the last entry, `'end'` fires. Between events we call
 * `readEntry()` to advance — this is the required pattern for
 * `lazyEntries: true`.
 *
 * The `zipFile` must have been opened with `autoClose: false` so it
 * remains open after `'end'` — otherwise subsequent calls to
 * `openReadStream(entry)` will fail.
 */
function collectAllEntries(
    zipFile: yauzl.ZipFile,
): Promise<yauzl.Entry[]> {
    return new Promise((resolve, reject) => {
        const entries: yauzl.Entry[] = [];

        zipFile.on("entry", (entry: yauzl.Entry) => {
            entries.push(entry);
            // Advance to the next central-directory record.
            zipFile.readEntry();
        });

        zipFile.on("end", () => resolve(entries));

        zipFile.on("error", (err: Error) => {
            reject(
                new ValidationError(
                    `failed to read zip entries: ${err.message}`,
                ),
            );
        });

        // Kick off the sequence — emits the first 'entry' or 'end'.
        zipFile.readEntry();
    });
}

/* ==========================================================================
 * Internals
 * ========================================================================== */

function validateEntry(entry: yauzl.Entry, limits: ZipLimits): void {
    const name = entry.fileName;

    if (name.length === 0) {
        throw new ValidationError("zip contains an entry with an empty name");
    }

    // Null bytes in entry names are used to truncate paths in some
    // extraction libraries (the famous "poison null byte" attack).
    if (name.includes("\u0000")) {
        throw new ValidationError(
            `zip entry "${name}" contains a null byte`,
        );
    }

    // Windows separators — would cause cross-platform extraction
    // inconsistency and can bypass Unix-only traversal checks.
    if (name.includes("\\")) {
        throw new ValidationError(
            `zip entry "${name}" contains a backslash`,
        );
    }

    // Absolute Unix path.
    if (name.startsWith("/")) {
        throw new ValidationError(
            `zip entry "${name}" is an absolute path`,
        );
    }

    // Absolute Windows path (e.g. "C:\...").
    if (/^[A-Za-z]:/.test(name)) {
        throw new ValidationError(
            `zip entry "${name}" looks like an absolute Windows path`,
        );
    }

    // Path traversal — any segment equal to "..".
    const segments = name.split("/");
    if (segments.some((seg) => seg === "..")) {
        throw new ValidationError(
            `zip entry "${name}" contains path traversal ("..")`,
        );
    }

    if (entry.isEncrypted()) {
        throw new ValidationError(
            `zip entry "${name}" is encrypted (encrypted zips are not supported)`,
        );
    }

    // Symlink detection: `externalFileAttributes` upper 16 bits hold
    // the Unix file mode. S_IFLNK (0o120000) is a symbolic link.
    const unixMode = (entry.externalFileAttributes >>> 16) & 0o170000;
    if (unixMode === 0o120000) {
        throw new ValidationError(
            `zip entry "${name}" is a symlink (symlinks are not allowed)`,
        );
    }

    if (
        !Number.isFinite(entry.uncompressedSize) ||
        entry.uncompressedSize < 0
    ) {
        throw new ValidationError(
            `zip entry "${name}" has an invalid size`,
        );
    }

    if (entry.uncompressedSize > limits.maxFileBytes) {
        throw new ValidationError(
            `zip entry "${name}" declares ${entry.uncompressedSize} bytes (max ${limits.maxFileBytes})`,
        );
    }
}

function openZipBuffer(buffer: Buffer): Promise<yauzl.ZipFile> {
    return new Promise((resolve, reject) => {
        yauzl.fromBuffer(
            buffer,
            {
                // lazyEntries: true — entries are collected via the
                // 'entry' event rather than read into a public
                // `.entries` array. yauzl 3.x does not expose
                // `.entries` reliably at callback time; the event-
                // based pattern works across versions.
                lazyEntries: true,
                // autoClose: false — the zipFile must stay open after
                // 'end' fires so `readFile` can still call
                // `openReadStream(entry)` on a collected entry.
                // Without this, yauzl auto-closes on 'end' and read
                // streams fail.
                autoClose: false,
            },
            (err, zipFile) => {
                if (err) {
                    reject(
                        new ValidationError(
                            `invalid zip file: ${err.message}`,
                        ),
                    );
                    return;
                }
                resolve(zipFile);
            },
        );
    });
}

/**
 * Read a single entry into a Buffer.
 *
 * The declared size was checked during validation, but the central
 * directory can lie — a malicious zip can declare 100 bytes and
 * actually decompress to 1 GB. The streaming counter below aborts
 * the read if `maxFileBytes` is exceeded, so lying zips cannot
 * exhaust memory.
 */
function readEntryBuffer(
    zipFile: yauzl.ZipFile,
    entry: yauzl.Entry,
    maxFileBytes: number,
): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        zipFile.openReadStream(entry, (err, stream) => {
            if (err) {
                reject(
                    new ValidationError(
                        `failed to open "${entry.fileName}": ${err.message}`,
                    ),
                );
                return;
            }

            const chunks: Buffer[] = [];
            let actualBytes = 0;
            let settled = false;

            const fail = (error: Error): void => {
                if (settled) return;
                settled = true;
                stream.destroy();
                reject(error);
            };

            stream.on("data", (chunk: Buffer) => {
                actualBytes += chunk.length;
                if (actualBytes > maxFileBytes) {
                    fail(
                        new ValidationError(
                            `entry "${entry.fileName}" exceeded ${maxFileBytes} bytes during read`,
                        ),
                    );
                    return;
                }
                chunks.push(chunk);
            });

            stream.on("end", () => {
                if (settled) return;
                settled = true;
                resolve(Buffer.concat(chunks));
            });

            stream.on("error", (streamErr: Error) => {
                fail(
                    new ValidationError(
                        `failed to read "${entry.fileName}": ${streamErr.message}`,
                    ),
                );
            });
        });
    });
}