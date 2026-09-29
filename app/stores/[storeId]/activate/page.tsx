import { AppError } from "@/errors/base.error";
import { getCurrentStoreContext } from "@/utils/auth";
import { isUuid } from "@/utils/uuid";
import { TriangleAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

export default async function ActivateStorePage({
    params,
}: PageProps<"/stores/[storeId]/activate">) {
    const { storeId } = await params;

    const t = await getTranslations("stores.activation");

    if (!isUuid(storeId)) {
        redirect("/dashboard");
    }

    const ctx = await getCurrentStoreContext(storeId);

    if (ctx instanceof AppError) {
        redirect("/dashboard");
    }

    const { store, membership } = ctx;

    // Store is active, so there is no reason to be on this page.
    if (store.status === "ACTIVE") {
        redirect(`/stores/${storeId}/${membership.role.toLowerCase()}/dashboard`);
    }

    const isSuspended = store.status === "SUSPENDED";

    return (
        <main className="flex min-h-[70vh] items-center justify-center px-6">
            <div className="w-full max-w-md text-center">

                {/* Icon */}
                <div
                    className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full ${isSuspended
                        ? "bg-red-100"
                        : "bg-yellow-100"
                        }`}
                >
                    <TriangleAlert
                        className={`h-8 w-8 ${isSuspended
                                ? "text-red-600"
                                : "text-yellow-600"
                            }`}
                        aria-hidden="true"
                    />
                </div>

                {/* Heading */}
                <h1 className="text-2xl font-semibold tracking-tight">
                    {isSuspended
                        ? t("suspendedTitle")
                        : t("pendingTitle")}
                </h1>

                {/* Description */}
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {isSuspended
                        ? t("suspendedDescription")
                        : t("pendingDescription")}
                </p>

                {/* Status */}
                <div className="mt-6 rounded-xl border bg-muted/40 p-4">
                    <div className="flex items-center justify-center gap-2">
                        <span
                            className={`h-2.5 w-2.5 rounded-full ${isSuspended
                                ? "bg-red-500"
                                : "bg-yellow-500"
                                }`}
                        />

                        <span className="text-sm font-medium">
                            {isSuspended
                                ? t("suspendedStatus")
                                : t("pendingStatus")}
                        </span>
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground">
                        {isSuspended
                            ? t("suspendedStatusDescription")
                            : t("pendingStatusDescription")}
                    </p>
                </div>

                {/* Help text */}
                <p className="mt-6 text-xs text-muted-foreground">
                    {isSuspended
                        ? t("suspendedHelp")
                        : t("pendingHelp")}
                </p>
            </div>
        </main>
    );
}
