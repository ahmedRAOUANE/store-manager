import { notFound } from "next/navigation";

import { getProductById, updateProduct } from "@/actions/product.actions";
import {
    ProductForm,
    type ProductFormValues,
} from "@/components/products/product-form";
import { AppError } from "@/errors/base.error";

export default async function EditProductPage({
    params,
}: PageProps<"/stores/[storeId]/owner/products/[productId]/edit">) {
    const { storeId, productId } = await params;

    const result = await getProductById(storeId, productId);

    if (result instanceof AppError) notFound();

    /**
     * Strip `Temporal.Instant` fields and `storeId` before handing the
     * product to the client component. RSC can't serialize Temporal, and
     * `storeId` is already a separate prop.
     */
    const product: ProductFormValues = {
        id: result.id,
        name: result.name,
        sku: result.sku,
        barcode: result.barcode,
        description: result.description,
        unit: result.unit,
        stockQuantity: result.stockQuantity,
        minimumStock: result.minimumStock,
        averageCost: result.averageCost,
        sellingPrice: result.sellingPrice,
        isActive: result.isActive,
    };

    return (
        <ProductForm
            basePath={`/stores/${storeId}/owner/products`}
            mode="edit"
            storeId={storeId}
            product={product}
            updateProductAction={updateProduct}
        />
    );
}