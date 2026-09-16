import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "./card";
import { cn } from "@/utils/jsx-classes";

/* -------------------------------------------------------------------------- */
/*  Tone for the value                                                        */
/* -------------------------------------------------------------------------- */

type StatTone = "default" | "success" | "warning" | "danger" | "info";

const TONE_VALUE: Record<StatTone, string> = {
    default: "text-on-surface",
    success: "text-success-fg",
    warning: "text-warning-fg",
    danger: "text-danger-fg",
    info: "text-info-fg",
};

/* -------------------------------------------------------------------------- */
/*  Delta — small trend indicator under the value                             */
/* -------------------------------------------------------------------------- */

export interface StatDelta {
    /** Numeric percent (e.g. 12.5 → "+12.5%"). Sign decides direction. */
    value: number;
    /** Optional caption rendered after the delta, e.g. "vs last month". */
    label?: string;
    /**
     * Flip the color mapping. Set to `true` for metrics where up is bad
     * (e.g. outstanding payments, low-stock count).
     */
    invert?: boolean;
}

function DeltaArrow({ up }: { up: boolean }) {
    return (
        <svg
            aria-hidden="true"
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className={cn(up ? "rotate-0" : "rotate-180")}
        >
            <path
                d="M6 2.5 10 7H2l4-4.5Z"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function StatDeltaPill({ value, label, invert = false }: StatDelta) {
    const up = value >= 0;
    const positive = invert ? !up : up;
    const formatted = `${up ? "+" : ""}${value.toFixed(1)}%`;

    return (
        <span className="inline-flex items-center gap-1.5 text-body-sm">
            <span
                className={cn(
                    "inline-flex items-center gap-0.5 font-medium tabular-nums",
                    positive ? "text-success-fg" : "text-danger-fg",
                )}
            >
                <DeltaArrow up={up} />
                {formatted}
            </span>
            {label && <span className="text-on-surface-variant">{label}</span>}
        </span>
    );
}

/* -------------------------------------------------------------------------- */
/*  StatCard                                                                  */
/* -------------------------------------------------------------------------- */

export interface StatCardProps {
    /** Eyebrow label. Rendered uppercase. */
    label: string;
    /**
     * The headline metric. Accepts a pre-formatted string or a number.
     * Numbers are rendered inside a `tabular-nums` context — digits never jitter.
     */
    value: ReactNode;
    /** Optional caption rendered under the value (e.g. "12 sales"). */
    hint?: ReactNode;
    /** Optional trend indicator. */
    delta?: StatDelta;
    /** Optional leading icon. Sized to 16px internally. */
    icon?: ReactNode;
    /** Colors the value. Use sparingly — statuses, alerts, over-due amounts. */
    tone?: StatTone;
    /** When provided, the whole tile becomes a link. */
    href?: string;
    className?: string;
}

export function StatCard({
    label,
    value,
    hint,
    delta,
    icon,
    tone = "default",
    href,
    className,
}: StatCardProps) {
    const content = (
        <>
            <div className="flex items-start justify-between gap-3">
                <p className="text-label-sm uppercase tracking-wider text-on-surface-variant">
                    {label}
                </p>
                {icon && (
                    <span
                        aria-hidden="true"
                        className="shrink-0 text-on-surface-variant [&>svg]:size-4"
                    >
                        {icon}
                    </span>
                )}
            </div>

            <div className="mt-2">
                <p
                    className={cn(
                        "text-numeric-lg tabular-nums leading-none",
                        TONE_VALUE[tone],
                    )}
                >
                    {value}
                </p>

                {(delta || hint) && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-body-sm text-on-surface-variant">
                        {delta && <StatDeltaPill {...delta} />}
                        {hint && <span>{hint}</span>}
                    </div>
                )}
            </div>
        </>
    );

    const cardClasses = cn("p-4", className);

    if (href) {
        return (
            <Link href={href} className="block">
                <Card interactive className={cardClasses}>
                    {content}
                </Card>
            </Link>
        );
    }

    return <Card className={cardClasses}>{content}</Card>;
}