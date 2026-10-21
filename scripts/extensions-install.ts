import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import { installExtension } from "@/extensions/install";

async function main(): Promise<void> {
    const { values } = parseArgs({
        args: process.argv.slice(2),
        options: {
            path: { type: "string", short: "p" },
            scope: { type: "string", short: "s" },
            scopeId: { type: "string" },
            installedBy: { type: "string" },
        },
        strict: true,
        allowPositionals: false,
    });

    const { path, scope, scopeId, installedBy } = values;

    if (!path) throw new Error("Missing required flag --path");
    if (!scope) throw new Error("Missing required flag --scope");
    if (!scopeId) throw new Error("Missing required flag --scopeId");
    if (!installedBy) throw new Error("Missing required flag --installedBy");

    if (scope !== "user" && scope !== "store" && scope !== "admin") {
        throw new Error(
            `--scope must be one of: user, store, admin (got "${scope}")`,
        );
    }

    const result = await installExtension({
        sourcePath: path,
        scope,
        scopeId,
        installedByUserId: installedBy,
    });

    console.log("");
    console.log(`✅ Installed ${path}`);
    console.log(`   installId: ${result.installId}`);
    console.log(`   artifact:  ${result.artifactPath}`);
    console.log(`   checksum:  ${result.artifactChecksum}`);
    console.log("");
    console.log("   Restart the dev server to load the extension.");
    console.log("");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
    main().catch((error) => {
        console.error(
            `\n❌ Install failed: ${(error as Error).message}\n`,
        );
        process.exit(1);
    });
}