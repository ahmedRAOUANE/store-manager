
/* -------------------------------------------------------------------------- */
/*  Tone system                                                               */
/* -------------------------------------------------------------------------- */

import { cn } from "@/utils/jsx-classes";
import { useTranslations } from "next-intl";

export type StatusTone = "success" | "warning" | "danger" | "neutral" | "info";

/**
 * Surface treatments — pulled from the semantic tokens declared in globals.css.
 * These map directly onto the design-system contract:
 *   success → Paid / Active / In Stock
 *   warning → Partial / Pending / Low Stock
 *   danger  → Unpaid / Suspended / Out of Stock
 *   neutral → Draft / Inactive
 *   info    → Roles, administrative context — used sparingly
 */
const TONE_SURFACE: Record<StatusTone, string> = {
    success: "border-success-border bg-success-bg text-success-fg",
    warning: "border-warning-border bg-warning-bg text-warning-fg",
    danger: "border-danger-border bg-danger-bg text-danger-fg",
    neutral: "border-outline-variant bg-surface-low text-on-surface-variant",
    info: "border-info-border bg-info-bg text-info-fg",
};

const TONE_DOT: Record<StatusTone, string> = {
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    neutral: "bg-outline",
    info: "bg-info",
};

/* -------------------------------------------------------------------------- */
/*  Status registry                                                           */
/* -------------------------------------------------------------------------- */

type StatusDefinition = {
    translationKey: string;
    tone: StatusTone;
};

/**
 * Every status value that can appear in the UI, normalised to a label + tone.
 * Keys are intentionally SCREAMING_CASE to match the domain schemas
 * (StoreStatus, MembershipStatus, GlobalRole, StoreRole, payment state, stock state).
 */
const STATUS_REGISTRY = {
    ACTIVE: { translationKey: "active", tone: "success" },
    PENDING: { translationKey: "pending", tone: "warning" },
    SUSPENDED: { translationKey: "suspended", tone: "danger" },
    REJECTED: { translationKey: "rejected", tone: "danger" },
    INACTIVE: { translationKey: "inactive", tone: "neutral" },
    INVALIDATED: { translationKey: "removed", tone: "neutral" },

    PAID: { translationKey: "paid", tone: "success" },
    PARTIAL: { translationKey: "partial", tone: "warning" },
    UNPAID: { translationKey: "unpaid", tone: "danger" },

    IN_STOCK: { translationKey: "inStock", tone: "success" },
    LOW_STOCK: { translationKey: "lowStock", tone: "warning" },
    OUT_OF_STOCK: { translationKey: "outOfStock", tone: "danger" },

    OWNER: { translationKey: "owner", tone: "info" },
    MANAGER: { translationKey: "manager", tone: "info" },
    STAFF: { translationKey: "staff", tone: "neutral" },

    ADMIN: { translationKey: "admin", tone: "info" },
    USER: { translationKey: "user", tone: "neutral" },
} as const satisfies Record<string, StatusDefinition>;

export type StatusKey = keyof typeof STATUS_REGISTRY;

/* -------------------------------------------------------------------------- */
/*  Derivation helpers — pure, server-safe                                    */
/* -------------------------------------------------------------------------- */

/**
 * Resolve a payment state from a document's amounts.
 * Mirrors the semantics of `amountDue` in sale.schema.ts / purchase.schema.ts.
 */
export function getPaymentStatus(
    amountPaid: number,
    amountDue: number,
): Extract<StatusKey, "PAID" | "PARTIAL" | "UNPAID"> {
    if (amountDue <= 0) return "PAID";
    if (amountPaid > 0) return "PARTIAL";
    return "UNPAID";
}

/**
 * Resolve stock health from a product's quantities.
 * A product that is explicitly deactivated is shown as INACTIVE
 * rather than being reported as out of stock.
 */
export function getStockStatus(
    stockQuantity: number,
    minimumStock: number,
    isActive = true,
): Extract<StatusKey, "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "INACTIVE"> {
    if (!isActive) return "INACTIVE";
    if (stockQuantity <= 0) return "OUT_OF_STOCK";
    if (stockQuantity <= minimumStock) return "LOW_STOCK";
    return "IN_STOCK";
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

type StatusBadgeSize = "sm" | "md";

const SIZE_CLASSES: Record<StatusBadgeSize, string> = {
    /* label-sm (11px / 14px) — compact default for dense table cells. */
    sm: "h-[22px] px-2 text-label-sm",
    /* label-md (13px / 18px) — used on detail pages and standalone chips. */
    md: "h-6 px-2.5 text-label-md",
};

export interface StatusBadgeProps {
    /** A known status key. Takes precedence over `tone` + `label`. */
    status?: StatusKey;
    /** Escape hatch for one-off states not worth adding to the registry. */
    tone?: StatusTone;
    /** Required when `status` is not provided. */
    label?: string;
    /** Hide the leading dot — only for very dense contexts (e.g. table cells). */
    hideDot?: boolean;
    size?: StatusBadgeSize;
    className?: string;
}

export function StatusBadge({
    status,
    tone,
    label,
    hideDot = false,
    size = "sm",
    className,
}: StatusBadgeProps) {
    const t = useTranslations("status");

    const resolved = status
        ? STATUS_REGISTRY[status]
        : {
            translationKey: "",
            tone: tone ?? "neutral",
        };

    const resolvedLabel = status
        ? t(resolved.translationKey)
        : (label ?? "");

    return (
        <span
            className={cn(
                "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border font-semibold uppercase",
                TONE_SURFACE[resolved.tone],
                SIZE_CLASSES[size],
                className,
            )}
        >
            {!hideDot && (
                <span
                    aria-hidden="true"
                    className={cn("size-1.5 shrink-0 rounded-full", TONE_DOT[resolved.tone])}
                />
            )}
            {resolvedLabel}
        </span>
    );
}