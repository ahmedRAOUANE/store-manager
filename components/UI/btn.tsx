import { cn } from "@/utils/jsx-classes";
import type { ComponentProps, ReactNode } from "react";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

/* -------------------------------------------------------------------------- */
/*  Class maps — all values resolve to tokens in globals.css                   */
/* -------------------------------------------------------------------------- */

/**
 * Variant treatments — per the design system:
 *   primary     → #1E293B base, #334155 hover, #0F172A active
 *   secondary   → white surface, outline border, neutral hover
 *   ghost       → transparent (a.k.a. "tertiary"), subtle grey hover
 *   destructive → rose, for irreversible actions only
 */
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
    primary:
        "bg-primary-container text-on-primary hover:bg-slate-700 active:bg-on-surface",
    secondary:
        "border border-outline-variant bg-surface-lowest text-on-surface hover:bg-slate-50 active:bg-slate-100",
    ghost:
        "text-on-surface-variant hover:bg-slate-100 hover:text-on-surface active:bg-slate-200",
    destructive:
        "bg-danger text-on-primary hover:bg-rose-700 active:bg-danger-fg",
};

/**
 * Sizes — heights per the design system:
 *   sm → 32px (dense table rows, inline actions)
 *   md → 36px (compact — the default for toolbars and forms)
 *   lg → 40px (default — page headers, modal footers, empty-state CTAs)
 */
const SIZE_CLASSES: Record<ButtonSize, string> = {
    sm: "h-8 min-w-8 gap-1.5 px-3 text-label-md",
    md: "h-9 min-w-9 gap-2 px-3.5 text-body-md",
    lg: "h-10 min-w-10 gap-2 px-4 text-body-md",
};

/**
 * Icon-only overrides — square, no horizontal padding.
 * Applied *after* SIZE_CLASSES so it wins the twMerge conflict.
 */
const ICON_ONLY_CLASSES: Record<ButtonSize, string> = {
    sm: "size-8 px-0",
    md: "size-9 px-0",
    lg: "size-10 px-0",
};

const BASE_CLASSES = [
    "inline-flex shrink-0 items-center justify-center rounded-md font-medium",
    "transition-colors select-none",
    "disabled:pointer-events-none disabled:opacity-50",
    "aria-disabled:pointer-events-none aria-disabled:opacity-50",
].join(" ");

/* -------------------------------------------------------------------------- */
/*  Variant helper — for <Link>, <a>, or any custom element                    */
/* -------------------------------------------------------------------------- */

export interface ButtonVariantOptions {
    variant?: ButtonVariant;
    size?: ButtonSize;
    /** When true, produces a square icon-only button box. */
    iconOnly?: boolean;
    fullWidth?: boolean;
    className?: string;
}

/**
 * Returns the class string for a given button appearance.
 *
 * Use this when you need button styling on a non-<button> element:
 *
 *   <Link href="/stores/1/products/new" className={buttonVariants({ variant: "primary" })}>
 *     Add Product
 *   </Link>
 */
export function buttonVariants({
    variant = "primary",
    size = "md",
    iconOnly = false,
    fullWidth = false,
    className,
}: ButtonVariantOptions = {}): string {
    return cn(
        BASE_CLASSES,
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        iconOnly && ICON_ONLY_CLASSES[size],
        fullWidth && "w-full",
        className,
    );
}

/* -------------------------------------------------------------------------- */
/*  Spinner — CSS-only, no JS, respects prefers-reduced-motion                 */
/* -------------------------------------------------------------------------- */

function ButtonSpinner({ size }: { size: ButtonSize }) {
    const px = size === "sm" ? 14 : size === "md" ? 16 : 18;

    return (
        <svg
            aria-hidden="true"
            width={px}
            height={px}
            viewBox="0 0 24 24"
            fill="none"
            className="animate-spin motion-reduce:animate-none"
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
    );
}

/* -------------------------------------------------------------------------- */
/*  Button                                                                    */
/* -------------------------------------------------------------------------- */

export interface ButtonProps extends ComponentProps<"button"> {
    variant?: ButtonVariant;
    size?: ButtonSize;

    /** Renders a leading icon (or spinner) before the children. */
    leadingIcon?: ReactNode;
    /** Renders a trailing icon after the children. Hidden while loading. */
    trailingIcon?: ReactNode;

    /** When true, replaces the leading icon with a spinner and disables the button. */
    loading?: boolean;
    /** Strips padding and forces a square aspect. Children should be a single icon. */
    iconOnly?: boolean;
    /** Stretches the button to fill its container. */
    fullWidth?: boolean;
}

export function Button({
    variant = "primary",
    size = "md",
    leadingIcon,
    trailingIcon,
    loading = false,
    iconOnly = false,
    fullWidth = false,
    disabled,
    className,
    children,
    type = "button",
    ...props
}: ButtonProps) {
    return (
        <button
            type={type}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            className={buttonVariants({ variant, size, iconOnly, fullWidth, className })}
            {...props}
        >
            {loading ? (
                <ButtonSpinner size={size} />
            ) : (
                leadingIcon
            )}
            {!iconOnly && children}
            {!loading && trailingIcon}
        </button>
    );
}