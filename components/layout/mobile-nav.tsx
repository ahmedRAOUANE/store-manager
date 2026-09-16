"use client";

import { useRef } from "react";
import { SidebarContent, type SidebarContentProps } from "./app-sidebar";
import { cn } from "@/utils/jsx-classes";

function MenuIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-5"
            aria-hidden="true"
        >
            <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
    );
}

export type MobileNavProps = Omit<SidebarContentProps, "onNavigate">;

export function MobileNav(props: MobileNavProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);

    const open = () => dialogRef.current?.showModal();
    const close = () => dialogRef.current?.close();

    return (
        <>
            <button
                type="button"
                onClick={open}
                aria-label="Open navigation"
                className={cn(
                    "inline-flex size-9 items-center justify-center rounded-md lg:hidden",
                    "text-on-surface-variant transition-colors",
                    "hover:bg-slate-100 hover:text-on-surface",
                )}
            >
                <MenuIcon />
            </button>

            <dialog
                ref={dialogRef}
                onClick={(e) => {
                    if (e.target === dialogRef.current) close();
                }}
                className={cn(
                    "fixed inset-0 z-50 m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-transparent p-0",
                    "backdrop:bg-slate-900/40 backdrop:backdrop-blur-[2px]",
                    "lg:hidden",
                )}
            >
                <aside
                    className="h-full w-72 max-w-[80vw] border-r border-outline-variant bg-surface-lowest shadow-overlay"
                    aria-label="Navigation"
                >
                    <SidebarContent {...props} onNavigate={close} />
                </aside>
            </dialog>
        </>
    );
}