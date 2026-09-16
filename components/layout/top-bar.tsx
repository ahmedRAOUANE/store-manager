import { cn } from "@/utils/jsx-classes";
import type { ReactNode } from "react";

export interface TopBarProps {
    /** Left slot — typically the mobile nav trigger, hidden on desktop. */
    leading?: ReactNode;
    /** Right slot — typically the user menu, plus any optional icon buttons. */
    trailing?: ReactNode;
    className?: string;
}

export function TopBar({ leading, trailing, className }: TopBarProps) {
    return (
        <header
            className={cn(
                "flex h-full shrink-0 items-center justify-between gap-3 p-2",
                "border-b border-outline-variant bg-surface-lowest px-3 sm:px-4",
                className,
            )}
        >
            <div className="flex min-w-0 items-center gap-2">{leading}</div>
            <div className="flex shrink-0 items-center gap-1.5">{trailing}</div>
        </header>
    );
}