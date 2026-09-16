import { cn } from "@/utils/jsx-classes";
import { Inbox, TriangleAlert } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

/* -------------------------------------------------------------------------- */
/*  Shared shell                                                              */
/* -------------------------------------------------------------------------- */

interface StateShellProps {
    icon: ReactNode;
    title: string;
    description?: ReactNode;
    action?: ReactNode;
    /** `sm` for in-card panels; `md` (default) for full-page empties. */
    size?: "sm" | "md";
    className?: string;
}

function StateShell({
    icon,
    title,
    description,
    action,
    size = "md",
    className,
}: StateShellProps) {
    const isSm = size === "sm";

    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center text-center",
                isSm ? "gap-2 px-4 py-6" : "gap-3 px-6 py-10 md:py-14",
                className,
            )}
        >
            <span
                aria-hidden="true"
                className={cn(
                    "flex items-center justify-center rounded-full border border-outline-variant bg-surface-low text-on-surface-variant",
                    isSm ? "size-9 [&>svg]:size-4" : "size-11 [&>svg]:size-5",
                )}
            >
                {icon}
            </span>

            <div className="space-y-1">
                <p
                    className={cn(
                        "text-on-surface",
                        isSm ? "text-title-md" : "text-headline-sm",
                    )}
                >
                    {title}
                </p>
                {description && (
                    <p
                        className={cn(
                            "text-on-surface-variant",
                            isSm ? "text-body-sm" : "text-body-md",
                        )}
                    >
                        {description}
                    </p>
                )}
            </div>

            {action && <div className="mt-1">{action}</div>}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*  EmptyState                                                                */
/* -------------------------------------------------------------------------- */

export interface EmptyStateProps
    extends Omit<StateShellProps, "icon"> {
    /** Optional icon. Defaults to a generic "inbox" glyph. */
    icon?: ReactNode;
}

export function EmptyState({ icon, ...props }: EmptyStateProps) {
    return <StateShell icon={icon ?? <Inbox />} {...props} />;
}

/* -------------------------------------------------------------------------- */
/*  LoadingState                                                              */
/* -------------------------------------------------------------------------- */

export interface LoadingStateProps {
    /** Message shown under the spinner. Defaults to "Loading…". */
    label?: string;
    /** `sm` for in-card panels; `md` (default) for full-page loads. */
    size?: "sm" | "md";
    className?: string;
}

export function LoadingState({
    label = "Loading…",
    size = "md",
    className,
}: LoadingStateProps) {
    const isSm = size === "sm";
    const px = isSm ? 16 : 20;

    return (
        <div
            role="status"
            aria-live="polite"
            className={cn(
                "flex flex-col items-center justify-center gap-3",
                isSm ? "px-4 py-6" : "px-6 py-12 md:py-16",
                className,
            )}
        >
            <svg
                width={px}
                height={px}
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="animate-spin text-on-surface-variant motion-reduce:animate-none"
            >
                <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="opacity-25"
                />
                <path
                    d="M22 12a10 10 0 0 1-10 10"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                />
            </svg>
            <p className="text-body-sm text-on-surface-variant">{label}</p>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*  ErrorState                                                                */
/* -------------------------------------------------------------------------- */

export interface ErrorStateProps extends Omit<StateShellProps, "icon" | "title" | "description"> {
    title?: string;
    description?: ReactNode;
}

export function ErrorState({
    title = "Something went wrong",
    description = "We couldn't load this information. Please try again.",
    ...props
}: ErrorStateProps) {
    return (
        <StateShell
            icon={<TriangleAlert />}
            title={title}
            description={description}
            {...props}
        />
    );
}

/* -------------------------------------------------------------------------- */
/*  Skeleton — the primitive LoadingState is often used with                  */
/* -------------------------------------------------------------------------- */

export function Skeleton({
    className,
    ...props
}: ComponentProps<"div">) {
    return (
        <div
            aria-hidden="true"
            className={cn(
                "animate-pulse rounded-md bg-surface-container motion-reduce:animate-none",
                className,
            )}
            {...props}
        />
    );
}
