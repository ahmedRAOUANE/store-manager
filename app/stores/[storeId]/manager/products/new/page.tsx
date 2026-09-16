import { createProduct } from "@/actions/product.actions";
import { ProductForm } from "@/components/products/product-form";

export default async function ManagerNewProductPage({
    params,
}: PageProps<"/stores/[storeId]/manager/products/new">) {
    const { storeId } = await params;

    return (
        <ProductForm
            mode="create"
            storeId={storeId}
            basePath={`/stores/${storeId}/manager/products`}
            createProductAction={createProduct}
        />
    );
}