import type { DefaultModelRow } from "@prisma/orm-postgres/orm-client";
import type { Contract } from "@/prisma/contract";
import { GetUserSchema } from "./user.schema";

type RawUserRow = DefaultModelRow<Contract, "User", "public">;

/**
 * The admin-facing representation of a user row.
 *
 * Extends the raw DB row shape with two additional fields:
 *   - `isValid`: whether the row satisfies `GetUserSchema`
 *   - `issues`: human-readable list of schema violations (empty when valid)
 *
 * `GetUserSchema` intentionally requires a valid email. Rows that
 * violate that invariant (e.g. historical users synced before
 * email-only login was enforced) are surfaced here rather than hidden,
 * so the admin panel can flag them explicitly.
 *
 * See `toAdminUserRow` for the mapping.
 */
export interface AdminUserRow {
    id: string;
    kindeId: string;
    locale: string;

    /**
     * The raw value from the DB. `null` when the user has no email,
     * empty string when a past sync wrote "" instead of failing.
     * Both cases surface as `isValid: false`.
     */
    email: string | null;

    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
    globalRole: "ADMIN" | "USER";
    createdAt: Temporal.Instant;
    updatedAt: Temporal.Instant;

    /** True when the row satisfies `GetUserSchema` (i.e. has a valid email). */
    isValid: boolean;

    /** Human-readable schema violations. Empty when `isValid` is true. */
    issues: string[];
}

/**
 * Convert a raw DB user row into an `AdminUserRow`.
 *
 * Runs `GetUserSchema` on the row and captures the outcome:
 *   - success  → `isValid: true`, `issues: []`
 *   - failure  → `isValid: false`, `issues` populated from Zod
 *
 * Note: `z.email()` in Zod 4 rejects null AND empty string AND
 * malformed emails. So this single check covers all invalid-email
 * cases without a separate trim check.
 */
export const toAdminUserRow = (raw: RawUserRow): AdminUserRow => {
    const parsed = GetUserSchema.safeParse(raw);

    if (parsed.success) {
        return {
            ...parsed.data,
            isValid: true,
            issues: [],
        };
    }

    return {
        id: raw.id,
        kindeId: raw.kindeId,
        locale: raw.locale,
        email: raw.email,
        firstName: raw.firstName,
        lastName: raw.lastName,
        imageUrl: raw.imageUrl,
        globalRole: raw.globalRole,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        isValid: false,
        issues: parsed.error.issues.map(
            (issue) =>
                `${issue.path.join(".") || "(root)"}: ${issue.message}`,
        ),
    };
};