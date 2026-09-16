import { AppError } from "@/errors/base.error";
import { getCurrentStoreContext } from "@/utils/auth";
import { isUuid } from "@/utils/uuid";
import { redirect } from "next/navigation";

export default async function ActivateStorePage({
    params,
}: PageProps<"/stores/[storeId]/activate">) {
    const { storeId } = await params;

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
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        className={`h-8 w-8 ${isSuspended
                            ? "text-red-600"
                            : "text-yellow-600"
                            }`}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 9v3.75m9.303 3.376L13.697 4.5a1.95 1.95 0 0 0-3.394 0l-7.606 11.626A1.95 1.95 0 0 0 4.303 19.5h15.394a1.95 1.95 0 0 0 1.606-2.374ZM12 17.25h.008v.008H12v-.008Z"
                        />
                    </svg>
                </div>

                {/* Heading */}
                <h1 className="text-2xl font-semibold tracking-tight">
                    {isSuspended
                        ? "Your store has been suspended"
                        : "Activate your store"}
                </h1>

                {/* Description */}
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {isSuspended
                        ? "Your store has been temporarily suspended and is currently unavailable."
                        : "Your store has been created successfully, but it still needs to be activated before you can start using it."}
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
                                ? "Store suspended"
                                : "Store activation pending"}
                        </span>
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground">
                        {isSuspended
                            ? "Please contact an administrator for more information."
                            : "An administrator needs to activate your store."}
                    </p>
                </div>

                {/* Help text */}
                <p className="mt-6 text-xs text-muted-foreground">
                    {isSuspended
                        ? "Once the suspension is lifted, your store will become available again and you will be able to access your store dashboard."
                        : "Once your store is activated, you will be able to access your store dashboard and start managing your products, sales, purchases, and members."}
                </p>
            </div>
        </main>
    );
}
