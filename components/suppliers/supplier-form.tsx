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
import { useTranslations } from "next-intl";

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
  const t = useTranslations("suppliers");
  const commonT = useTranslations("common");

  const { storeId, basePath } = props;
  const supplier = props.mode === "edit" ? props.supplier : undefined;

  const backHref = supplier ? `${basePath}/${supplier.id}` : basePath;

  const [error, formAction, isPending] = useActionState<string | null, FormData>(
    async (_prev, formData) => {
      const name = parseString(formData.get("name"));
      if (!name) return t("validation.nameRequired");

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
          return t("errors.saveFailed");
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
        return t("errors.saveFailed");
      }
    },
    null,
  );

  return (
    <>
      <PageHeader
        title={
          props.mode === "edit"
            ? t("editTitle")
            : t("createTitle")
        }
        breadcrumbs={[
          { label: t("title"), href: basePath },
          ...(supplier
            ? [
              { label: supplier.name, href: backHref },
              { label: t("edit") },
            ]
            : [{ label: t("new") }]),
        ]}
        backHref={backHref}
        description={
          props.mode === "edit"
            ? t("editDescription")
            : t("createDescription")
        }
      />

      <form action={formAction} autoComplete="off" className="mt-6">
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
                  htmlFor="supplier-name"
                  required
                  className="md:col-span-2"
                >
                  <Input
                    id="supplier-name"
                    name="name"
                    defaultValue={supplier?.name ?? ""}
                    placeholder={t("fields.name.placeholder")}
                    required
                    maxLength={120}
                  />
                </FormField>

                <FormField
                  label={t("fields.phone.label")}
                  htmlFor="supplier-phone"
                  description={t("fields.phone.description")}
                >
                  <Input
                    id="supplier-phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    defaultValue={supplier?.phone ?? ""}
                    placeholder={t("fields.phone.placeholder")}
                    maxLength={32}
                  />
                </FormField>

                <FormField
                  label={t("fields.email.label")}
                  htmlFor="supplier-email"
                  description={t("fields.email.description")}
                >
                  <Input
                    id="supplier-email"
                    name="email"
                    type="email"
                    inputMode="email"
                    defaultValue={supplier?.email ?? ""}
                    placeholder={t("fields.email.placeholder")}
                    maxLength={160}
                  />
                </FormField>

                <FormField
                  label={t("fields.taxNumber.label")}
                  htmlFor="supplier-tax-number"
                  description={t("fields.taxNumber.description")}
                  className="md:col-span-2"
                >
                  <Input
                    id="supplier-tax-number"
                    name="taxNumber"
                    defaultValue={supplier?.taxNumber ?? ""}
                    placeholder={t("fields.taxNumber.placeholder")}
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
              <CardTitle>{t("addressAndNotes")}</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <FormField
                  label={t("fields.address.label")}
                  htmlFor="supplier-address"
                  description={t("fields.address.description")}
                >
                  <Textarea
                    id="supplier-address"
                    name="address"
                    defaultValue={supplier?.address ?? ""}
                    placeholder={t("fields.address.placeholder")}
                    rows={3}
                    maxLength={300}
                  />
                </FormField>

                <FormField
                  label={t("fields.notes.label")}
                  htmlFor="supplier-notes"
                  description={t("fields.notes.description")}
                >
                  <Textarea
                    id="supplier-notes"
                    name="notes"
                    defaultValue={supplier?.notes ?? ""}
                    placeholder={t("fields.notes.placeholder")}
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
                  size: "md"
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
                className="text-white"
              >
                {isPending
                  ? t("saving")
                  : props.mode === "edit"
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