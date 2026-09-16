"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/UI/btn";
import { Select } from "@/components/UI/form";
import { ConfirmDialog } from "@/components/UI/confirm-dialog";
import {
    acceptMembershipRequest,
    promoteMember,
    rejectMembershipRequest,
} from "@/actions/storeManagement.actions";

import { RoleValue, ASSIGNABLE_ROLES, ROLE_LABELS } from "@/utils/roles"

/* ========================================================================== */
/*  PendingRequestActions                                                     */
/* ========================================================================== */

export interface PendingRequestActionsProps {
    storeId: string;
    membershipId: string;
    userName: string;
}

export function PendingRequestActions({
    storeId,
    membershipId,
    userName,
}: PendingRequestActionsProps) {
    const [rejectOpen, setRejectOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const handleAccept = () => {
        startTransition(async () => {
            await acceptMembershipRequest(storeId, membershipId);
        });
    };

    const handleReject = () => {
        startTransition(async () => {
            await rejectMembershipRequest(storeId, membershipId);
        });
    };

    return (
        <>
            <div className="flex items-center justify-end gap-1.5">
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleAccept}
                    disabled={isPending}
                >
                    Accept
                </Button>

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setRejectOpen(true)}
                    disabled={isPending}
                >
                    Reject
                </Button>
            </div>

            <ConfirmDialog
                open={rejectOpen}
                onOpenChange={setRejectOpen}
                title={`Reject ${userName}'s request?`}
                description="They will not be added to the store. They can request to join again at any time."
                confirmLabel="Reject request"
                confirmVariant="destructive"
                onConfirm={handleReject}
            />
        </>
    );
}

/* ========================================================================== */
/*  RoleSelect                                                                */
/* ========================================================================== */

export interface RoleSelectProps {
    storeId: string;
    membershipId: string;
    currentRole: RoleValue;

    /**
     * Roles the caller is allowed to assign.
     *
     * Defaults to STAFF + MANAGER.
     */
    allowedRoles?: RoleValue[];

    /**
     * When true, the select is rendered but disabled.
     */
    disabled?: boolean;

    /**
     * Tooltip/title explaining why the select is disabled.
     */
    disabledReason?: string;
}

export function RoleSelect({
    storeId,
    membershipId,
    currentRole,
    allowedRoles = ASSIGNABLE_ROLES,
    disabled = false,
    disabledReason,
}: RoleSelectProps) {
    const [isPending, startTransition] = useTransition();

    const interactive = !disabled && !isPending;

    /**
     * Always include the current role.
     *
     * This is important when the current role isn't contained in
     * allowedRoles, for example when displaying an OWNER.
     */
    const options = Array.from(
        new Set<RoleValue>([
            currentRole,
            ...allowedRoles,
        ]),
    );

    const handleChange = (
        event: React.ChangeEvent<HTMLSelectElement>,
    ) => {
        const nextRole = event.target.value as RoleValue;

        if (nextRole === currentRole) {
            return;
        }

        startTransition(async () => {
            await promoteMember(
                storeId,
                membershipId,
                nextRole,
            );
        });
    };

    return (
        <Select
            value={currentRole}
            disabled={!interactive}
            title={disabled ? disabledReason : undefined}
            aria-label={`Change role (currently ${currentRole.toLowerCase()})`}
            onChange={handleChange}
            className="h-8 w-32 text-body-sm"
        >
            {options.map((role) => (
                <option
                    key={role}
                    value={role}
                >
                    {ROLE_LABELS[role]}
                </option>
            ))}
        </Select>
    );
}