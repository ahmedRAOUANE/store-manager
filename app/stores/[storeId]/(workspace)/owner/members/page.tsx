import Link from "next/link";
import { getTranslations } from "next-intl/server";

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

function toMemberRow(
    m: GetMembershipWithUser,
    unnamed: string,
): MemberRow {
    const fullName = [m.user.firstName, m.user.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();

    return {
        id: m.id,
        userId: m.userId,
        storeId: m.storeId,
        userName: fullName || m.user.email || unnamed,
        userEmail: m.user.email ?? "—",
        role: m.role as RoleValue,
        status: m.status,
        createdAt: m.createdAt,
    };
}

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
/*  Page                                                                      */
/* ========================================================================== */

export default async function MembersPage({
    params,
    searchParams,
}: PageProps<"/stores/[storeId]/owner/members">) {
    const { storeId } = await params;
    const sp = await searchParams;
    const query = parseQuery(sp);

    const base = `/stores/${storeId}/owner/members`;

    const t = await getTranslations("members");
    const tCommon = await getTranslations("common");
    const tActions = await getTranslations("actions");
    const tStatus = await getTranslations("status");

    /* ---------- Fetch members + current membership in parallel ---------- */

    const [membersResult, currentResult] = await Promise.all([
        getAllMembers(storeId),
        getCurrentMembership(storeId),
    ]);

    /* ---------- Handle members error ---------- */

    if (membersResult instanceof AppError) {
        return (
            <ErrorState
                title={t("errors.loadFailed")}
                description={membersResult.message}
                action={
                    <Link
                        href={base}
                        className={buttonVariants({
                            variant: "secondary",
                            size: "md",
                        })}
                    >
                        {tActions("tryAgain")}
                    </Link>
                }
            />
        );
    }

    /* ---------- Handle current membership error ---------- */

    if (currentResult instanceof AppError) {
        return (
            <ErrorState
                title={t("errors.verifyFailed")}
                description={currentResult.message}
                action={
                    <Link
                        href={base}
                        className={buttonVariants({
                            variant: "secondary",
                            size: "md",
                        })}
                    >
                        {tActions("tryAgain")}
                    </Link>
                }
            />
        );
    }

    /* ---------- Normalise rows ---------- */

    const unnamedFallback = t("unnamed");
    const allRows = membersResult.map((m) =>
        toMemberRow(m, unnamedFallback),
    );

    const pending = allRows.filter((m) => m.status === "PENDING");

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

    /* ---------- Pending columns ---------- */

    const pendingColumns: Column<MemberRow>[] = [
        {
            key: "name",
            header: t("columns.user"),
            mobile: "primary",
            cell: (m) => (
                <span className="font-medium">{m.userName}</span>
            ),
        },
        {
            key: "email",
            header: tCommon("email"),
            mobile: "secondary",
            cell: (m) => (
                <span className="text-on-surface-variant">
                    {m.userEmail}
                </span>
            ),
        },
        {
            key: "requested",
            header: t("columns.requested"),
            mobile: "meta",
            width: "w-32",
            cell: (m) => (
                <span className="text-on-surface-variant">
                    {formatDate(m.createdAt)}
                </span>
            ),
        },
    ];

    /* ---------- Member columns ---------- */

    const currentRole = currentResult.role as RoleValue;
    const allowedRoles = getAllowedRoles(currentRole);

    const memberColumns: Column<MemberRow>[] = [
        {
            key: "name",
            header: t("columns.member"),
            mobile: "primary",
            cell: (m) => (
                <span className="font-medium">{m.userName}</span>
            ),
        },
        {
            key: "email",
            header: tCommon("email"),
            mobile: "secondary",
            cell: (m) => (
                <span className="text-on-surface-variant">
                    {m.userEmail}
                </span>
            ),
        },
        {
            key: "role",
            header: t("role"),
            width: "w-36",
            cell: (m) => {
                const reason = getRoleDisabledReason(
                    currentResult.userId,
                    currentRole,
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
                        disabledReason={reason ?? undefined}
                    />
                );
            },
        },
        {
            key: "status",
            header: tCommon("status"),
            width: "w-28",
            cell: (m) => (
                <StatusBadge status={m.status as StatusKey} />
            ),
        },
        {
            key: "joined",
            header: t("columns.joined"),
            width: "w-32",
            cell: (m) => (
                <span className="text-on-surface-variant">
                    {formatDate(m.createdAt)}
                </span>
            ),
        },
    ];

    /* ---------- Render ---------- */

    return (
        <div className="space-y-4">
            <PageHeader
                title={t("title")}
                description={t("description")}
            />

            {/* ─── Pending requests ─────────────────────────────────────── */}

            {pendingCount > 0 && (
                <Card>
                    <CardHeader>
                        <div>
                            <CardTitle>{t("pending.title")}</CardTitle>

                            <p className="mt-0.5 text-body-sm text-on-surface-variant">
                                {t("pending.description", {
                                    count: pendingCount,
                                })}
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
                        <CardTitle>{t("title")}</CardTitle>

                        <p className="mt-0.5 text-body-sm text-on-surface-variant">
                            {t("count", {
                                count: filteredMembers.length,
                            })}
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
                            {tStatus("active")}
                        </Link>

                        <Link
                            href={`${base}?status=rejected`}
                            className={buttonVariants({
                                variant:
                                    query.status === "rejected"
                                        ? "secondary"
                                        : "ghost",
                                size: "sm",
                            })}
                        >
                            {tStatus("rejected")}
                        </Link>

                        <Link
                            href={`${base}?status=all`}
                            className={buttonVariants({
                                variant:
                                    query.status === "all"
                                        ? "secondary"
                                        : "ghost",
                                size: "sm",
                            })}
                        >
                            {tCommon("all")}
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
                                        ? t("empty.rejectedTitle")
                                        : query.status === "all"
                                            ? t("empty.allTitle")
                                            : t("empty.activeTitle")
                                }
                                description={
                                    query.status === "active"
                                        ? t("empty.activeDescription")
                                        : t("empty.defaultDescription")
                                }
                            />
                        }
                    />
                </CardBody>
            </Card>
        </div>
    );
}