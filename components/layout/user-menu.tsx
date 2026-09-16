"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SidebarAvatar } from "./app-sidebar";
import { cn } from "@/utils/jsx-classes";

export interface UserMenuProps {
    name: string;
    email: string;
    imageUrl?: string | null;
    /** Link targets — the shell wires these; no auth logic here. */
    profileHref?: string;
    signOutHref?: string;
}

export function UserMenu({
    name,
    email,
    imageUrl,
    profileHref,
    signOutHref,
}: UserMenuProps) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    /* Close on outside click + Escape */
    useEffect(() => {
        if (!open) return;

        function onPointerDown(e: MouseEvent) {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
        }
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") {
                setOpen(false);
                triggerRef.current?.focus();
            }
        }

        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    return (
        <div ref={rootRef} className="relative">
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label="Open user menu"
                className={cn(
                    "flex items-center rounded-md p-0.5 transition-colors",
                    "hover:bg-slate-100",
                )}
            >
                <SidebarAvatar name={name} imageUrl={imageUrl} size="sm" shape="circle" />
            </button>

            {open && (
                <div
                    role="menu"
                    aria-label="User menu"
                    className="absolute right-0 top-full z-30 mt-1.5 w-60 overflow-hidden rounded-lg border border-outline-variant bg-surface-lowest shadow-overlay"
                >
                    <div className="border-b border-outline-variant px-3 py-2.5">
                        <p className="truncate text-title-md text-on-surface">{name}</p>
                        <p className="truncate text-body-sm text-on-surface-variant">
                            {email}
                        </p>
                    </div>

                    <div className="p-1">
                        {profileHref && (
                            <Link
                                href={profileHref}
                                role="menuitem"
                                onClick={() => setOpen(false)}
                                className="block rounded-md px-2.5 py-1.5 text-body-md text-on-surface-variant transition-colors hover:bg-slate-100 hover:text-on-surface"
                            >
                                Profile
                            </Link>
                        )}
                        {signOutHref && (
                            <Link
                                href={signOutHref}
                                role="menuitem"
                                onClick={() => setOpen(false)}
                                className="block rounded-md px-2.5 py-1.5 text-body-md text-on-surface-variant transition-colors hover:bg-slate-100 hover:text-on-surface"
                            >
                                Sign out
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}