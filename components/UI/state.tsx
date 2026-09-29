import { cn } from "@/utils/jsx-classes";
import { Inbox, LoaderCircle, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
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
    label,
    size = "md",
    className,
}: LoadingStateProps) {
    const isSm = size === "sm";
    const t = useTranslations("common");
    const resolvedLabel = label ?? t("loading");

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
            <LoaderCircle
                aria-hidden="true"
                className={cn(
                    "animate-spin text-on-surface-variant motion-reduce:animate-none",
                    isSm ? "size-4" : "size-5",
                )}
            />
            <p className="text-body-sm text-on-surface-variant">{resolvedLabel}</p>
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
    title,
    description,
    ...props
}: ErrorStateProps) {
    const t = useTranslations("errors");

    return (
        <StateShell
            icon={<TriangleAlert />}
            title={title ?? t("generic")}
            description={description ?? t("loadRetry")}
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
