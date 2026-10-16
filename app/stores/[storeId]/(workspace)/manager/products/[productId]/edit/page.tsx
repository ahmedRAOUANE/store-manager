import { notFound } from "next/navigation";

import {
    getProductById,
    updateProduct,
} from "@/actions/product.actions";
import {
    ProductForm,
    type ProductFormValues,
} from "@/components/products/product-form";
import { AppError } from "@/errors/base.error";

export default async function ManagerEditProductPage({
    params,
}: PageProps<"/stores/[storeId]/manager/products/[productId]/edit">) {
    const { storeId, productId } = await params;

    const result = await getProductById(storeId, productId);

    if (result instanceof AppError) notFound();

    /* Strip Temporal fields and storeId before handing to the client. */
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
            mode="edit"
            storeId={storeId}
            basePath={`/stores/${storeId}/manager/products`}
            product={product}
            updateProductAction={updateProduct}
        />
    );
}