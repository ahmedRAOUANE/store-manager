import { cn } from "@/utils/jsx-classes";
import type { ComponentProps } from "react";

/* -------------------------------------------------------------------------- */
/*  Card — root container                                                     */
/* -------------------------------------------------------------------------- */

export interface CardProps extends ComponentProps<"div"> {
  /**
   * Renders the card with an interactive appearance (hover border shift + cursor).
   * Use when the entire card is a link or clickable surface.
   */
  interactive?: boolean;
}

export function Card({
  interactive = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-lowest",
        interactive && [
          "cursor-pointer transition-colors",
          "hover:border-outline hover:bg-slate-50/40",
          "focus-visible:border-info",
        ],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  CardHeader — title row + optional actions                                 */
/* -------------------------------------------------------------------------- */

export interface CardHeaderProps extends ComponentProps<"div"> {
  /** When true, removes the bottom border — for cards whose header sits flush against body. */
  borderless?: boolean;
}

export function CardHeader({
  borderless = false,
  className,
  children,
  ...props
}: CardHeaderProps) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "flex items-start justify-between gap-3 px-4 py-3",
        !borderless && "border-b border-outline-variant",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  CardTitle / CardDescription — typography slots                            */
/* -------------------------------------------------------------------------- */

export function CardTitle({
  className,
  children,
  ...props
}: ComponentProps<"h3">) {
  return (
    <h3
      data-slot="card-title"
      className={cn(
        "text-headline-sm text-on-surface leading-tight",
        className,
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("mt-0.5 text-body-sm text-on-surface-variant", className)}
      {...props}
    >
      {children}
    </p>
  );
}

/**
 * CardActions — right-aligned slot in the header row.
 * Holds icon buttons, "View all" links, or filter dropdowns.
 */
export function CardActions({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-actions"
      className={cn("flex shrink-0 items-center gap-1", className)}
      {...props}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  CardBody                                                                  */
/* -------------------------------------------------------------------------- */

export interface CardBodyProps extends ComponentProps<"div"> {
  /**
   * Removes internal padding. Use when the body contains a table or list
   * that manages its own spacing to the card's edges.
   */
  flush?: boolean;
}

export function CardBody({
  flush = false,
  className,
  children,
  ...props
}: CardBodyProps) {
  return (
    <div
      data-slot="card-body"
      className={cn("flex-1", !flush && "px-4 py-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  CardFooter                                                                */
/* -------------------------------------------------------------------------- */

export interface CardFooterProps extends ComponentProps<"div"> {
  /** When true, adds a top hairline — use when the footer visually separates from the body. */
  bordered?: boolean;
}

export function CardFooter({
  bordered = false,
  className,
  children,
  ...props
}: CardFooterProps) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center justify-between gap-3 px-4 py-3",
        bordered && "border-t border-outline-variant",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}