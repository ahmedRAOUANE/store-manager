"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/utils/auth";
import { AppError } from "@/errors/base.error";
import {
    isLocale,
    type Locale,
    LOCALE_COOKIE_NAME,
} from "@/i18n/config";
import { updateUserLocaleService } from "@/services/user.services"

export async function setLocale(next: Locale) {
    if (!isLocale(next)) return;

    const user = await getCurrentUser();

    if (user && !(user instanceof AppError)) {
        // Existing path — user service → Prisma. Unchanged.
        await updateUserLocaleService(user.id, {locale: next});
    } else {
        // New path — anonymous user: persist via cookie.
        const cookieStore = await cookies();
        cookieStore.set(LOCALE_COOKIE_NAME, next, {
            path: "/",
            sameSite: "lax",
            httpOnly: false,     // see note below
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24 * 365, // one year
        });
    }

    // Force the server to re-render with the new locale.
    revalidatePath("/", "layout");
}