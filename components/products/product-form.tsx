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
                        success: "Product updated successfully.",
                    };
                }

                /*
                 * Create:
                 * Stay on the page so multiple products can be created.
                 */
                formRef.current?.reset();

                return {
                    error: null,
                    success: "Product created successfully.",
                };
            } catch {
                return {
                    error: "Could not save the product. Please try again.",
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
                title={mode === "edit" ? "Edit Product" : "Add Product"}
                breadcrumbs={[
                    {
                        label: "Products",
                        href: basePath,
                    },
                    ...(mode === "edit"
                        ? [
                            {
                                label: props.product.name,
                                href: backHref,
                            },
                            {
                                label: "Edit",
                            },
                        ]
                        : [
                            {
                                label: "New",
                            },
                        ]),
                ]}
                backHref={backHref}
                description={
                    mode === "edit"
                        ? "Update the details for this product."
                        : "Fill in the details below. Fields marked with * are required."
                }
            />

            {/* ================================================================= */}
            {/* Notifications                                                    */}
            {/* ================================================================= */}

            {state.success && (
                <div
                    role="status"
                    aria-live="polite"
                    className="fixed right-4 top-4 z-50 w-[calc(100%-2rem)] max-w-sm rounded-lg border border-success-border bg-success-bg px-4 py-3 shadow-lg"
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
                                Success
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
                    className="fixed right-4 top-4 z-50 w-[calc(100%-2rem)] max-w-sm rounded-lg border border-danger-border bg-danger-bg px-4 py-3 shadow-lg"
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
                                Something went wrong
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
                            <CardTitle>Basic Information</CardTitle>
                        </CardHeader>

                        <CardBody>
                            <div className="grid gap-4 md:grid-cols-2">
                                <FormField
                                    label="Product Name"
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
                                        placeholder="e.g. Organic Hass Avocado"
                                        required
                                        maxLength={120}
                                    />
                                </FormField>

                                {mode === "edit" && (
                                    <FormField
                                        label="SKU"
                                        htmlFor="product-sku"
                                        description="SKU cannot be changed after a product is created."
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
                                    label="Unit"
                                    htmlFor="product-unit"
                                    description="How the product is sold, e.g. each, kg, loaf."
                                >
                                    <Input
                                        id="product-unit"
                                        name="unit"
                                        defaultValue={
                                            product?.unit ?? ""
                                        }
                                        placeholder="each"
                                        maxLength={20}
                                    />
                                </FormField>

                                <FormField
                                    label="Barcode"
                                    htmlFor="product-barcode"
                                    description="Optional. Scan or paste the EAN/UPC."
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
                                        placeholder="8901234567890"
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
                            <CardTitle>Pricing</CardTitle>
                        </CardHeader>

                        <CardBody>
                            <div className="grid gap-4 md:grid-cols-2">
                                <FormField
                                    label="Selling Price"
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
                                        label="Cost Price"
                                        htmlFor="product-cost-price"
                                        description="Derived from purchase history. Not editable here."
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
                            <CardTitle>Inventory</CardTitle>
                        </CardHeader>

                        <CardBody>
                            <div className="grid gap-4 md:grid-cols-2">
                                {mode === "edit" && (
                                    <FormField
                                        label="Current Stock"
                                        htmlFor="product-stock"
                                        description="Updated by purchases and sales. Not editable here."
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
                                    label="Minimum Stock"
                                    htmlFor="product-minimum-stock"
                                    description="Alerts you when stock drops to or below this level."
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
                                    label="Status"
                                    htmlFor="product-status"
                                    description="Inactive products are hidden from the sale screen."
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
                                            Active
                                        </option>
                                        <option value="inactive">
                                            Inactive
                                        </option>
                                    </Select>
                                </FormField>
                            </div>
                        </CardBody>
                    </Card>

                    {/* ─── Description ───────────────────────────────────── */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Description</CardTitle>
                        </CardHeader>

                        <CardBody>
                            <FormField
                                label="Description"
                                htmlFor="product-description"
                                description="Optional. Shown on the product detail page and sale screen."
                            >
                                <Textarea
                                    id="product-description"
                                    name="description"
                                    defaultValue={
                                        product?.description ?? ""
                                    }
                                    placeholder="Add any notes about this product…"
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
                                Cancel
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
                                    ? "Saving…"
                                    : mode === "edit"
                                        ? "Save Changes"
                                        : "Create Product"}
                            </Button>
                        }
                    />
                </div>
            </form>
        </>
    );
}
