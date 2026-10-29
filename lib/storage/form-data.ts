import { MAX_ARTIFACT_BYTES } from "@/services/storeIngestion.services";

/**
 * Extraction result — matches the `{ ok: true } | { ok: false }`
 * pattern used by every other Server Action in the codebase.
 */
export type ExtractFileResult =
    | { ok: true; buffer: Buffer; filename: string }
    | { ok: false; message: string };

/**
 * Extract an uploaded zip from a Server Action's `FormData`.
 *
 * Runs every cheap validation check BEFORE reading the file into
 * memory. A 500 MB upload rejected for being oversized costs zero
 * bytes of heap under this flow, because `file.size` is checked
 * against `limitBytes` before `arrayBuffer()` is awaited.
 *
 * `limitBytes` defaults to `MAX_ARTIFACT_BYTES` (4.5 MB — matches
 * Vercel's Hobby function-body cap and the service's own ceiling).
 * Tests use a smaller value to exercise the size-check path without
 * allocating a real multi-megabyte `File`.
 *
 * The service (`submitExtensionService`) re-checks size and zip
 * structure. That's defense-in-depth — one check at the transport
 * boundary, one at the domain boundary.
 */
export async function extractZipFileFromFormData(
    formData: FormData,
    limitBytes: number = MAX_ARTIFACT_BYTES,
): Promise<ExtractFileResult> {
    const entry = formData.get("file");

    if (entry === null || typeof entry === "string") {
        return { ok: false, message: "No file was uploaded." };
    }

    if (
        typeof entry.arrayBuffer !== "function" ||
        typeof entry.name !== "string" ||
        typeof entry.size !== "number"
    ) {
        return { ok: false, message: "Uploaded file is not a valid file." };
    }

    const filename = entry.name;

    if (!filename.toLowerCase().endsWith(".zip")) {
        return { ok: false, message: "Only .zip files are accepted." };
    }

    if (entry.size === 0) {
        return { ok: false, message: "Uploaded file is empty." };
    }

    if (entry.size > limitBytes) {
        return {
            ok: false,
            message:
                `File is too large (${entry.size.toLocaleString()} bytes). ` +
                `Maximum is ${limitBytes.toLocaleString()} bytes.`,
        };
    }

    let buffer: Buffer;
    try {
        buffer = Buffer.from(await entry.arrayBuffer());
    } catch (err) {
        console.error(
            "lib/storage/form-data.ts > extractZipFileFromFormData > " +
            "arrayBuffer read failed:",
            err,
        );
        return {
            ok: false,
            message: "Failed to read the uploaded file. Please try again.",
        };
    }

    if (buffer.byteLength === 0) {
        return { ok: false, message: "Uploaded file is empty." };
    }
    if (buffer.byteLength > limitBytes) {
        return {
            ok: false,
            message:
                `File is too large (${buffer.byteLength.toLocaleString()} bytes). ` +
                `Maximum is ${limitBytes.toLocaleString()} bytes.`,
        };
    }

    return { ok: true, buffer, filename };
}