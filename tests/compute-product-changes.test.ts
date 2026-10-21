import { describe, it, expect } from "vitest";
import "temporal-polyfill/full/global";

import { computeProductChanges } from "../utils/compute-product-changes";
import type { GetProduct } from "../zod/product.schema";
import { Temporal } from "temporal-polyfill";

const baseProduct: GetProduct = {
    id: "11111111-1111-4111-8111-111111111111",
    storeId: "22222222-2222-4222-8222-222222222222",
    name: "Test Product",
    sku: "SKU-001",
    barcode: null,
    description: "Test description",
    unit: "piece",
    stockQuantity: 10,
    minimumStock: 5,
    averageCost: 4,
    sellingPrice: 10,
    isActive: true,
    createdAt: Temporal.Instant.fromEpochMilliseconds(1_700_000_000_000),
    updatedAt: Temporal.Instant.fromEpochMilliseconds(1_700_000_000_000),
};

describe("computeProductChanges", () => {
    it("returns an empty object when nothing changed", () => {
        expect(computeProductChanges(baseProduct, baseProduct)).toEqual({});
    });

    it("detects a single field change", () => {
        const after: GetProduct = { ...baseProduct, name: "Updated" };
        expect(computeProductChanges(baseProduct, after)).toEqual({
            name: { previous: "Test Product", next: "Updated" },
        });
    });

    it("detects multiple field changes in one call", () => {
        const after: GetProduct = {
            ...baseProduct,
            name: "Updated",
            sellingPrice: 15,
            isActive: false,
        };
        const changes = computeProductChanges(baseProduct, after);

        expect(Object.keys(changes).sort()).toEqual([
            "isActive",
            "name",
            "sellingPrice",
        ]);
        expect(changes.sellingPrice).toEqual({
            previous: 10,
            next: 15,
        });
        expect(changes.isActive).toEqual({
            previous: true,
            next: false,
        });
    });

    it("detects null → value transitions", () => {
        const after: GetProduct = { ...baseProduct, barcode: "1234567890" };
        expect(computeProductChanges(baseProduct, after)).toEqual({
            barcode: { previous: null, next: "1234567890" },
        });
    });

    it("detects value → null transitions", () => {
        const before: GetProduct = { ...baseProduct, description: "old" };
        const after: GetProduct = { ...baseProduct, description: null };
        expect(computeProductChanges(before, after)).toEqual({
            description: { previous: "old", next: null },
        });
    });

    it("ignores stockQuantity changes", () => {
        const after: GetProduct = { ...baseProduct, stockQuantity: 3 };
        expect(computeProductChanges(baseProduct, after)).toEqual({});
    });

    it("ignores averageCost changes", () => {
        const after: GetProduct = { ...baseProduct, averageCost: 99 };
        expect(computeProductChanges(baseProduct, after)).toEqual({});
    });

    it("ignores system-managed fields (id, sku, createdAt, updatedAt)", () => {
        const after: GetProduct = {
            ...baseProduct,
            id: "99999999-9999-4999-8999-999999999999",
            sku: "SKU-999",
            updatedAt: Temporal.Instant.fromEpochMilliseconds(
                1_800_000_000_000,
            ),
        };
        expect(computeProductChanges(baseProduct, after)).toEqual({});
    });
});