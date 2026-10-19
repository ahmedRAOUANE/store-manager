import { handleAuth } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

const kindeHandler = handleAuth();

/**
 * Wrap the Kinde auth handler so that any 5xx response (token
 * validation failures, state mismatches, expired callbacks, upstream
 * Kinde outages) is redirected to `/auth/error` instead of being
 * rendered to the user as a raw JSON body.
 *
 * `error.tsx` cannot catch these — Route Handler responses bypass
 * React's error boundary entirely. This is the only place the
 * redirect can happen.
 */
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ kindeAuth: string }> },
) {
    try {
        const response = await kindeHandler(request, context);

        if (response.status >= 500) {
            console.warn(
                `api/auth/[kindeAuth] > Kinde returned ${response.status}; redirecting to /auth/error`,
            );

            return NextResponse.redirect(
                new URL(
                    "/auth/error?reason=callback_failed",
                    request.url,
                ),
            );
        }

        return response;
    } catch (error) {
        console.error(
            "api/auth/[kindeAuth] > handler threw; redirecting to /auth/error",
            error,
        );

        return NextResponse.redirect(
            new URL("/auth/error?reason=unexpected", request.url),
        );
    }
}