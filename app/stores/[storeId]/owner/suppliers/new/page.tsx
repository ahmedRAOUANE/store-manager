import { createSupplier } from "@/actions/supplier.actions";
import { SupplierForm } from "@/components/suppliers/supplier-form";

export default async function NewSupplierPage({
    params,
}: PageProps<"/stores/[storeId]/owner/suppliers/new">) {
    const { storeId } = await params;

    return (
        <SupplierForm
            mode="create"
            storeId={storeId}
            basePath={`/stores/${storeId}/owner/suppliers`}
            createSupplierAction={createSupplier}
        />
    );
}