"use client";

import Link from "next/link";

/**
 * Global error boundary. Catches errors that escape the root layout —
 * which means this component must render its own <html> and <body>.
 *
 * Because the root layout is being replaced, NextIntlClientProvider is
 * not present, so `useTranslations` is not available here. All copy is
 * hardcoded English. This is intentional: this file should almost never
 * fire, and when it does, the priority is rendering *something* usable
 * rather than a raw error stack.
 *
 * If the root layout (or its providers) has a bug, that bug will surface
 * here as English-only text. That's an acceptable trade-off for a
 * fallback-of-last-resort page.
 */
export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html lang="en">
            <body
                style={{
                    margin: 0,
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "1.5rem",
                    fontFamily: "system-ui, sans-serif",
                    background: "#f8f9ff",
                    color: "#0b1c30",
                }}
            >
                <div
                    style={{
                        maxWidth: "28rem",
                        textAlign: "center",
                    }}
                >
                    <h1
                        style={{
                            fontSize: "1.5rem",
                            fontWeight: 600,
                            margin: 0,
                        }}
                    >
                        Something went wrong
                    </h1>

                    <p
                        style={{
                            marginTop: "0.5rem",
                            color: "#45474c",
                        }}
                    >
                        The application encountered an unexpected error.
                    </p>

                    {error.digest && (
                        <p
                            style={{
                                marginTop: "0.75rem",
                                fontFamily: "monospace",
                                fontSize: "0.75rem",
                                color: "#75777d",
                            }}
                        >
                            Reference: {error.digest}
                        </p>
                    )}

                    <div
                        style={{
                            marginTop: "1.5rem",
                            display: "flex",
                            gap: "0.5rem",
                            justifyContent: "center",
                            flexWrap: "wrap",
                        }}
                    >
                        <button
                            type="button"
                            onClick={reset}
                            style={{
                                padding: "0.5rem 1rem",
                                borderRadius: "0.375rem",
                                border: "1px solid #091426",
                                background: "#091426",
                                color: "#ffffff",
                                cursor: "pointer",
                                fontSize: "0.875rem",
                                fontWeight: 500,
                            }}
                        >
                            Try again
                        </button>

                        <Link
                            href="/"
                            style={{
                                padding: "0.5rem 1rem",
                                borderRadius: "0.375rem",
                                border: "1px solid #c5c6cd",
                                background: "#ffffff",
                                color: "#0b1c30",
                                textDecoration: "none",
                                fontSize: "0.875rem",
                                fontWeight: 500,
                            }}
                        >
                            Go home
                        </Link>
                    </div>
                </div>
            </body>
        </html>
    );
}