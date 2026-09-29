"use client";

import { setLocale } from "@/actions/locale.actions";
import { Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/utils/jsx-classes";

type Variant = "full" | "compact";

interface LanguageSelectorProps {
    /** `"full"` (default) — settings-panel layout. `"compact"` — nav-bar layout. */
    variant?: Variant;
    className?: string;
}

export function LanguageSelector({
    variant = "full",
    className,
}: LanguageSelectorProps) {
    const locale = useLocale();
    const t = useTranslations("language");
    const router = useRouter();

    const [isPending, startTransition] = useTransition();

    function handleChange(nextLocale: string) {
        if (nextLocale === locale) {
            return;
        }

        startTransition(async () => {
            await setLocale(nextLocale as "en" | "ar");
            router.refresh();
        });
    }

    if (variant === "compact") {
        return (
            <div className={cn("relative inline-flex items-center", className)}>
                <Globe
                    aria-hidden="true"
                    className="pointer-events-none absolute isnet-s-2.5 size-3.5 text-on-surface-variant"
                />
                <select
                    value={locale}
                    disabled={isPending}
                    onChange={(event) => handleChange(event.target.value)}
                    aria-label={t("label")}
                    className={cn(
                        "h-9 cursor-pointer appearance-none rounded-md border border-outline-variant bg-surface-lowest",
                        "ps-8 pe-3 text-body-sm text-on-surface",
                        "disabled:opacity-60",
                    )}
                >
                    <option value="en">{t("english")}</option>
                    <option value="ar">{t("arabic")}</option>
                </select>
            </div>
        );
    }

    /* ---------- Full variant — unchanged layout ---------- */

    return (
        <div
            className={cn(
                "flex items-center gap-4 px-5 py-4 sm:px-6",
                className,
            )}
        >
            <div className="min-w-0 flex-1">
                <h3 className="text-title-md">{t("label")}</h3>

                <p className="mt-1 text-body-sm text-on-surface-variant">
                    {locale === "ar" ? t("arabic") : t("english")}
                </p>
            </div>

            <select
                value={locale}
                disabled={isPending}
                onChange={(event) => handleChange(event.target.value)}
                aria-label={t("label")}
                className="h-9 rounded-md border border-outline-variant bg-surface-lowest px-3 text-body-sm text-on-surface disabled:opacity-60"
            >
                <option value="en">{t("english")}</option>
                <option value="ar">{t("arabic")}</option>
            </select>
        </div>
    );
}