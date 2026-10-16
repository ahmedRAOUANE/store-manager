import { notFound } from "next/navigation";

import { getSupplierById, updateSupplier } from "@/actions/supplier.actions";
import {
  SupplierForm,
  type SupplierFormValues,
} from "@/components/suppliers/supplier-form";
import { AppError } from "@/errors/base.error";

export default async function EditSupplierPage({
  params,
}: PageProps<"/stores/[storeId]/owner/suppliers/[supplierId]/edit">) {
  const { storeId, supplierId } = await params;

  const result = await getSupplierById(storeId, supplierId);

  if (result instanceof AppError) notFound();

  /* Strip Temporal fields and storeId before handing to the client. */
  const supplier: SupplierFormValues = {
    id: result.id,
    name: result.name,
    phone: result.phone,
    email: result.email,
    address: result.address,
    taxNumber: result.taxNumber,
    notes: result.notes,
  };

  return (
    <SupplierForm
      mode="edit"
      storeId={storeId}
      basePath={`/stores/${storeId}/owner/suppliers`}
      supplier={supplier}
      updateSupplierAction={updateSupplier}
    />
  );
}