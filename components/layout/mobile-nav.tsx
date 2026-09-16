"use client";

import { Menu } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { SidebarContent, type SidebarContentProps } from "./app-sidebar";
import { cn } from "@/utils/jsx-classes";

export type MobileNavProps = Omit<SidebarContentProps, "onNavigate">;

/** Keep this in sync with the transition durations below. */
const TRANSITION_MS = 250;

/** Runs after the browser has painted the current frame. */
function afterPaint(callback: () => void) {
    requestAnimationFrame(() => requestAnimationFrame(callback));
}

export function MobileNav(props: MobileNavProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const closeTimer = useRef<number | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    const cancelCloseTimer = useCallback(() => {
        if (closeTimer.current !== null) {
            window.clearTimeout(closeTimer.current);
            closeTimer.current = null;
        }
    }, []);

    const open = useCallback(() => {
        const dialog = dialogRef.current;
        if (!dialog || dialog.open) return;

        cancelCloseTimer();
        dialog.showModal();

        // The <dialog> is in the top layer now, but the panel is still at
        // `-translate-x-full`. Flip the state on the *next* paint so the
        // browser has a start value to transition from instead of snapping.
        afterPaint(() => setIsOpen(true));
    }, [cancelCloseTimer]);

    const close = useCallback(() => {
        setIsOpen(false);
        cancelCloseTimer();

        // Keep the <dialog> in the top layer until the exit transition has
        // finished, otherwise it (and its backdrop) vanish instantly.
        closeTimer.current = window.setTimeout(() => {
            closeTimer.current = null;
            dialogRef.current?.close();
        }, TRANSITION_MS);
    }, [cancelCloseTimer]);

    // Escape closes a <dialog> natively — intercept it so we can animate out.
    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        const handleCancel = (event: Event) => {
            event.preventDefault();
            close();
        };
        const handleClose = () => setIsOpen(false);

        dialog.addEventListener("cancel", handleCancel);
        dialog.addEventListener("close", handleClose);
        return () => {
            dialog.removeEventListener("cancel", handleCancel);
            dialog.removeEventListener("close", handleClose);
        };
    }, [close]);

    useEffect(() => cancelCloseTimer, [cancelCloseTimer]);

    return (
        <>
            <button
                type="button"
                onClick={open}
                aria-label="Open navigation"
                className={cn(
                    "inline-flex size-9 items-center justify-center rounded-md md:hidden",
                    "text-on-surface-variant transition-colors",
                    "hover:bg-surface-container-high hover:text-on-surface",
                )}
            >
                <Menu className="size-5" />
            </button>

            <dialog
                ref={dialogRef}
                onClick={(event) => {
                    if (event.target === dialogRef.current) {
                        close();
                    }
                }}
                className={cn(
                    "fixed inset-0 z-50 m-0 h-dvh max-h-none w-screen max-w-none",
                    "border-0 bg-transparent p-0",
                    "lg:hidden",
                    // Backdrop fades in/out with the panel.
                    "backdrop:bg-slate-900/40 backdrop:backdrop-blur-[2px]",
                    "backdrop:transition-opacity backdrop:duration-250 backdrop:ease-out",
                    isOpen ? "backdrop:opacity-100" : "backdrop:opacity-0",
                )}
            >
                <aside
                    className={cn(
                        "h-full w-72 max-w-[80vw]",
                        "border-r border-outline-variant bg-surface-lowest shadow-overlay",
                        "transition-transform duration-250 ease-out",
                        "motion-reduce:transition-none",
                        isOpen ? "translate-x-0" : "-translate-x-full",
                    )}
                    aria-label="Navigation"
                >
                    <SidebarContent {...props} onNavigate={close} />
                </aside>
            </dialog>
        </>
    );
}