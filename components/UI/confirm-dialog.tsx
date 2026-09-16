"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Button, type ButtonVariant } from "@/components/UI/btn";
import { cn } from "@/utils/jsx-classes";

export interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    /** Confirm button variant. Defaults to `destructive` (rose). */
    confirmVariant?: ButtonVariant;
    onConfirm: () => void;
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    confirmVariant = "destructive",
    onConfirm,
}: ConfirmDialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);

    /* Sync React `open` state with the native dialog. */
    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        if (open && !dialog.open) {
            dialog.showModal();
        } else if (!open && dialog.open) {
            dialog.close();
        }
    }, [open]);

    return (
        <dialog
            ref={dialogRef}
            /* Native `close` fires on Escape and on programmatic close. */
            onClose={() => onOpenChange(false)}
            /* Backdrop click closes. */
            onClick={(e) => {
                if (e.target === dialogRef.current) onOpenChange(false);
            }}
            className={cn(
                "fixed inset-0 z-50 m-auto h-fit w-[calc(100%-2rem)] max-w-sm",
                "rounded-lg border-0 bg-transparent p-0",
                "backdrop:bg-slate-900/40 backdrop:backdrop-blur-[2px]",
            )}
        >
            <div className="rounded-lg border border-outline-variant bg-surface-lowest p-5 shadow-overlay">
                <h2 className="text-headline-sm text-on-surface">{title}</h2>

                {description && (
                    <div className="mt-1.5 text-body-md text-on-surface-variant">
                        {description}
                    </div>
                )}

                <div className="mt-5 flex items-center justify-end gap-2">
                    <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        onClick={() => onOpenChange(false)}
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        type="button"
                        variant={confirmVariant}
                        size="md"
                        onClick={() => {
                            onConfirm();
                            onOpenChange(false);
                        }}
                    >
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </dialog>
    );
}