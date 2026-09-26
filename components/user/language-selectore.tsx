"use client";

import { updateUserLocale } from "@/actions/user.actions";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function LanguageSelector() {
    const locale = useLocale();
    const t = useTranslations("language");
    const router = useRouter();

    const [isPending, startTransition] = useTransition();

    function handleChange(nextLocale: string) {
        if (nextLocale === locale) {
            return;
        }

        startTransition(async () => {
            const result = await updateUserLocale(nextLocale as "en" | "ar");

            if (!result.ok) {
                return;
            }

            router.refresh();
        });
    }

    return (
        <div className="flex items-center gap-4 px-5 py-4 sm:px-6">
            <div className="min-w-0 flex-1">
                <h3 className="text-title-md">
                    {t("label")}
                </h3>

                <p className="mt-1 text-body-sm text-on-surface-variant">
                    {locale === "ar"
                        ? t("arabic")
                        : t("english")}
                </p>
            </div>

            <select
                value={locale}
                disabled={isPending}
                onChange={(event) => handleChange(event.target.value)}
                aria-label={t("label")}
                className="h-9 rounded-md border border-outline-variant bg-surface-lowest px-3 text-body-sm text-on-surface disabled:opacity-60"
            >
                <option value="en">
                    {t("english")}
                </option>

                <option value="ar">
                    {t("arabic")}
                </option>
            </select>
        </div>
    );
}