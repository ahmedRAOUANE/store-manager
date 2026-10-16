import { createSupplier } from "@/actions/supplier.actions";
import { SupplierForm } from "@/components/suppliers/supplier-form";

export default async function ManagerNewSupplierPage({
    params,
}: PageProps<"/stores/[storeId]/manager/suppliers/new">) {
    const { storeId } = await params;

    return (
        <SupplierForm
            mode="create"
            storeId={storeId}
            basePath={`/stores/${storeId}/manager/suppliers`}
            createSupplierAction={createSupplier}
        />
    );
}