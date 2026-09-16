"use client";

import { useActionState } from "react";
import { redirect, unstable_rethrow } from "next/navigation";
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
  FormActions,
} from "@/components/UI/form";
import { PageHeader } from "@/components/UI/page-header";
import {
  createSupplier,
  updateSupplier,
} from "@/actions/supplier.actions";
import type { GetSupplier } from "@/zod/supplier.schema";

/* ========================================================================== */
/*  Types                                                                     */
/* ========================================================================== */

/**
 * The supplier shape the form receives. `GetSupplier` minus the fields a Client
 * Component can't accept over the RSC boundary (`Temporal.Instant`) and minus
 * `storeId`, which the page supplies separately.
 */
export type SupplierFormValues = Omit<
  GetSupplier,
  "storeId" | "createdAt" | "updatedAt"
>;

export type SupplierFormProps =
  | {
    mode: "create";
    storeId: string;
    basePath: string;
    createSupplierAction: typeof createSupplier;
  }
  | {
    mode: "edit";
    storeId: string;
    basePath: string;
    supplier: SupplierFormValues;
    updateSupplierAction: typeof updateSupplier;
  };

/* ========================================================================== */
/*  Helpers                                                                   */
/* ========================================================================== */

function parseString(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/* ========================================================================== */
/*  SupplierForm                                                              */
/* ========================================================================== */

export function SupplierForm(props: SupplierFormProps) {
  const { storeId, basePath } = props;
  const supplier = props.mode === "edit" ? props.supplier : undefined;

  const backHref = supplier ? `${basePath}/${supplier.id}` : basePath;

  const [error, formAction, isPending] = useActionState<string | null, FormData>(
    async (_prev, formData) => {
      const name = parseString(formData.get("name"));
      if (!name) return "Supplier name is required.";

      const payload = {
        name,
        phone: parseString(formData.get("phone")),
        email: parseString(formData.get("email")),
        address: parseString(formData.get("address")),
        taxNumber: parseString(formData.get("taxNumber")),
        notes: parseString(formData.get("notes")),
      };

      if (props.mode === "create") {
        try {
          const result = await props.createSupplierAction(storeId, {
            ...payload,
            storeId,
          });
          if (!result.ok) return result.message;

          redirect(`${basePath}/${result.id}`);
        } catch (err) {
          unstable_rethrow(err);
          return "Could not save the supplier. Please try again.";
        }
      }

      /* Edit branch — `props.mode === "edit"` narrows the type here. */
      try {
        const result = await props.updateSupplierAction(storeId, {
          ...payload,
          id: props.supplier.id,
          storeId,
        });
        if (!result.ok) return result.message;

        redirect(`${basePath}/${props.supplier.id}`);
      } catch (err) {
        unstable_rethrow(err);
        return "Could not save the supplier. Please try again.";
      }
    },
    null,
  );

  return (
    <>
      <PageHeader
        title={props.mode === "edit" ? "Edit Supplier" : "Add Supplier"}
        breadcrumbs={[
          { label: "Suppliers", href: basePath },
          ...(supplier
            ? [
              { label: supplier.name, href: backHref },
              { label: "Edit" },
            ]
            : [{ label: "New" }]),
        ]}
        backHref={backHref}
        description={
          props.mode === "edit"
            ? "Update this supplier's details."
            : "Record a supplier you buy stock from. Only the name is required."
        }
      />

      <form action={formAction} autoComplete="off" className="mt-6">
        <div className="space-y-4">
          {/* ─── Basic Information ─────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  label="Supplier Name"
                  htmlFor="supplier-name"
                  required
                  className="md:col-span-2"
                >
                  <Input
                    id="supplier-name"
                    name="name"
                    defaultValue={supplier?.name ?? ""}
                    placeholder="e.g. Green Leaf Farms"
                    required
                    maxLength={120}
                  />
                </FormField>

                <FormField
                  label="Phone"
                  htmlFor="supplier-phone"
                  description="Include the country code if the supplier is international."
                >
                  <Input
                    id="supplier-phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    defaultValue={supplier?.phone ?? ""}
                    placeholder="+213 550 00 00 00"
                    maxLength={32}
                  />
                </FormField>

                <FormField
                  label="Email"
                  htmlFor="supplier-email"
                  description="Used for purchase orders and correspondence."
                >
                  <Input
                    id="supplier-email"
                    name="email"
                    type="email"
                    inputMode="email"
                    defaultValue={supplier?.email ?? ""}
                    placeholder="orders@example.com"
                    maxLength={160}
                  />
                </FormField>

                <FormField
                  label="Tax Number"
                  htmlFor="supplier-tax-number"
                  description="Optional. NIF, NIS, or local tax ID."
                  className="md:col-span-2"
                >
                  <Input
                    id="supplier-tax-number"
                    name="taxNumber"
                    defaultValue={supplier?.taxNumber ?? ""}
                    placeholder="e.g. 000000000000000"
                    maxLength={40}
                    className="font-mono"
                  />
                </FormField>
              </div>
            </CardBody>
          </Card>

          {/* ─── Address & Notes ────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Address &amp; Notes</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <FormField
                  label="Address"
                  htmlFor="supplier-address"
                  description="The supplier's business address, if known."
                >
                  <Textarea
                    id="supplier-address"
                    name="address"
                    defaultValue={supplier?.address ?? ""}
                    placeholder={"12 Rue Didouche Mourad\nAlger Centre, 16000"}
                    rows={3}
                    maxLength={300}
                  />
                </FormField>

                <FormField
                  label="Notes"
                  htmlFor="supplier-notes"
                  description="Delivery schedule, payment terms, or anything worth remembering."
                >
                  <Textarea
                    id="supplier-notes"
                    name="notes"
                    defaultValue={supplier?.notes ?? ""}
                    placeholder="e.g. Livraison deux fois par semaine (mar. & ven.)."
                    rows={4}
                    maxLength={1000}
                  />
                </FormField>
              </div>
            </CardBody>
          </Card>

          {error && (
            <p
              role="alert"
              className="rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-body-sm text-danger-fg"
            >
              {error}
            </p>
          )}

          {/* ─── Actions ─────────────────────────────────────── */}
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
                  : props.mode === "edit"
                    ? "Save Changes"
                    : "Create Supplier"}
              </Button>
            }
          />
        </div>
      </form>
    </>
  );
}