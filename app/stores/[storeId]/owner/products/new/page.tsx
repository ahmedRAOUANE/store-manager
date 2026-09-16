import { createProduct } from "@/actions/product.actions";
import { ProductForm } from "@/components/products/product-form";

export default async function NewProductPage({
    params,
}: PageProps<"/stores/[storeId]/owner/products/new">) {
    const { storeId } = await params;

    return (
        <ProductForm
            basePath={`/stores/${storeId}/owner/products`}
            mode="create"
            storeId={storeId}
            createProductAction={createProduct}
        />
    );
}