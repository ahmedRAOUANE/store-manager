import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { getAllUsers } from "@/actions/admin.actions";
import { PageHeader } from "@/components/UI/page-header";
import { DataTable, type Column } from "@/components/UI/data-table";
import { EmptyState, ErrorState } from "@/components/UI/state";
import { buttonVariants } from "@/components/UI/btn";
import { AppError } from "@/errors/base.error";
import { formatDate } from "@/utils/format";

import type { AdminUserRow } from "@/zod/adminUser.schema";

export default async function AdminUsersPage(
    { params }: PageProps<"/admin/[adminId]/users">,
) {
    const { adminId } = await params;
    const base = `/admin/${adminId}/users`;

    const t = await getTranslations("admin.usersPage");
    const tCommon = await getTranslations("common");
    const tActions = await getTranslations("actions");
    const tStatus = await getTranslations("status");

    const result = await getAllUsers();

    // `getAllUsersService` returns `AdminUserRow[]` in practice — the
    // `instanceof AppError` guard below is defensive against future
    // service changes that might reintroduce a batch-level error.
    if (result instanceof AppError) {
        return (
            <ErrorState
                title={t("errors.loadFailed")}
                description={result.message}
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

    const users = result;
    const total = users.length;
    const invalidCount = users.filter((u) => !u.isValid).length;

    const summaryText =
        invalidCount > 0
            ? t("summaryWithInvalid", { total, invalid: invalidCount })
            : t("summary", { total });

    const columns: Column<AdminUserRow>[] = [
        {
            key: "name",
            header: t("columns.name"),
            mobile: "primary",
            cell: (u) => {
                const name = [u.firstName, u.lastName]
                    .filter(Boolean)
                    .join(" ")
                    .trim();

                if (name) {
                    return (
                        <span className="font-medium text-on-surface">
                            {name}
                        </span>
                    );
                }

                return (
                    <span className="italic text-on-surface-variant">
                        {tCommon("unknown")}
                    </span>
                );
            },
        },
        {
            key: "email",
            header: t("columns.email"),
            mobile: "secondary",
            cell: (u) => {
                if (u.isValid && u.email) {
                    return (
                        <span className="text-on-surface-variant">
                            {u.email}
                        </span>
                    );
                }

                // Invalid email — surface as a badge so the admin sees
                // it at a glance without drilling into the row.
                return (
                    <span
                        title={u.issues.join("; ")}
                        className="inline-flex items-center rounded-md border border-danger-border bg-danger-bg px-2 py-0.5 text-label-sm text-danger-fg"
                    >
                        {t("missingEmail")}
                    </span>
                );
            },
        },
        {
            key: "role",
            header: t("columns.role"),
            width: "w-28",
            cell: (u) => (
                <span className="text-body-sm text-on-surface-variant">
                    {u.globalRole === "ADMIN"
                        ? tStatus("admin")
                        : tStatus("user")}
                </span>
            ),
        },
        {
            key: "joined",
            header: t("columns.joined"),
            width: "w-32",
            cell: (u) => (
                <span className="text-body-sm text-on-surface-variant">
                    {formatDate(u.createdAt)}
                </span>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader title={t("title")} description={summaryText} />

            <DataTable
                columns={columns}
                data={users}
                getRowKey={(u) => u.id}
                empty={
                    <EmptyState
                        size="sm"
                        title={t("empty.title")}
                        description={t("empty.description")}
                    />
                }
            />
        </div>
    );
}