/**
 * Scaffold templates for `store-manager-ext init`.
 *
 * This module is pure: it declares the file contents that a new
 * extension starts with, and returns them as a path → content map.
 * Writing those files to disk is `init.ts`'s job.
 *
 * The templates are intentionally minimal — a buildable extension
 * with the correct shape, empty by default, and clear comments
 * pointing at what to fill in. No example logic (that's what the
 * fixture port in B4 exercises).
 */

/**
 * Scope values match the manifest schema's `ExtensionScope` type.
 * Redeclared here rather than imported so that this module has zero
 * dependencies on the library's types — the templates are data, not
 * code that participates in the library's type system.
 */
export type ScaffoldScope = "user" | "store" | "admin";

export interface ScaffoldInput {
    /** Extension ID — must match the manifest's `id` regex (lowercase, hyphens). */
    name: string;
    /** Semver, e.g. "1.0.0". */
    version: string;
    /** Human-readable description, may be empty. */
    description: string;
    /** Author name, may be empty. */
    author: string;
    /** Extension scope; determines the manifest's `eligibility` shape. */
    scope: ScaffoldScope;
    /**
     * Only meaningful when `scope === "store"`.
     * Defaults to `["OWNER", "MANAGER"]` when omitted.
     */
    requiresStoreRole?: readonly ("OWNER" | "MANAGER" | "STAFF")[];
}

/* ==========================================================================
 * Public API
 * ========================================================================== */

/**
 * Build the full scaffold file map for the given input.
 *
 * Returns a flat `Record<relativePath, fileContents>` where paths use
 * forward slashes. Callers are responsible for joining with a base
 * directory and writing.
 */
export function buildScaffold(
    input: ScaffoldInput,
): Record<string, string> {
    return {
        "package.json": renderPackageJson(input),
        "tsconfig.json": TSCONFIG_JSON,
        "README.md": renderReadme(input),
        ".gitignore": GITIGNORE,
        "src/index.ts": SRC_INDEX_TS,
        "src/capabilities.ts": CAPABILITIES_TS,
        "src/hooks/.gitkeep": "",
        "src/tables/.gitkeep": "",
        "src/notifications/.gitkeep": "",
        "src/translations/en.json": TRANSLATIONS_EN_JSON,
        "src/translations/ar.json": TRANSLATIONS_AR_JSON,
    };
}

/* ==========================================================================
 * Renderers
 * ========================================================================== */

function renderPackageJson(input: ScaffoldInput): string {
    const pkg = {
        name: input.name,
        version: input.version,
        description: input.description,
        author: input.author,
        private: true,
        type: "module",
        scripts: {
            build: "store-manager-ext build",
        },
        devDependencies: {
            "@store-manager/extensions": "workspace:*",
            typescript: "^5.9.3",
        },
        storeManager: buildStoreManagerBlock(input),
    };

    return JSON.stringify(pkg, null, 2) + "\n";
}

function buildStoreManagerBlock(input: ScaffoldInput): {
    scope: ScaffoldScope;
    eligibility: Record<string, unknown>;
} {
    if (input.scope === "store") {
        return {
            scope: "store",
            eligibility: {
                minimumGlobalRole: "USER",
                requiresStoreRole:
                    input.requiresStoreRole && input.requiresStoreRole.length > 0
                        ? input.requiresStoreRole
                        : ["OWNER", "MANAGER"],
            },
        };
    }

    if (input.scope === "admin") {
        return {
            scope: "admin",
            eligibility: { minimumGlobalRole: "ADMIN" },
        };
    }

    return {
        scope: "user",
        eligibility: { minimumGlobalRole: "USER" },
    };
}

function renderReadme(input: ScaffoldInput): string {
    const scopeExplanation =
        input.scope === "store"
            ? "Installed per store by an OWNER or MANAGER. Affects all members of that store."
            : input.scope === "admin"
                ? "Installed per platform admin. Affects only the installing admin."
                : "Installed per user. Affects only the installing user.";

    return `# ${input.name}

${input.description || "(no description)"}

## Scope

This extension is scoped to **${input.scope}**.

${scopeExplanation}

## Development

This scaffold expects to live inside the store-manager monorepo,
alongside \`extensions/library/\`. The \`@store-manager/extensions\`
dependency resolves from the monorepo root via \`node_modules\`.

### Build

From the monorepo root:

\`\`\`sh
pnpm exec store-manager-ext build <path-to-this-dir>
\`\`\`

Or from this directory (after the monorepo is installed):

\`\`\`sh
pnpm build
\`\`\`

Build output: \`dist/index.js\` and \`dist/manifest.json\`.

## Structure

\`\`\`
src/
├── index.ts          Entry point — assembles the extension from declarations
├── capabilities.ts   Which capabilities this extension requires
├── hooks/            One file per hook handler
├── tables/           One file per table this extension owns
├── notifications/    One file per notification this extension publishes
└── translations/     Per-locale message catalogs (en.json, ar.json)
\`\`\`
`;
}

/* ==========================================================================
 * Static templates
 * ========================================================================== */

const TSCONFIG_JSON = `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "moduleDetection": "force",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules"]
}
`;

const GITIGNORE = `node_modules/
dist/
*.log
`;

const SRC_INDEX_TS = `import { defineExtension } from "@store-manager/extensions";

import capabilities from "./capabilities";

/**
 * Extension entry point.
 *
 * To add a table:
 *   1. Create \`src/tables/<table-name>.ts\` exporting \`defineTable({...})\`.
 *   2. Import it here and add it to the \`tables\` map below.
 *
 * To add a notification:
 *   1. Create \`src/notifications/<NAME>.ts\` exporting \`defineNotification({...})\`.
 *   2. Import it here and add it to the \`notifications\` map below.
 *   3. Add translations for every declared event in both
 *      \`src/translations/en.json\` and \`src/translations/ar.json\`.
 *
 * To add a hook handler:
 *   1. Create \`src/hooks/<hook-name>.ts\`.
 *   2. Import it here and add it under \`on\`.
 *
 * The keys of \`on\` become the manifest's \`hooks\` array at build time.
 */
export default defineExtension({
    capabilities,
    tables: {},
    notifications: {},
    on: {
        "product.created": async (_ctx, _payload) => {
            // TODO: implement the handler.
            //
            // \`ctx\` is the extension context (user, store, db, storage,
            // notifications, http, log). \`payload\` is the typed payload
            // for \`product.created\`.
        },
    },
});
`;

const CAPABILITIES_TS = `import { defineCapabilities } from "@store-manager/extensions";

/**
 * Declare the capabilities this extension requires.
 *
 * Omitted keys default to \`false\` / \`[]\`. Enable what you need:
 *
 *   "db.read": true,
 *   "db.write": true,
 *   "storage.read": true,
 *   "storage.write": true,
 *   "logs.write": true,
 *   "notifications.publish": ["MY_EVENT"],
 *   "http.fetch": ["api.example.com"],
 *
 * The compiler (Phase B3 and later) will reject declarations that
 * don't match the extension's actual usage: declared-but-unused and
 * used-but-undeclared are both build errors.
 */
export default defineCapabilities({});
`;

const TRANSLATIONS_EN_JSON = `{
  "notifications": {}
}
`;

const TRANSLATIONS_AR_JSON = `{
  "notifications": {}
}
`;