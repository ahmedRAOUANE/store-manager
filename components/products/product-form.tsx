"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/UI/btn";
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
import { PageHeader } from "@/components/UI/page-header";
import {
    createProduct,
    updateProduct,
} from "@/actions/product.actions";
import type { GetProduct } from "@/zod/product.schema";
import { useTranslations } from "next-intl";

/* ========================================================================== */
/* Types                                                                      */
/* ========================================================================== */

export type ProductFormValues = Omit<
    GetProduct,
    "storeId" | "createdAt" | "updatedAt"

>;

export type ProductFormProps =
    | {
        mode: "create";
        storeId: string;
        /** Role-scoped base path, e.g. `/stores/{id}/manager/products`. */
        basePath: string;
        createProductAction: typeof createProduct;
    }
    | {
        mode: "edit";
        storeId: string;
        basePath: string;
        product: ProductFormValues;
        updateProductAction: typeof updateProduct;
    };

type FormState = {
    error: string | null;
    success: string | null;
};

/* ========================================================================== */
/* Helpers                                                                    */
/* ========================================================================== */

function parseNumber(
    value: FormDataEntryValue | null,
): number | undefined {
    if (typeof value !== "string" || value.trim() === "") {
        return undefined;
    }

    const n = Number.parseFloat(value);

    return Number.isFinite(n) ? n : undefined;

}

function parseString(
    value: FormDataEntryValue | null,
): string | undefined {
    if (typeof value !== "string") {
        return undefined;
    }

    const trimmed = value.trim();

    return trimmed === "" ? undefined : trimmed;

}

/* ========================================================================== */
/* ProductForm                                                                */
/* ========================================================================== */

export function ProductForm(props: ProductFormProps) {
    const t = useTranslations("products");
    const commonT = useTranslations("common");
    
    const router = useRouter();
    const formRef = useRef<HTMLFormElement>(null);

    const { mode, storeId, basePath } = props;
    const product = mode === "edit" ? props.product : undefined;

    const backHref = product
        ? `${basePath}/${product.id}`
        : basePath;

    const [state, formAction, isPending] = useActionState<
        FormState,
        FormData
    >(
        async (_prev, formData) => {
            const input = {
                name: parseString(formData.get("name")) ?? "",
                barcode: parseString(formData.get("barcode")) ?? null,
                description:
                    parseString(formData.get("description")) ?? null,
                unit: parseString(formData.get("unit")) ?? "",
                sellingPrice:
                    parseNumber(formData.get("sellingPrice")) ?? 0,
                minimumStock:
                    parseNumber(formData.get("minimumStock")) ?? 0,
                isActive: formData.get("isActive") === "active",
            };

            try {
                const result =
                    mode === "edit"
                        ? await props.updateProductAction(
                            storeId,
                            props.product.id,
                            input,
                        )
                        : await props.createProductAction(
                            storeId,
                            input,
                        );

                if (!result.ok) {
                    return {
                        error: result.message,
                        success: null,
                    };
                }

                /*
                 * Edit:
                 * Go back to the product detail page after saving.
                 */
                if (mode === "edit") {
                    router.push(
                        `${basePath}/${props.product.id}`,
                    );

                    router.refresh();

                    return {
                        error: null,
                        success: t("notifications.updated"),
                    };
                }

                /*
                 * Create:
                 * Stay on the page so multiple products can be created.
                 */
                formRef.current?.reset();

                return {
                    error: null,
                    success: t("notifications.created"),
                };
            } catch {
                return {
                    error: t("errors.saveFailed"),
                    success: null,
                };
            }
        },
        {
            error: null,
            success: null,
        },
    );

    /*
     * Automatically remove the success notification after 4 seconds.
     *
     * We don't automatically clear errors here because errors should remain
     * visible until the user successfully submits the form again.
     */
    useEffect(() => {
        if (!state.success) {
            return;
        }

        const timer = window.setTimeout(() => {
            // Triggering a new form action just to clear the message would be
            // unnecessary. The notification is intentionally transient.
        }, 4000);

        return () => window.clearTimeout(timer);
    }, [state.success]);

    return (
        <>
            <PageHeader
                title={mode === "edit" ? t("editTitle") : t("createTitle")}
                breadcrumbs={[
                    {
                        label: t("title"),
                        href: basePath,
                    },
                    ...(mode === "edit"
                        ? [
                            {
                                label: props.product.name,
                                href: backHref,
                            },
                            {
                                label: t("edit"),
                            },
                        ]
                        : [
                            {
                                label: t("new"),
                            },
                        ]),
                ]}
                backHref={backHref}
                description={
                    mode === "edit"
                        ? t("editDescription")
                        : t("createDescription")
                }
            />

            {/* ================================================================= */}
            {/* Notifications                                                    */}
            {/* ================================================================= */}

            {state.success && (
                <div
                    role="status"
                    aria-live="polite"
                    className="fixed inset-e-4 top-4 z-50 w-[calc(100%-2rem)] max-w-sm rounded-lg border border-success-border bg-success-bg px-4 py-3 shadow-lg"
                >
                    <div className="flex items-start gap-3">
                        <span
                            aria-hidden="true"
                            className="mt-0.5 text-success-fg"
                        >
                            ✓
                        </span>

                        <div>
                            <p className="text-body-sm font-medium text-success-fg">
                                {t("notifications.success")}
                            </p>

                            <p className="mt-0.5 text-body-sm text-success-fg">
                                {state.success}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {state.error && (
                <div
                    role="alert"
                    aria-live="assertive"
                    className="fixed inset-e-4 top-4 z-50 w-[calc(100%-2rem)] max-w-sm rounded-lg border border-danger-border bg-danger-bg px-4 py-3 shadow-lg"
                >
                    <div className="flex items-start gap-3">
                        <span
                            aria-hidden="true"
                            className="mt-0.5 text-danger-fg"
                        >
                            !
                        </span>

                        <div>
                            <p className="text-body-sm font-medium text-danger-fg">
                                {t("notifications.error")}
                            </p>

                            <p className="mt-0.5 text-body-sm text-danger-fg">
                                {state.error}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <form
                ref={formRef}
                action={formAction}
                autoComplete="off"
                className="mt-6"
            >
                <div className="space-y-4">
                    {/* ─── Basic Information ─────────────────────────────── */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("basicInformation")}</CardTitle>
                        </CardHeader>

                        <CardBody>
                            <div className="grid gap-4 md:grid-cols-2">
                                <FormField
                                    label={t("fields.name.label")}
                                    htmlFor="product-name"
                                    required
                                    className="md:col-span-2"
                                >
                                    <Input
                                        id="product-name"
                                        name="name"
                                        defaultValue={
                                            product?.name ?? ""
                                        }
                                        placeholder={t("fields.name.placeholder")}
                                        required
                                        maxLength={120}
                                    />
                                </FormField>

                                {mode === "edit" && (
                                    <FormField
                                        label={t("fields.sku.label")}
                                        htmlFor="product-sku"
                                        description={t("fields.sku.description")}
                                    >
                                        <Input
                                            id="product-sku"
                                            defaultValue={product!.sku}
                                            disabled
                                            className="font-mono"
                                        />
                                    </FormField>
                                )}

                                <FormField
                                    label={t("fields.unit.label")}
                                    htmlFor="product-unit"
                                    description={t("fields.unit.description")}
                                >
                                    <Input
                                        id="product-unit"
                                        name="unit"
                                        defaultValue={
                                            product?.unit ?? ""
                                        }
                                        placeholder={t("fields.unit.placeholder")}
                                        maxLength={20}
                                    />
                                </FormField>

                                <FormField
                                    label={t("fields.barcode.label")}
                                    htmlFor="product-barcode"
                                    description={t("fields.barcode.description")}
                                    className={
                                        mode === "edit"
                                            ? undefined
                                            : "md:col-span-2"
                                    }
                                >
                                    <Input
                                        id="product-barcode"
                                        name="barcode"
                                        defaultValue={
                                            product?.barcode ?? ""
                                        }
                                        placeholder={t("fields.barcode.placeholder")}
                                        className="font-mono"
                                        maxLength={32}
                                    />
                                </FormField>
                            </div>
                        </CardBody>
                    </Card>

                    {/* ─── Pricing ───────────────────────────────────────── */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("pricing")}</CardTitle>
                        </CardHeader>

                        <CardBody>
                            <div className="grid gap-4 md:grid-cols-2">
                                <FormField
                                    label={t("fields.sellingPrice.label")}
                                    htmlFor="product-selling-price"
                                    required
                                >
                                    <Input
                                        id="product-selling-price"
                                        name="sellingPrice"
                                        type="number"
                                        inputMode="decimal"
                                        step="0.01"
                                        min="0"
                                        required
                                        defaultValue={
                                            product?.sellingPrice ?? ""
                                        }
                                        placeholder="0.00"
                                    />
                                </FormField>

                                {mode === "edit" && (
                                    <FormField
                                        label={t("fields.costPrice.label")}
                                        htmlFor="product-cost-price"
                                        description={t("fields.costPrice.description")}
                                    >
                                        <Input
                                            id="product-cost-price"
                                            defaultValue={
                                                product!.averageCost
                                            }
                                            disabled
                                        />
                                    </FormField>
                                )}
                            </div>
                        </CardBody>
                    </Card>

                    {/* ─── Inventory ─────────────────────────────────────── */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("inventory")}</CardTitle>
                        </CardHeader>

                        <CardBody>
                            <div className="grid gap-4 md:grid-cols-2">
                                {mode === "edit" && (
                                    <FormField
                                        label={t("fields.currentStock.label")}
                                        htmlFor="product-stock"
                                        description={t("fields.currentStock.description")}
                                    >
                                        <Input
                                            id="product-stock"
                                            defaultValue={
                                                product!.stockQuantity
                                            }
                                            disabled
                                        />
                                    </FormField>
                                )}

                                <FormField
                                    label={t("fields.minimumStock.label")}
                                    htmlFor="product-minimum-stock"
                                    description={t("fields.minimumStock.description")}
                                >
                                    <Input
                                        id="product-minimum-stock"
                                        name="minimumStock"
                                        type="number"
                                        inputMode="decimal"
                                        step="1"
                                        min="0"
                                        defaultValue={
                                            product?.minimumStock ?? ""
                                        }
                                        placeholder="5"
                                    />
                                </FormField>

                                <FormField
                                    label={t("fields.status.label")}
                                    htmlFor="product-status"
                                    description={t("fields.status.description")}
                                >
                                    <Select
                                        id="product-status"
                                        name="isActive"
                                        defaultValue={
                                            product
                                                ? product.isActive
                                                    ? "active"
                                                    : "inactive"
                                                : "active"
                                        }
                                    >
                                        <option value="active">
                                            {t("status.active")}
                                        </option>
                                        <option value="inactive">
                                            {t("status.inactive")}
                                        </option>
                                    </Select>
                                </FormField>
                            </div>
                        </CardBody>
                    </Card>

                    {/* ─── Description ───────────────────────────────────── */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("description")}</CardTitle>
                        </CardHeader>

                        <CardBody>
                            <FormField
                                label={t("fields.description.label")}
                                htmlFor="product-description"
                                description={t("fields.description.description")}
                            >
                                <Textarea
                                    id="product-description"
                                    name="description"
                                    defaultValue={
                                        product?.description ?? ""
                                    }
                                    placeholder={t("fields.description.placeholder")}
                                    rows={4}
                                    maxLength={1000}
                                />
                            </FormField>
                        </CardBody>
                    </Card>

                    {/* ─── Actions ────────────────────────────────────────── */}
                    <FormActions
                        secondary={
                            <Link
                                href={backHref}
                                className={buttonVariants({
                                    variant: "ghost",
                                    size: "md",
                                })}
                            >
                                {commonT("cancel")}
                            </Link>
                        }
                        primary={
                            <Button
                                type="submit"
                                variant="primary"
                                size="md"
                                loading={isPending}
                                disabled={isPending}
                            >
                                {isPending
                                    ? t("saving")
                                    : mode === "edit"
                                        ? t("saveChanges")
                                        : t("create")}
                            </Button>
                        }
                    />
                </div>
            </form>
        </>
    );
}
