import Link from "next/link";
// import "temporal-polyfill/full/global";

import {
    getAllMembers,
    getCurrentMembership,
} from "@/actions/storeManagement.actions";
import { PageHeader } from "@/components/UI/page-header";
import {
    Card,
    CardHeader,
    CardTitle,
    CardBody,
} from "@/components/UI/card";
import { DataTable, type Column } from "@/components/UI/data-table";
import { StatusBadge, type StatusKey } from "@/components/UI/status-badge";
import { EmptyState, ErrorState } from "@/components/UI/state";
import { buttonVariants } from "@/components/UI/btn";
import {
    PendingRequestActions,
    RoleSelect,
} from "@/components/members/member-actions";
import { AppError } from "@/errors/base.error";
import { formatDate } from "@/utils/format";

import type { GetMembershipWithUser } from "@/zod/membership.schema";
import { getAllowedRoles, getRoleDisabledReason, RoleValue } from "@/utils/roles";

/* ========================================================================== */
/*  Normalised row                                                            */
/* ========================================================================== */

interface MemberRow {
    id: string;
    userId: string;
    storeId: string;
    userName: string;
    userEmail: string;
    role: RoleValue;
    status: GetMembershipWithUser["status"];
    createdAt: Temporal.Instant;
}

function toMemberRow(m: GetMembershipWithUser): MemberRow {
    const fullName = [m.user.firstName, m.user.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();

    return {
        id: m.id,
        userId: m.userId,
        storeId: m.storeId,
        userName: fullName || m.user.email || "Unnamed",
        userEmail: m.user.email ?? "—",
        role: m.role as RoleValue,
        status: m.status,
        createdAt: m.createdAt,
    };
};

/* ========================================================================== */
/*  Query contract                                                            */
/* ========================================================================== */

type StatusFilter = "active" | "rejected" | "all";

interface MemberQuery {
    status: StatusFilter;
}

function parseQuery(
    raw: Record<string, string | string[] | undefined>,
): MemberQuery {
    const status = typeof raw.status === "string" ? raw.status : "";

    return {
        status:
            status === "rejected" || status === "all"
                ? status
                : "active",
    };
}

/* ========================================================================== */
/*  Pending columns                                                           */
/* ========================================================================== */

const pendingColumns: Column<MemberRow>[] = [
    {
        key: "name",
        header: "User",
        mobile: "primary",
        cell: (m) => (
            <span className="font-medium">
                {m.userName}
            </span>
        ),
    },
    {
        key: "email",
        header: "Email",
        mobile: "secondary",
        cell: (m) => (
            <span className="text-on-surface-variant">
                {m.userEmail}
            </span>
        ),
    },
    {
        key: "requested",
        header: "Requested",
        mobile: "meta",
        width: "w-32",
        cell: (m) => (
            <span className="text-on-surface-variant">
                {formatDate(m.createdAt)}
            </span>
        ),
    },
];

/* ========================================================================== */
/*  Member columns                                                            */
/* ========================================================================== */

function buildMemberColumns(
    currentUserId: string,
    currentUserRole: RoleValue,
): Column<MemberRow>[] {
    const allowedRoles = getAllowedRoles(currentUserRole);

    return [
        {
            key: "name",
            header: "Member",
            mobile: "primary",
            cell: (m) => (
                <span className="font-medium">
                    {m.userName}
                </span>
            ),
        },
        {
            key: "email",
            header: "Email",
            mobile: "secondary",
            cell: (m) => (
                <span className="text-on-surface-variant">
                    {m.userEmail}
                </span>
            ),
        },
        {
            key: "role",
            header: "Role",
            width: "w-36",
            cell: (m) => {
                const reason = getRoleDisabledReason(
                    currentUserId,
                    currentUserRole,
                    m.userId,
                    m.role,
                );

                return (
                    <RoleSelect
                        storeId={m.storeId}
                        membershipId={m.id}
                        currentRole={m.role}
                        allowedRoles={allowedRoles}
                        disabled={reason !== null}
                        disabledReason={
                            reason ?? undefined
                        }
                    />
                );
            },
        },
        {
            key: "status",
            header: "Status",
            width: "w-28",
            cell: (m) => (
                <StatusBadge
                    status={m.status as StatusKey}
                />
            ),
        },
        {
            key: "joined",
            header: "Joined",
            width: "w-32",
            cell: (m) => (
                <span className="text-on-surface-variant">
                    {formatDate(m.createdAt)}
                </span>
            ),
        },
    ];
}

/* ========================================================================== */
/*  Page                                                                      */
/* ========================================================================== */

export default async function MembersPage({
    params,
    searchParams,
}: PageProps<"/stores/[storeId]/owner/members">) {
    const { storeId } = await params;
    const sp = await searchParams;
    const query = parseQuery(sp);

    const base = `/stores/${ storeId}/owner/members`;

    /* ---------- Fetch members + current membership in parallel ---------- */

    const [membersResult, currentResult] = await Promise.all([
        getAllMembers(storeId),
        getCurrentMembership(storeId),
    ]);

    /* ---------- Handle members error ---------- */

    if (membersResult instanceof AppError) {
        return (
            <ErrorState
                title="Couldn't load members"
                description={membersResult.message}
                action={
                    <Link
                        href={base}
                        className={buttonVariants({
                            variant: "secondary",
                            size: "md",
                        })}
                    >
                        Try Again
                    </Link>
                }
            />
        );
    }

    /* ---------- Handle current membership error ---------- */

    if (currentResult instanceof AppError) {
        return (
            <ErrorState
                title="Couldn't verify your access"
                description={currentResult.message}
                action={
                    <Link
                        href={base}
                        className={buttonVariants({
                            variant: "secondary",
                            size: "md",
                        })}
                    >
                        Try Again
                    </Link>
                }
            />
        );
    }

    /* ---------- Normalise rows ---------- */

    const allRows = membersResult.map(toMemberRow);

    const pending = allRows.filter(
        (m) => m.status === "PENDING",
    );

    const filteredMembers = allRows.filter((m) => {
        if (query.status === "all") {
            return m.status !== "PENDING";
        }

        if (query.status === "active") {
            return m.status === "ACTIVE";
        }

        if (query.status === "rejected") {
            return m.status === "REJECTED";
        }

        return false;
    });

    const pendingCount = pending.length;

    /* ---------- Build columns using current user's context ---------- */

    const memberColumns = buildMemberColumns(
        currentResult.userId,
        currentResult.role as RoleValue,
    );

    /* ---------- Render ---------- */

    return (
        <div className="space-y-4">
            <PageHeader
                title="Members"
                description="Everyone who can access this store."
            />

            {/* ─── Pending requests ─────────────────────────────────────── */}

            {pendingCount > 0 && (
                <Card>
                    <CardHeader>
                        <div>
                            <CardTitle>
                                Pending Requests
                            </CardTitle>

                            <p className="mt-0.5 text-body-sm text-on-surface-variant">
                                <span className="tabular-nums">
                                    {pendingCount}
                                </span>{" "}
                                {pendingCount === 1
                                    ? "person is"
                                    : "people are"}{" "}
                                waiting to join.
                            </p>
                        </div>
                    </CardHeader>

                    <CardBody flush>
                        <DataTable
                            columns={pendingColumns}
                            data={pending}
                            getRowKey={(m) => m.id}
                            rowActions={(m) => (
                                <PendingRequestActions
                                    storeId={m.storeId}
                                    membershipId={m.id}
                                    userName={m.userName}
                                />
                            )}
                        />
                    </CardBody>
                </Card>
            )}

            {/* ─── Members list ─────────────────────────────────────────── */}

            <Card>
                <CardHeader>
                    <div>
                        <CardTitle>
                            Members
                        </CardTitle>

                        <p className="mt-0.5 text-body-sm text-on-surface-variant">
                            <span className="tabular-nums">
                                {filteredMembers.length}
                            </span>{" "}
                            {filteredMembers.length === 1
                                ? "member"
                                : "members"}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            href={base}
                            className={buttonVariants({
                                variant:
                                    query.status === "active"
                                        ? "secondary"
                                        : "ghost",
                                size: "sm",
                            })}
                        >
                            Active
                        </Link>

                        <Link
                            href={`${ base }?status = rejected`}
                            className={buttonVariants({
                                variant:
                                    query.status === "rejected"
                                        ? "secondary"
                                        : "ghost",
                                size: "sm",
                            })}
                        >
                            Rejected
                        </Link>

                        <Link
                            href={`${ base }?status = all`}
                            className={buttonVariants({
                                variant:
                                    query.status === "all"
                                        ? "secondary"
                                        : "ghost",
                                size: "sm",
                            })}
                        >
                            All
                        </Link>
                    </div>
                </CardHeader>

                <CardBody flush>
                    <DataTable
                        columns={memberColumns}
                        data={filteredMembers}
                        getRowKey={(m) => m.id}
                        empty={
                            <EmptyState
                                size="sm"
                                title={
                                    query.status === "rejected"
                                        ? "No rejected requests"
                                        : query.status === "all"
                                            ? "No past members"
                                            : "No members yet"
                                }
                                description={
                                    query.status === "active"
                                        ? "When someone requests to join this store, they'll appear here."
                                        : "Nothing to show in this view."
                                }
                            />
                        }
                    />
                </CardBody>
            </Card>
        </div>
    );
}
