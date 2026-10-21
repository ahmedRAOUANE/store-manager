import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import { uninstallExtension } from "@/extensions/install";

async function main(): Promise<void> {
    const { values } = parseArgs({
        args: process.argv.slice(2),
        options: {
            installId: { type: "string" },
        },
        strict: true,
        allowPositionals: false,
    });

    if (!values.installId) {
        throw new Error("Missing required flag --installId");
    }

    await uninstallExtension(values.installId);

    console.log("");
    console.log(`✅ Uninstalled installId=${values.installId}`);
    console.log("");
    console.log("   Restart the dev server to unload the extension.");
    console.log("");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
    main().catch((error) => {
        console.error(
            `\n❌ Uninstall failed: ${(error as Error).message}\n`,
        );
        process.exit(1);
    });
}