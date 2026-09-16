// utils/format.ts
import "temporal-polyfill/full/global";

/* -------------------------------------------------------------------------- */
/*  Currency                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Locale used for all `Intl` formatting. Change this to switch the whole app
 * to a different presentation (e.g. "en-US", "ar-DZ").
 */
const LOCALE = "fr-DZ";

/**
 * Default currency when the caller doesn't pass one. DZD uses no minor units
 * in everyday use, but business software keeps two decimals for arithmetic
 * (averages, proportions, tax bases).
 */
const DEFAULT_CURRENCY = "DZD";

/**
 * Per-call `Intl.NumberFormat` instances are expensive.
 * Cache one formatter per currency code, reused across renders.
 */
const currencyCache = new Map<string, Intl.NumberFormat>();

function currencyFormatter(currency: string): Intl.NumberFormat {
    let fmt = currencyCache.get(currency);
    if (!fmt) {
        fmt = new Intl.NumberFormat(LOCALE, {
            style: "currency",
            currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
        currencyCache.set(currency, fmt);
    }
    return fmt;
}

export function formatCurrency(
    value: number,
    currency: string = DEFAULT_CURRENCY,
): string {
    return currencyFormatter(currency).format(value);
}

/* -------------------------------------------------------------------------- */
/*  Dates — all inputs are Temporal.Instant from the schemas                  */
/* -------------------------------------------------------------------------- */

const dateFmt = new Intl.DateTimeFormat(LOCALE, {
    month: "short",
    day: "numeric",
    year: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat(LOCALE, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
});

export function formatDate(instant: Temporal.Instant): string {
    return dateFmt.format(new Date(instant.epochMilliseconds));
}

export function formatDateTime(instant: Temporal.Instant): string {
    return dateTimeFmt.format(new Date(instant.epochMilliseconds));
}