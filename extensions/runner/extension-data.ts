import { Temporal } from "temporal-polyfill";
import { param } from "@prisma/orm-postgres/relational-core/expression";
import type { JsonValue } from "@prisma/orm-postgres/target/codec-types";
import { db, type TransactionClient } from "@/prisma/db";

import type { Manifest } from "./manifest";
import type { ExtensionDbApi, ExtensionStorageApi } from "./types";
import { ExtensionQuotaExceeded } from "./types";
import { assertCapability } from "./capability";

/** Single-row hard cap — protects against accidental megabyte-blob writes. */
const MAX_SINGLE_ROW_BYTES = 100 * 1024;

/**
 * Serialize a JS value to a JSON-safe `JsonValue` and enforce the
 * per-row byte cap in one pass.
 *
 * Round-tripping through `JSON.stringify` / `JSON.parse` accomplishes
 * three things:
 *   1. Rejects values that can't be persisted (functions, symbols,
 *      BigInt, circular references) with a clear error, instead of the
 *      opaque "not assignable to JsonValue" type error.
 *   2. Normalizes `undefined` → dropped keys (matching what Postgres
 *      would store anyway).
 *   3. Narrows `unknown` → `JsonValue`, so the resulting value is
 *      directly assignable to the ORM's `Json` column.
 *
 * Size is measured in UTF-8 bytes (not UTF-16 code units) so non-ASCII
 * payloads — Arabic strings, emoji — are counted honestly.
 */
const toJsonValue = (
    extensionId: string,
    value: unknown,
    context: string,
): JsonValue => {
    let serialized: string | undefined;

    try {
        serialized = JSON.stringify(value);
    } catch {
        throw new Error(
            `Extension "${extensionId}" attempted to write non-JSON-serializable data to ${context}`,
        );
    }

    if (serialized === undefined) {
        throw new Error(
            `Extension "${extensionId}" attempted to write a top-level undefined value to ${context}`,
        );
    }

    const bytes = Buffer.byteLength(serialized, "utf8");
    if (bytes > MAX_SINGLE_ROW_BYTES) {
        throw new Error(
            `Extension "${extensionId}" attempted to write ${context} exceeding ${MAX_SINGLE_ROW_BYTES} bytes (got ${bytes})`,
        );
    }

    return JSON.parse(serialized) as JsonValue;
};

interface BaseOptions {
    tx: TransactionClient;
    installId: string;
    extensionId: string;
    capabilities: Set<string>;
}

interface DbApiOptions extends BaseOptions {
    manifest: Manifest;
    quotaMaxRows: number;
    quotaMaxBytes: number;
}

/**
 * Build the extension-facing `ctx.extensions.db` API bound to a specific
 * install and transaction.
 *
 * Every operation:
 *   1. Asserts the required capability (db.read / db.write)
 *   2. Asserts the table is declared in the manifest
 *   3. Filters by installId in the WHERE clause (isolation)
 *
 * JSONB containment is used for `where` clauses. Because the `data`
 * column is stored as Postgres `json` (not `jsonb`), the queries cast
 * `data::jsonb` at read time. The single-insert case goes through the
 * ORM, which handles id and updatedAt automatically.
 *
 * Quota is checked on insert only (write amplification point). Reads
 * and deletes are not quota-checked — they do not grow storage.
 */
export const createExtensionDbApi = ({
    tx,
    installId,
    extensionId,
    manifest,
    capabilities,
    quotaMaxRows,
    quotaMaxBytes,
}: DbApiOptions): ExtensionDbApi => {
    const declaredTables = new Set(Object.keys(manifest.tables));

    const assertTable = (tableName: string): void => {
        if (!declaredTables.has(tableName)) {
            throw new Error(
                `Extension "${extensionId}" attempted to access undeclared table "${tableName}"`,
            );
        }
    };

    const checkQuota = async (): Promise<void> => {
        const plan = db.raw.sql`
            SELECT
                COUNT(*)::int AS "rowCount",
                COALESCE(SUM(pg_column_size("data")), 0)::bigint AS "byteCount"
            FROM "extensionData"
            WHERE "installId" = ${param(installId, { codecId: "pg/uuid@1" })}
        `
            .returnsRow({
                rowCount: { codecId: "pg/int4@1", nullable: false },
                byteCount: { codecId: "pg/int8number@1", nullable: false },
            })
            .build();

        const result = await tx.query(plan).first();
        if (!result) return;

        if (result.rowCount >= quotaMaxRows) {
            throw new ExtensionQuotaExceeded(
                `Extension "${extensionId}" row quota exceeded (${result.rowCount}/${quotaMaxRows})`,
                { current: result.rowCount, limit: quotaMaxRows },
            );
        }

        if (Number(result.byteCount) >= quotaMaxBytes) {
            throw new ExtensionQuotaExceeded(
                `Extension "${extensionId}" byte quota exceeded (${result.byteCount}/${quotaMaxBytes})`,
                {
                    current: Number(result.byteCount),
                    limit: quotaMaxBytes,
                },
            );
        }
    };

    return {
        insert: async (tableName, row) => {
            assertCapability(extensionId, capabilities, "db.write");
            assertTable(tableName);

            const data = toJsonValue(
                extensionId,
                row,
                `table "${tableName}"`,
            );

            await checkQuota();

            await tx.orm.public.ExtensionData.create({
                installId,
                tableName,
                data,
            });
        },

        find: async (tableName, where) => {
            assertCapability(extensionId, capabilities, "db.read");
            assertTable(tableName);

            const whereJson = JSON.stringify(where);

            const plan = db.raw.sql`
                SELECT "data"
                FROM "extensionData"
                WHERE
                    "installId" = ${param(installId, { codecId: "pg/uuid@1" })}
                    AND "tableName" = ${param(tableName, { codecId: "pg/text@1" })}
                    AND "data"::jsonb @> ${param(whereJson, { codecId: "pg/text@1" })}::jsonb
                ORDER BY "createdAt" ASC
            `
                .returnsRow({
                    data: { codecId: "pg/json@1", nullable: false },
                })
                .build();

            /*
             * `tx.query(plan)` returns an `AsyncIterableResult<T>`, not a
             * materialized array. Iterate with `for await` to drain it.
             * (`.first()` is the other useful method on the cursor; there
             * is no `.all()`.)
             */
            const rows: Array<Record<string, unknown>> = [];
            const cursor = tx.query(plan);

            for await (const row of cursor) {
                rows.push(row.data as Record<string, unknown>);
            }

            return rows;
        },

        update: async (tableName, where, updates) => {
            assertCapability(extensionId, capabilities, "db.write");
            assertTable(tableName);

            const updatesJson = toJsonValue(
                extensionId,
                updates,
                `table "${tableName}"`,
            );
            const whereJson = JSON.stringify(where);

            const plan = db.raw.sql`
                UPDATE "extensionData"
                SET
                    "data" = "data"::jsonb || ${param(JSON.stringify(updatesJson), { codecId: "pg/text@1" })}::jsonb,
                    "updatedAt" = ${param(
                Temporal.Instant.fromEpochMilliseconds(Date.now()),
                { codecId: "pg/timestamptz-temporal@1" },
            )}
                WHERE
                    "installId" = ${param(installId, { codecId: "pg/uuid@1" })}
                    AND "tableName" = ${param(tableName, { codecId: "pg/text@1" })}
                    AND "data"::jsonb @> ${param(whereJson, { codecId: "pg/text@1" })}::jsonb
            `
                .affectedCount()
                .build();

            const result = await tx.execute(plan);
            return result.affectedRows;
        },

        delete: async (tableName, where) => {
            assertCapability(extensionId, capabilities, "db.write");
            assertTable(tableName);

            const whereJson = JSON.stringify(where);

            const plan = db.raw.sql`
                DELETE FROM "extensionData"
                WHERE
                    "installId" = ${param(installId, { codecId: "pg/uuid@1" })}
                    AND "tableName" = ${param(tableName, { codecId: "pg/text@1" })}
                    AND "data"::jsonb @> ${param(whereJson, { codecId: "pg/text@1" })}::jsonb
            `
                .affectedCount()
                .build();

            const result = await tx.execute(plan);
            return result.affectedRows;
        },
    };
};

/**
 * Build the extension-facing `ctx.extensions.storage` API.
 *
 * Uses the ORM directly — no JSONB containment needed, just key-value
 * get/set/delete scoped by installId.
 */
export const createExtensionStorageApi = ({
    tx,
    installId,
    extensionId,
    capabilities,
}: BaseOptions): ExtensionStorageApi => {
    return {
        get: async <T = unknown>(key: string): Promise<T | null> => {
            assertCapability(extensionId, capabilities, "storage.read");

            const row = await tx.orm.public.ExtensionStorage
                .where({ installId, key })
                .first();

            return row ? (row.value as T) : null;
        },

        set: async (key, value) => {
            assertCapability(extensionId, capabilities, "storage.write");

            const stored = toJsonValue(
                extensionId,
                value,
                `storage key "${key}"`,
            );

            const existing = await tx.orm.public.ExtensionStorage
                .where({ installId, key })
                .first();

            if (existing) {
                await tx.orm.public.ExtensionStorage
                    .where({ installId, key })
                    .update({ value: stored });
            } else {
                await tx.orm.public.ExtensionStorage.create({
                    installId,
                    key,
                    value: stored,
                });
            }
        },

        delete: async (key) => {
            assertCapability(extensionId, capabilities, "storage.write");

            await tx.orm.public.ExtensionStorage
                .where({ installId, key })
                .delete();
        },
    };
};