"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button, buttonVariants } from "@/components/UI/btn";

/**
 * Client error boundary. Catches errors thrown during render of any
 * page or layout below the root layout. Renders inside the app shell,
 * so `useTranslations` is available (NextIntlClientProvider is in the
 * root layout).
 *
 * The `reset` callback re-runs the render. If the underlying condition
 * was transient (a network blip during data fetch), the page recovers
 * without a full reload.
 */
export default function AppError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const t = useTranslations("errors");

    useEffect(() => {
        // Log so server-side tracing can correlate the client error
        // with whatever happened on the server.
        console.error("app/error.tsx > caught:", error);
    }, [error]);

    return (
        <main className="flex min-h-[60vh] items-center justify-center px-6">
            <div className="w-full max-w-md text-center">
                <h1 className="text-headline-md text-on-surface">
                    {t("pageTitle")}
                </h1>

                <p className="mt-2 text-body-md text-on-surface-variant">
                    {t("pageDescription")}
                </p>

                {error.digest && (
                    <p className="mt-3 font-mono text-body-sm text-on-surface-variant">
                        {t("digest", { digest: error.digest })}
                    </p>
                )}

                <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                    <Button
                        type="button"
                        variant="primary"
                        size="md"
                        onClick={reset}
                    >
                        {t("tryAgain")}
                    </Button>

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
            </div>
        </main>
    );
}