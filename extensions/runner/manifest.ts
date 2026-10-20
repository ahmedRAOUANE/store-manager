import { z } from "zod";
import { HOOK_NAMES } from "./types";

const ExtensionIdSchema = z
    .string()
    .min(3)
    .max(50)
    .regex(
        /^[a-z][a-z0-9-]*$/,
        "must start with a lowercase letter and contain only lowercase letters, digits, and hyphens",
    );

const SemverSchema = z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, "must be semver (e.g. 1.0.0)");

const SemverRangeSchema = z
    .string()
    .regex(
        /^[\^~]?\d+\.\d+\.\d+$/,
        "must be a semver range (e.g. 1.0.0, ^1.0.0, ~1.0.0)",
    );

const AuthorSchema = z
    .object({
        name: z.string().min(1).max(200),
        contact: z.string().max(500).optional(),
    })
    .strict();

const HookNameSchema = z.enum(HOOK_NAMES);

const ColumnTypeSchema = z.enum([
    "uuid",
    "text",
    "timestamptz",
    "int",
    "float8",
    "bool",
]);

const TablesSchema = z.record(
    z
        .string()
        .regex(
            /^[a-z][a-z0-9_]*$/,
            "table names must be lowercase snake_case",
        ),
    z
        .object({
            columns: z.record(z.string(), ColumnTypeSchema),
        })
        .strict(),
);

const NotificationsSchema = z.record(
    z
        .string()
        .regex(
            /^[A-Z][A-Z0-9_]*$/,
            "notification event names must be UPPER_SNAKE_CASE",
        ),
    z
        .object({
            titleKey: z.string().min(1).max(200),
            bodyKey: z.string().min(1).max(200),
        })
        .strict(),
);

const TranslationsPerLocale = z
    .object({
        notifications: z.record(
            z.string(),
            z
                .object({
                    title: z.string().min(1),
                    body: z.string().min(1),
                })
                .strict(),
        ),
    })
    .strict();

const TranslationsSchema = z
    .object({
        en: TranslationsPerLocale,
        ar: TranslationsPerLocale,
    })
    .strict();

const CapabilitiesSchema = z
    .object({
        "db.read": z.boolean().default(false),
        "db.write": z.boolean().default(false),
        "storage.read": z.boolean().default(false),
        "storage.write": z.boolean().default(false),
        "notifications.publish": z.array(z.string()).default([]),
        "http.fetch": z.array(z.string()).default([]),
        "logs.write": z.boolean().default(false),
    })
    .strict();

const QuotaSchema = z
    .object({
        maxRows: z.number().int().positive().optional(),
        maxBytes: z.number().int().positive().optional(),
    })
    .strict();

const BuildMetadataSchema = z
    .object({
        builtWith: z.string(),
        builtAt: z.string(),
        artifactChecksum: z.string(),
        manifestChecksum: z.string().optional(),
    })
    .strict();

/**
 * Common fields shared by every scope. The scope-specific pieces
 * (`scope` + `eligibility`) are layered on top in the discriminated
 * union below.
 */
const BaseManifestFields = {
    id: ExtensionIdSchema,
    version: SemverSchema,
    name: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    author: AuthorSchema,
    libraryVersion: SemverRangeSchema,
    capabilities: CapabilitiesSchema,
    hooks: z.array(HookNameSchema).min(1),
    tables: TablesSchema.default({}),
    notifications: NotificationsSchema.default({}),
    translations: TranslationsSchema,
    quota: QuotaSchema.optional(),
    buildMetadata: BuildMetadataSchema.optional(),
};

const UserScopedEligibility = z
    .object({
        minimumGlobalRole: z.enum(["USER", "ADMIN"]).default("USER"),
    })
    .strict();

const StoreScopedEligibility = z
    .object({
        minimumGlobalRole: z.enum(["USER", "ADMIN"]).default("USER"),
        requiresStoreRole: z
            .array(z.enum(["OWNER", "MANAGER", "STAFF"]))
            .min(1),
    })
    .strict();

const AdminScopedEligibility = z
    .object({
        minimumGlobalRole: z.literal("ADMIN"),
    })
    .strict();

const UserScopedManifest = z
    .object({
        ...BaseManifestFields,
        scope: z.literal("user"),
        eligibility: UserScopedEligibility,
    })
    .strict();

const StoreScopedManifest = z
    .object({
        ...BaseManifestFields,
        scope: z.literal("store"),
        eligibility: StoreScopedEligibility,
    })
    .strict();

const AdminScopedManifest = z
    .object({
        ...BaseManifestFields,
        scope: z.literal("admin"),
        eligibility: AdminScopedEligibility,
    })
    .strict();

export const ManifestSchema = z
    .discriminatedUnion("scope", [
        UserScopedManifest,
        StoreScopedManifest,
        AdminScopedManifest,
    ])
    .superRefine((manifest, ctx) => {
        const declaredEvents = Object.keys(manifest.notifications);
        const allowedEvents = new Set(
            manifest.capabilities["notifications.publish"],
        );

        // Rule 1: every declared notification must be allowed by capabilities.
        for (const eventName of declaredEvents) {
            if (!allowedEvents.has(eventName)) {
                ctx.addIssue({
                    code: "custom",
                    path: ["notifications", eventName],
                    message: `notification "${eventName}" is declared but not listed in capabilities["notifications.publish"]`,
                });
            }
        }

        // Rule 2: capabilities cannot grant publishing of undeclared events.
        for (const eventName of manifest.capabilities[
            "notifications.publish"
        ]) {
            if (!declaredEvents.includes(eventName)) {
                ctx.addIssue({
                    code: "custom",
                    path: ["capabilities", "notifications.publish"],
                    message: `capability allows publishing "${eventName}" but no matching notification is declared`,
                });
            }
        }

        // Rule 3: every declared notification must have translations in both locales.
        for (const eventName of declaredEvents) {
            for (const locale of ["en", "ar"] as const) {
                if (!manifest.translations[locale].notifications[eventName]) {
                    ctx.addIssue({
                        code: "custom",
                        path: [
                            "translations",
                            locale,
                            "notifications",
                            eventName,
                        ],
                        message: `missing translation for event "${eventName}" in locale "${locale}"`,
                    });
                }
            }
        }

        // Rule 4: extensions that declare notifications must subscribe to a hook.
        // Without a hook, they have no way to trigger `ctx.notifications.publish`.
        if (declaredEvents.length > 0 && manifest.hooks.length === 0) {
            ctx.addIssue({
                code: "custom",
                path: ["hooks"],
                message:
                    "extensions that declare notifications must subscribe to at least one hook",
            });
        }
    });

export type Manifest = z.infer<typeof ManifestSchema>;