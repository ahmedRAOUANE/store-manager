import type {
    ComponentProps,
    ReactNode,
    SelectHTMLAttributes,
} from "react";
import { cn } from "@/utils/jsx-classes";

/* ========================================================================== */
/*  Shared field chrome                                                       */
/* ========================================================================== */

const CONTROL_BASE = [
    "w-full rounded-md border bg-surface-lowest text-body-md text-on-surface",
    "placeholder:text-outline",
    "transition-colors",
    "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-on-surface-variant",
    "focus:outline-none focus:ring-1",
].join(" ");

const CONTROL_IDLE = [
    "border-outline-variant",
    "hover:border-outline",
    "focus:border-info focus:ring-info",
].join(" ");

const CONTROL_INVALID = [
    "border-danger",
    "focus:border-danger focus:ring-danger",
].join(" ");

/* ========================================================================== */
/*  FormField — label + description/error + input slot                        */
/* ========================================================================== */

export interface FormFieldProps {
    /** Visible label. */
    label: string;
    /**
     * The `id` of the control this field labels. Every control below exposes
     * its `id` via props — always pass the same value here and to the control.
     */
    htmlFor: string;
    /** Short help text under the control. Hidden when `error` is present. */
    description?: ReactNode;
    /** Error message. Renders red under the control and marks `aria-invalid`. */
    error?: string;
    /** Shows a red asterisk next to the label. */
    required?: boolean;
    className?: string;
    children: ReactNode;
}

export function FormField({
    label,
    htmlFor,
    description,
    error,
    required = false,
    className,
    children,
}: FormFieldProps) {
    const descriptionId = description ? `${htmlFor}-description` : undefined;
    const errorId = error ? `${htmlFor}-error` : undefined;

    return (
        <div className={cn("space-y-1.5", className)}>
            <label
                htmlFor={htmlFor}
                className="block text-label-md text-on-surface"
            >
                {label}
                {required && (
                    <span
                        aria-hidden="true"
                        className="ml-0.5 text-danger"
                    >
                        *
                    </span>
                )}
            </label>

            {children}

            {error ? (
                <p
                    id={errorId}
                    role="alert"
                    className="text-body-sm text-danger-fg"
                >
                    {error}
                </p>
            ) : description ? (
                <p id={descriptionId} className="text-body-sm text-on-surface-variant">
                    {description}
                </p>
            ) : null}
        </div>
    );
}

/* ========================================================================== */
/*  Input                                                                     */
/* ========================================================================== */

export interface InputProps extends ComponentProps<"input"> {
    /** Renders the field in an error state — border + focus ring go red. */
    invalid?: boolean;
    /** Optional leading icon (drawn at 16px). Adds left padding automatically. */
    leadingIcon?: ReactNode;
    /** Optional trailing element (icon, unit label, clear button). */
    trailingSlot?: ReactNode;
}

export function Input({
    invalid = false,
    leadingIcon,
    trailingSlot,
    className,
    type = "text",
    ...props
}: InputProps) {
    const base = cn(
        CONTROL_BASE,
        invalid ? CONTROL_INVALID : CONTROL_IDLE,
        "h-9",
        leadingIcon ? "pl-9" : "pl-3",
        trailingSlot ? "pr-9" : "pr-3",
        className,
    );

    /* No slots — render the bare input with no wrapper. */
    if (!leadingIcon && !trailingSlot) {
        return (
            <input
                type={type}
                aria-invalid={invalid || undefined}
                className={base}
                {...props}
            />
        );
    }

    /* Wrapped with slots. */
    return (
        <div className="relative">
            {leadingIcon && (
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant [&>svg]:size-4"
                >
                    {leadingIcon}
                </span>
            )}
            <input
                type={type}
                aria-invalid={invalid || undefined}
                className={base}
                {...props}
            />
            {trailingSlot && (
                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-on-surface-variant">
                    {trailingSlot}
                </span>
            )}
        </div>
    );
}

/* ========================================================================== */
/*  Textarea                                                                  */
/* ========================================================================== */

export interface TextareaProps extends ComponentProps<"textarea"> {
    invalid?: boolean;
}

export function Textarea({
    invalid = false,
    className,
    rows = 4,
    ...props
}: TextareaProps) {
    return (
        <textarea
            rows={rows}
            aria-invalid={invalid || undefined}
            className={cn(
                CONTROL_BASE,
                invalid ? CONTROL_INVALID : CONTROL_IDLE,
                "min-h-22 resize-y px-3 py-2 leading-6",
                className,
            )}
            {...props}
        />
    );
}

/* ========================================================================== */
/*  Select                                                                    */
/* ========================================================================== */

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    invalid?: boolean;
}

export function Select({
    invalid = false,
    className,
    children,
    ...props
}: SelectProps) {
    return (
        <div className="relative">
            <select
                aria-invalid={invalid || undefined}
                className={cn(
                    CONTROL_BASE,
                    invalid ? CONTROL_INVALID : CONTROL_IDLE,
                    "h-9 cursor-pointer appearance-none pl-3 pr-9",
                    className,
                )}
                {...props}
            >
                {children}
            </select>

            <svg
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-on-surface-variant"
            >
                <path
                    d="m4 6 4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </div>
    );
}

/* ========================================================================== */
/*  FormActions — sticky footer bar                                           */
/* ========================================================================== */

export interface FormActionsProps {
    /**
     * Left-side content — typically a "Delete" or "Discard" ghost button.
     * Hidden on mobile by default (see `primary` alignment below).
     */
    secondary?: ReactNode;
    /** Right-side primary content — a Save / Create button, plus optional Cancel. */
    primary: ReactNode;
    className?: string;
}

/**
 * Bottom-of-form action bar.
 *
 * Mobile: sticks to the bottom of the scroll container so the primary action
 * is always reachable without scrolling back down a long form.
 * Desktop: renders in-flow at the end of the form.
 */
export function FormActions({
    secondary,
    primary,
    className,
}: FormActionsProps) {
    return (
        <div
            className={cn(
                "sticky bottom-0 z-10 -mx-4 flex items-center justify-end gap-2 border-t border-outline-variant bg-surface-lowest/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 md:static md:z-auto md:mx-0 md:border-t-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none",
                "md:justify-between",
                className,
            )}
        >
            {secondary && (
                <div className="hidden md:flex md:items-center md:gap-2">
                    {secondary}
                </div>
            )}
            <div className="flex items-center gap-2">{primary}</div>
        </div>
    );
}