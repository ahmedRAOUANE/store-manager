import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/utils/auth";
import { AppError } from "@/errors/base.error";
import {
    defaultLocale,
    isLocale,
    resolveLocale,
    LOCALE_COOKIE_NAME,
} from "./config";

export default getRequestConfig(async () => {
    let locale = defaultLocale;

    const user = await getCurrentUser();

    if (user && !(user instanceof AppError)) {
        // Authenticated — DB wins. Unchanged behavior.
        locale = resolveLocale(user.locale);
    } else {
        // Anonymous — cookie wins, else fall back to default.
        const cookieStore = await cookies();
        const fromCookie = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
        if (fromCookie && isLocale(fromCookie)) {
            locale = fromCookie;
        }
    }

    return {
        locale,
        messages: (await import(`../messages/${locale}.json`)).default,
    };
});