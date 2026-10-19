import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { buttonVariants } from "@/components/UI/btn";

/**
 * Landing page for authentication flow failures.
 *
 * Reachable while the user is NOT authenticated — must not call
 * `getCurrentUser`, `getCurrentStoreContext`, or any auth-wrapped
 * action, because that would re-trigger the failure that sent them
 * here. All content is derived from the `reason` query param.
 *
 * The Kinde route wrapper (`app/api/auth/[kindeAuth]/route.ts`)
 * redirects 5xx callback responses to this page with a reason code.
 */
export default async function AuthErrorPage({
    searchParams,
}: PageProps<"/auth/error">) {
    const sp = await searchParams;
    const reason = typeof sp.reason === "string" ? sp.reason : "unexpected";

    const t = await getTranslations("authError");

    const reasonText =
        reason === "callback_failed"
            ? t("reasons.callbackFailed")
            : t("reasons.unexpected");

    return (
        <main className="flex min-h-screen items-center justify-center bg-surface px-6">
            <div className="w-full max-w-md text-center">
                <h1 className="text-headline-md text-on-surface">
                    {t("title")}
                </h1>

                <p className="mt-3 text-body-md text-on-surface-variant">
                    {t("description")}
                </p>

                <p className="mt-2 rounded-md border border-warning-border bg-warning-bg px-3 py-2 text-body-sm text-warning-fg">
                    {reasonText}
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                    <Link
                        href="/api/auth/login"
                        className={buttonVariants({
                            variant: "primary",
                            size: "md",
                        })}
                    >
                        {t("tryAgain")}
                    </Link>

                    <Link
                        href="/"
                        className={buttonVariants({
                            variant: "secondary",
                            size: "md",
                        })}
                    >
                        {t("goHome")}
                    </Link>
                </div>

                <p className="mt-6 text-body-sm text-on-surface-variant">
                    {t("help")}
                </p>
            </div>
        </main>
    );
}