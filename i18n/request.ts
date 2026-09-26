import { getRequestConfig } from "next-intl/server";

import { getCurrentUser } from "@/utils/auth";
import { defaultLocale, resolveLocale } from "./config";

export default getRequestConfig(async () => {
    let locale = defaultLocale;

    try {
        const user = await getCurrentUser();

        if (
            user &&
            typeof user === "object" &&
            "locale" in user &&
            typeof user.locale === "string"
        ) {
            locale = resolveLocale(user.locale);
        }
    } catch {
        // Anonymous users and auth failures use the default locale.
    }

    const messages = (
        await import(`../messages/${locale}.json`)
    ).default;

    return {
        locale,
        messages,
    };
});