import { describe, it, expect } from "vitest";

import { extractZipFileFromFormData } from "../../lib/storage/form-data";

/**
 * Tests for the Server Action's file-extraction helper. No auth, no
 * DB, no R2 — pure `FormData` → `Buffer` validation.
 *
 * The action itself (`submitExtension`) is a thin wrapper around
 * `withGlobalRole` + `submitExtensionService`, both of which are
 * covered elsewhere. This file's job is to verify the transport
 * boundary — the only place a malicious or malformed upload can
 * produce unexpected shapes.
 */

function makeFile(name: string, content: string | Buffer): File {
    const bytes = Buffer.isBuffer(content)
        ? new Uint8Array(content)
        : new Uint8Array(Buffer.from(content, "utf-8"));
    return new File([bytes], name, { type: "application/zip" });
}

function makeFormData(entry: File | string | null): FormData {
    const fd = new FormData();
    if (entry !== null) {
        fd.set("file", entry as File | string);
    }
    return fd;
}

describe("extractZipFileFromFormData — happy path", () => {
    it("extracts a valid zip upload", async () => {
        const fd = makeFormData(makeFile("test.zip", "hello"));
        const result = await extractZipFileFromFormData(fd);

        expect(result.ok).toBe(true);
        if (!result.ok) return;

        expect(result.filename).toBe("test.zip");
        expect(result.buffer.toString("utf-8")).toBe("hello");
    });

    it("accepts uppercase .ZIP extension", async () => {
        const fd = makeFormData(makeFile("TEST.ZIP", "hello"));
        const result = await extractZipFileFromFormData(fd);

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.filename).toBe("TEST.ZIP");
    });
});

describe("extractZipFileFromFormData — structural rejection", () => {
    it("rejects a missing file entry", async () => {
        const result = await extractZipFileFromFormData(makeFormData(null));
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.message).toMatch(/No file/);
    });

    it("rejects a text field instead of a file", async () => {
        const result = await extractZipFileFromFormData(
            makeFormData("not-a-file"),
        );
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.message).toMatch(/No file/);
    });
});

describe("extractZipFileFromFormData — validation rejection", () => {
    it("rejects a non-zip filename", async () => {
        const fd = makeFormData(makeFile("test.txt", "hello"));
        const result = await extractZipFileFromFormData(fd);
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.message).toMatch(/Only \.zip/);
    });

    it("rejects an empty file", async () => {
        const fd = makeFormData(makeFile("empty.zip", ""));
        const result = await extractZipFileFromFormData(fd);
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.message).toMatch(/empty/);
    });

    it("rejects a file exceeding the size limit without reading the buffer", async () => {
        // Use a real File with a small (5-byte) content, then pass a
        // lower `limitBytes` to trigger the size-check path. This
        // exercises the exact production code that fires for a real
        // oversized upload — with zero memory cost.
        const file = makeFile("test.zip", "hello"); // 5 bytes
        const fd = makeFormData(file);

        // Prove the buffer is never read when the size check fails:
        // the early return must happen before arrayBuffer(). Wrap the
        // method on the prototype; the try/finally guarantees
        // restoration even if the assertion fails.
        const originalArrayBuffer = Blob.prototype.arrayBuffer;
        let arrayBufferCalled = false;
        Blob.prototype.arrayBuffer = async function (this: Blob) {
            arrayBufferCalled = true;
            return originalArrayBuffer.call(this);
        };

        try {
            const result = await extractZipFileFromFormData(fd, 3);
            expect(result.ok).toBe(false);
            if (result.ok) return;
            expect(result.message).toMatch(/too large/);
            expect(arrayBufferCalled).toBe(false);
        } finally {
            Blob.prototype.arrayBuffer = originalArrayBuffer;
        }
    });
});