import Link from "next/link";
// import "temporal-polyfill/full/global";

import { PageHeader } from "@/components/UI/page-header";
import {
    Card,
    CardHeader,
    CardTitle,
    CardBody,
} from "@/components/UI/card";
import {
    FormField,
    Input,
    Textarea,
    Select,
    FormActions,
} from "@/components/UI/form";
import { Button, buttonVariants } from "@/components/UI/btn";
import { StatusBadge } from "@/components/UI/status-badge";
import { cn } from "@/utils/jsx-classes";
import { formatDateTime } from "@/utils/format";

import { StoreStatus as StoreStatusEnum, type GetStore } from "@/zod/store.schema";

type StoreStatus = (typeof StoreStatusEnum)[keyof typeof StoreStatusEnum];

/* ========================================================================== */
/*  Static option lists                                                       */
/* ========================================================================== */

const CURRENCY_OPTIONS = [
    { value: "USD", label: "USD — US Dollar" },
    { value: "EUR", label: "EUR — Euro" },
    { value: "GBP", label: "GBP — British Pound" },
    { value: "CAD", label: "CAD — Canadian Dollar" },
    { value: "AUD", label: "AUD — Australian Dollar" },
    { value: "JPY", label: "JPY — Japanese Yen" },
    { value: "CNY", label: "CNY — Chinese Yuan" },
    { value: "INR", label: "INR — Indian Rupee" },
    { value: "BRL", label: "BRL — Brazilian Real" },
    { value: "MXN", label: "MXN — Mexican Peso" },
    { value: "ZAR", label: "ZAR — South African Rand" },
    { value: "AED", label: "AED — UAE Dirham" },
    { value: "SAR", label: "SAR — Saudi Riyal" },
    { value: "TRY", label: "TRY — Turkish Lira" },
    { value: "CHF", label: "CHF — Swiss Franc" },
];

const TIMEZONE_OPTIONS = [
    { value: "UTC", label: "UTC — Coordinated Universal Time" },
    { value: "America/New_York", label: "America/New_York — Eastern" },
    { value: "America/Chicago", label: "America/Chicago — Central" },
    { value: "America/Denver", label: "America/Denver — Mountain" },
    { value: "America/Los_Angeles", label: "America/Los_Angeles — Pacific" },
    { value: "America/Sao_Paulo", label: "America/São_Paulo" },
    { value: "Europe/London", label: "Europe/London" },
    { value: "Europe/Paris", label: "Europe/Paris" },
    { value: "Europe/Berlin", label: "Europe/Berlin" },
    { value: "Europe/Madrid", label: "Europe/Madrid" },
    { value: "Africa/Cairo", label: "Africa/Cairo" },
    { value: "Africa/Lagos", label: "Africa/Lagos" },
    { value: "Asia/Dubai", label: "Asia/Dubai" },
    { value: "Asia/Karachi", label: "Asia/Karachi" },
    { value: "Asia/Kolkata", label: "Asia/Kolkata" },
    { value: "Asia/Bangkok", label: "Asia/Bangkok" },
    { value: "Asia/Shanghai", label: "Asia/Shanghai" },
    { value: "Asia/Tokyo", label: "Asia/Tokyo" },
    { value: "Australia/Sydney", label: "Australia/Sydney" },
];

/* ========================================================================== */
/*  Status copy — one sentence per state, written for the user                */
/* ========================================================================== */

function statusDescription(status: StoreStatus): string {
    switch (status) {
        case "ACTIVE":
            return "Your store is active. All features are available.";
        case "PENDING":
            return "Your store is awaiting approval. A platform administrator will review it shortly.";
        case "SUSPENDED":
            return "Your store has been suspended. Contact platform support if you believe this is a mistake.";
        default:
            return "";
    }
}

/* ========================================================================== */
/*  Mock fetch                                                                */
/* ========================================================================== */

async function fetchStore(_id: string): Promise<GetStore | null> {
    return {
        id: "11111111-1111-4111-8111-000000000001",
        name: "My Store",
        description:
            "A small neighborhood grocer specializing in organic produce and artisan breads.",
        phone: "+1 (415) 555-0110",
        email: "hello@mystore.example",
        address: "123 Main St\nSan Francisco, CA 94105",
        currency: "USD",
        timezone: "America/Los_Angeles",
        status: "ACTIVE",
        createdAt: Temporal.Instant.from("2025-09-10T10:00:00Z"),
        updatedAt: Temporal.Instant.from("2026-09-12T14:22:00Z"),
    };
}

/* ========================================================================== */
/*  Detail row helper                                                         */
/* ========================================================================== */

function DetailRow({
    label,
    children,
    mono = false,
}: {
    label: string;
    children: React.ReactNode;
    mono?: boolean;
}) {
    return (
        <div className="flex items-start justify-between gap-4 py-2.5">
            <dt className="shrink-0 text-body-sm text-on-surface-variant">
                {label}
            </dt>
            <dd
                className={cn(
                    "min-w-0 text-right text-body-md text-on-surface",
                    mono && "font-mono text-body-sm",
                )}
            >
                {children}
            </dd>
        </div>
    );
}

/* ========================================================================== */
/*  Page                                                                      */
/* ========================================================================== */

export default async function SettingsPage({
    params,
}: PageProps<"/stores/[storeId]/manager/settings">) {
    const { storeId } = await params;
    const store = await fetchStore(storeId);

    if (!store) {
        /* In production, `notFound()`. Kept inline here so the page renders standalone. */
        return null;
    }

    const base = `/stores/${storeId}`;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Settings"
                description="Manage your store's information and preferences."
            />

            <div className="grid gap-4 lg:grid-cols-3">
                {/* ─── Main column — the editable form ─────────────────────────── */}
                <div className="lg:col-span-2">
                    {/*
            Server Action attaches here in the wiring phase:
              <form action={updateStoreAction}>
          */}
                    <form autoComplete="off">
                        <div className="space-y-4">
                            {/* ─── Store Information ─────────────────────────────── */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Store Information</CardTitle>
                                </CardHeader>
                                <CardBody>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <FormField
                                            label="Store Name"
                                            htmlFor="store-name"
                                            required
                                            className="md:col-span-2"
                                        >
                                            <Input
                                                id="store-name"
                                                name="name"
                                                defaultValue={store.name}
                                                placeholder="e.g. My Store"
                                                required
                                                maxLength={120}
                                            />
                                        </FormField>

                                        <FormField
                                            label="Phone"
                                            htmlFor="store-phone"
                                            className="md:col-span-2"
                                        >
                                            <Input
                                                id="store-phone"
                                                name="phone"
                                                type="tel"
                                                inputMode="tel"
                                                defaultValue={store.phone ?? ""}
                                                placeholder="+1 (555) 000-0000"
                                                maxLength={32}
                                            />
                                        </FormField>

                                        <FormField
                                            label="Email"
                                            htmlFor="store-email"
                                            description="Shown to customers on receipts."
                                            className="md:col-span-2"
                                        >
                                            <Input
                                                id="store-email"
                                                name="email"
                                                type="email"
                                                inputMode="email"
                                                defaultValue={store.email ?? ""}
                                                placeholder="hello@example.com"
                                                maxLength={160}
                                            />
                                        </FormField>

                                        <FormField
                                            label="Description"
                                            htmlFor="store-description"
                                            description="A short summary of your store."
                                            className="md:col-span-2"
                                        >
                                            <Textarea
                                                id="store-description"
                                                name="description"
                                                defaultValue={store.description ?? ""}
                                                placeholder="What does your store sell? Where is it located?"
                                                rows={3}
                                                maxLength={500}
                                            />
                                        </FormField>

                                        <FormField
                                            label="Address"
                                            htmlFor="store-address"
                                            className="md:col-span-2"
                                        >
                                            <Textarea
                                                id="store-address"
                                                name="address"
                                                defaultValue={store.address ?? ""}
                                                placeholder={"123 Main St\nCity, State ZIP"}
                                                rows={3}
                                                maxLength={300}
                                            />
                                        </FormField>
                                    </div>
                                </CardBody>
                            </Card>

                            {/* ─── Regional Settings ─────────────────────────────── */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Regional Settings</CardTitle>
                                </CardHeader>
                                <CardBody>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <FormField
                                            label="Currency"
                                            htmlFor="store-currency"
                                            description="Used for all monetary values."
                                        >
                                            <Select
                                                id="store-currency"
                                                name="currency"
                                                defaultValue={store.currency}
                                            >
                                                {CURRENCY_OPTIONS.map((c) => (
                                                    <option key={c.value} value={c.value}>
                                                        {c.label}
                                                    </option>
                                                ))}
                                            </Select>
                                        </FormField>

                                        <FormField
                                            label="Timezone"
                                            htmlFor="store-timezone"
                                            description="Determines how dates and times are displayed."
                                        >
                                            <Select
                                                id="store-timezone"
                                                name="timezone"
                                                defaultValue={store.timezone}
                                            >
                                                {TIMEZONE_OPTIONS.map((t) => (
                                                    <option key={t.value} value={t.value}>
                                                        {t.label}
                                                    </option>
                                                ))}
                                            </Select>
                                        </FormField>
                                    </div>
                                </CardBody>
                            </Card>

                            <FormActions
                                secondary={
                                    <Link
                                        href={`${base}/dashboard`}
                                        className={buttonVariants({
                                            variant: "ghost",
                                            size: "md",
                                        })}
                                    >
                                        Cancel
                                    </Link>
                                }
                                primary={
                                    <Button type="submit" variant="primary" size="md">
                                        Save Changes
                                    </Button>
                                }
                            />
                        </div>
                    </form>
                </div>

                {/* ─── Sidebar — status + record ──────────────────────────────── */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Store Status</CardTitle>
                        </CardHeader>
                        <CardBody>
                            <div className="space-y-3">
                                <StatusBadge status={store.status} size="md" />
                                <p className="text-body-sm text-on-surface-variant">
                                    {statusDescription(store.status)}
                                </p>
                            </div>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Record</CardTitle>
                        </CardHeader>
                        <CardBody>
                            <dl className="divide-y divide-outline-variant">
                                <DetailRow label="Store ID" mono>
                                    <span className="truncate" title={store.id}>
                                        {store.id.slice(0, 8)}…
                                    </span>
                                </DetailRow>
                                <DetailRow label="Created">
                                    {formatDateTime(store.createdAt)}
                                </DetailRow>
                                <DetailRow label="Updated">
                                    {formatDateTime(store.updatedAt)}
                                </DetailRow>
                            </dl>
                        </CardBody>
                    </Card>
                </div>
            </div>
        </div>
    );
}