"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronDown,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  Truck,
  X,
} from "lucide-react";

import { Button } from "@/components/UI/btn";
import { Input, Select } from "@/components/UI/form";
import { EmptyState } from "@/components/UI/state";
import { formatCurrency } from "@/utils/format";
import { cn } from "@/utils/jsx-classes";
import { createPurchase } from "@/actions/purchase.actions";
import type { CreatePurchaseInput } from "@/zod/purchase.schema";
import type { CreatePurchaseItemInput } from "@/zod/purchaseItem.schema";

/* ========================================================================== */
/*  Types                                                                     */
/* ========================================================================== */

export interface PurchaseProduct {
  id: string;
  name: string;
  sku: string;
  unit: string;
  averageCost: number;
  isActive: boolean;
}

export interface PurchaseSupplier {
  id: string;
  name: string;
}

interface PurchaseLine {
  productId: string;
  name: string;
  sku: string;
  unit: string;
  unitCost: number;
  quantity: number;
}

type CreatePurchaseResult =
  | { ok: true; id: string }
  | { ok: false; message: string };

export interface CreatePurchaseScreenProps {
  storeId: string;
  currency?: string;
  products: PurchaseProduct[];
  suppliers: PurchaseSupplier[];
  createPurchaseAction: typeof createPurchase;
  /** Path to the "new supplier" page. Shown when the store has no suppliers. */
  supplierNewHref?: string;
  /** Base path for the "View" link in the success banner. */
  purchaseDetailBasePath?: string;
}

/* ========================================================================== */
/*  SupplierBar                                                               */
/* ========================================================================== */

function SupplierBar({
  suppliers,
  value,
  onChange,
  supplierNewHref,
}: {
  suppliers: PurchaseSupplier[];
  value: string;
  onChange: (v: string) => void;
  supplierNewHref?: string;
}) {
  const empty = suppliers.length === 0;

  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-outline-variant bg-surface-lowest px-4 py-2.5 sm:px-6">
      <span className="flex shrink-0 items-center gap-2 text-body-sm text-on-surface-variant">
        <Truck className="hidden size-4 sm:block" aria-hidden="true" />
        <span className="hidden sm:inline">Purchasing from</span>
        <span className="sm:hidden">Supplier</span>
      </span>

      {empty ? (
        <div className="flex flex-1 items-center gap-2 text-body-sm">
          <span className="text-on-surface-variant">No suppliers yet.</span>
          {supplierNewHref && (
            <Link
              href={supplierNewHref}
              className="font-medium text-info-fg hover:underline"
            >
              Add a supplier →
            </Link>
          )}
        </div>
      ) : (
        <Select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Supplier"
          className="h-8 max-w-md text-body-md"
        >
          <option value="">Select a supplier…</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      )}
    </div>
  );
}

/* ========================================================================== */
/*  ProductSearchInput                                                        */
/* ========================================================================== */

function ProductSearchInput({
  value,
  onChange,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <div className="relative">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by name or SKU…"
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
        className={cn(
          "h-10 w-full rounded-md border border-outline-variant bg-surface-lowest pl-9 pr-3",
          "text-body-md text-on-surface placeholder:text-outline",
          "focus:border-info focus:outline-none focus:ring-1 focus:ring-info",
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded text-on-surface-variant hover:bg-slate-100 hover:text-on-surface"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/* ========================================================================== */
/*  ProductRow                                                                */
/* ========================================================================== */

function ProductRow({
  product,
  inCartQuantity,
  onAdd,
  currency,
}: {
  product: PurchaseProduct;
  inCartQuantity: number;
  onAdd: () => void;
  currency: string;
}) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className={cn(
        "flex w-full items-center justify-between gap-3 px-4 py-3 text-left",
        "transition-colors hover:bg-slate-50 active:bg-slate-100",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-md font-medium text-on-surface">
          {product.name}
        </p>
        <p className="mt-0.5 truncate font-mono text-body-sm text-on-surface-variant">
          {product.sku}
          {!product.isActive && (
            <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 font-sans text-label-sm uppercase text-on-surface-variant">
              Inactive
            </span>
          )}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="text-body-md font-medium tabular-nums text-on-surface">
          {formatCurrency(product.averageCost, currency)}
        </span>
        <span className="text-body-sm text-on-surface-variant">avg cost</span>
      </div>

      {inCartQuantity > 0 && (
        <span className="ml-1 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-info text-label-sm text-on-primary tabular-nums">
          {inCartQuantity}
        </span>
      )}
    </button>
  );
}

/* ========================================================================== */
/*  PurchaseLineRow                                                           */
/* ========================================================================== */

function PurchaseLineRow({
  line,
  onQtyChange,
  onCostChange,
  onRemove,
  currency,
}: {
  line: PurchaseLine;
  onQtyChange: (q: number) => void;
  onCostChange: (c: number) => void;
  onRemove: () => void;
  currency: string;
}) {
  const lineTotal = line.unitCost * line.quantity;

  const stepperBtn = cn(
    "inline-flex size-8 items-center justify-center rounded-md border border-outline-variant",
    "text-on-surface transition-colors",
    "hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent",
  );

  return (
    <li className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-md font-medium text-on-surface">
            {line.name}
          </p>
          <p className="mt-0.5 truncate font-mono text-body-sm text-on-surface-variant">
            {line.sku}
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${line.name}`}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded text-on-surface-variant hover:bg-slate-100 hover:text-danger-fg"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-2.5 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onQtyChange(line.quantity - 1)}
          disabled={line.quantity <= 1}
          aria-label="Decrease quantity"
          className={stepperBtn}
        >
          <Minus className="size-3.5" aria-hidden="true" />
        </button>

        <input
          type="number"
          value={line.quantity}
          onChange={(e) => {
            const next = Number.parseInt(e.target.value, 10);
            if (Number.isFinite(next)) onQtyChange(next);
          }}
          min={1}
          aria-label={`Quantity for ${line.name}`}
          className="h-8 w-16 rounded-md border border-outline-variant bg-surface-lowest text-center text-body-md tabular-nums text-on-surface focus:border-info focus:outline-none focus:ring-1 focus:ring-info"
        />

        <button
          type="button"
          onClick={() => onQtyChange(line.quantity + 1)}
          aria-label="Increase quantity"
          className={stepperBtn}
        >
          <Plus className="size-3.5" aria-hidden="true" />
        </button>

        <span className="ml-1 text-body-sm text-on-surface-variant">
          {line.unit}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-body-sm text-on-surface-variant">
          <span className="shrink-0">Unit cost</span>
          <Input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={line.unitCost}
            onChange={(e) => {
              const next = Number.parseFloat(e.target.value);
              onCostChange(Number.isFinite(next) ? next : 0);
            }}
            aria-label={`Unit cost for ${line.name}`}
            className="h-8 w-24 text-right tabular-nums"
          />
        </label>

        <span className="text-body-md font-medium tabular-nums text-on-surface">
          {formatCurrency(lineTotal, currency)}
        </span>
      </div>
    </li>
  );
}

/* ========================================================================== */
/*  CartItems                                                                 */
/* ========================================================================== */

function CartItems({
  cart,
  onQtyChange,
  onCostChange,
  onRemove,
  currency,
}: {
  cart: PurchaseLine[];
  onQtyChange: (productId: string, q: number) => void;
  onCostChange: (productId: string, c: number) => void;
  onRemove: (productId: string) => void;
  currency: string;
}) {
  if (cart.length === 0) {
    return (
      <EmptyState
        size="sm"
        icon={<ShoppingCart aria-hidden="true" />}
        title="No items yet"
        description="Tap products on the left to add them to this purchase."
      />
    );
  }

  return (
    <ul className="divide-y divide-outline-variant">
      {cart.map((line) => (
        <PurchaseLineRow
          key={line.productId}
          line={line}
          currency={currency}
          onQtyChange={(q) => onQtyChange(line.productId, q)}
          onCostChange={(c) => onCostChange(line.productId, c)}
          onRemove={() => onRemove(line.productId)}
        />
      ))}
    </ul>
  );
}

/* ========================================================================== */
/*  CurrencyInput                                                             */
/* ========================================================================== */

function CurrencyInput({
  value,
  onChange,
  disabled,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      step="0.01"
      min="0"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="0.00"
      disabled={disabled}
      aria-label={ariaLabel}
      className="h-8 text-right tabular-nums"
    />
  );
}

/* ========================================================================== */
/*  CartTotals — form bound to the Server Action                              */
/* ========================================================================== */

interface Totals {
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  other: number;
  total: number;
  due: number;
}

function CartTotals({
  cart,
  supplierSelected,
  totals,
  currency,
  discountAmount,
  setDiscountAmount,
  taxAmount,
  setTaxAmount,
  shippingCost,
  setShippingCost,
  otherCost,
  setOtherCost,
  amountPaid,
  setAmountPaid,
  formAction,
  pending,
  error,
}: {
  cart: PurchaseLine[];
  supplierSelected: boolean;
  totals: Totals;
  currency: string;
  discountAmount: string;
  setDiscountAmount: (v: string) => void;
  taxAmount: string;
  setTaxAmount: (v: string) => void;
  shippingCost: string;
  setShippingCost: (v: string) => void;
  otherCost: string;
  setOtherCost: (v: string) => void;
  amountPaid: string;
  setAmountPaid: (v: string) => void;
  formAction: (formData: FormData) => void;
  pending: boolean;
  error: string | null;
}) {
  const [additionalOpen, setAdditionalOpen] = useState(false);

  const empty = cart.length === 0;
  const disabled = empty || !supplierSelected || pending;

  const additionalSum = totals.tax + totals.shipping + totals.other;

  return (
    <form
      action={formAction}
      className="space-y-3 border-t border-outline-variant p-4"
    >
      <dl className="space-y-1.5 text-body-md">
        <div className="flex items-center justify-between">
          <dt className="text-on-surface-variant">Subtotal</dt>
          <dd className="tabular-nums text-on-surface">
            {formatCurrency(totals.subtotal, currency)}
          </dd>
        </div>

        <div className="flex items-center justify-between gap-3">
          <dt className="shrink-0 text-on-surface-variant">Discount</dt>
          <dd className="w-28">
            <CurrencyInput
              value={discountAmount}
              onChange={setDiscountAmount}
              disabled={empty}
              ariaLabel="Discount amount"
            />
          </dd>
        </div>

        {additionalOpen ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <dt className="shrink-0 text-on-surface-variant">Tax</dt>
              <dd className="w-28">
                <CurrencyInput
                  value={taxAmount}
                  onChange={setTaxAmount}
                  disabled={empty}
                  ariaLabel="Tax amount"
                />
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="shrink-0 text-on-surface-variant">Shipping</dt>
              <dd className="w-28">
                <CurrencyInput
                  value={shippingCost}
                  onChange={setShippingCost}
                  disabled={empty}
                  ariaLabel="Shipping cost"
                />
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="shrink-0 text-on-surface-variant">Other</dt>
              <dd className="w-28">
                <CurrencyInput
                  value={otherCost}
                  onChange={setOtherCost}
                  disabled={empty}
                  ariaLabel="Other cost"
                />
              </dd>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setAdditionalOpen(true)}
            className="flex w-full items-center justify-between rounded-md py-1 text-body-md transition-colors hover:bg-slate-50"
          >
            <span className="flex items-center gap-1.5 text-info-fg">
              <ChevronDown className="size-3.5" aria-hidden="true" />
              Additional charges
            </span>
            <span className="tabular-nums text-on-surface-variant">
              {additionalSum > 0
                ? formatCurrency(additionalSum, currency)
                : "—"}
            </span>
          </button>
        )}

        {additionalOpen && (
          <button
            type="button"
            onClick={() => setAdditionalOpen(false)}
            className="text-body-sm text-info-fg hover:underline"
          >
            Hide additional charges
          </button>
        )}

        <div className="flex items-center justify-between border-t border-outline-variant pt-2">
          <dt className="text-title-md text-on-surface">Total</dt>
          <dd className="text-title-md tabular-nums text-on-surface">
            {formatCurrency(totals.total, currency)}
          </dd>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1.5">
          <dt className="shrink-0 text-on-surface-variant">Paid</dt>
          <dd className="flex w-full items-center justify-end gap-1.5">
            <div className="w-28">
              <CurrencyInput
                value={amountPaid}
                onChange={setAmountPaid}
                disabled={empty}
                ariaLabel="Amount paid"
              />
            </div>
            <button
              type="button"
              onClick={() => setAmountPaid(totals.total.toFixed(2))}
              disabled={empty}
              className="h-8 shrink-0 rounded-md px-2 text-body-sm font-medium text-info-fg transition-colors hover:bg-info-bg disabled:cursor-not-allowed disabled:opacity-50"
            >
              Exact
            </button>
          </dd>
        </div>

        {totals.due > 0 && (
          <div className="flex items-center justify-between">
            <dt className="text-on-surface-variant">Due</dt>
            <dd className="tabular-nums font-medium text-danger-fg">
              {formatCurrency(totals.due, currency)}
            </dd>
          </div>
        )}
      </dl>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-body-sm text-danger-fg"
        >
          {error}
        </p>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        disabled={disabled}
        loading={pending}
      >
        {!supplierSelected
          ? "Select a supplier first"
          : pending
            ? "Completing…"
            : "Complete Purchase"}
      </Button>
    </form>
  );
}

/* ========================================================================== */
/*  SuccessBanner                                                             */
/* ========================================================================== */

function SuccessBanner({
  purchaseId,
  viewHref,
  onDismiss,
}: {
  purchaseId: string;
  viewHref: string;
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed left-1/2 top-20 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2"
    >
      <div className="pointer-events-auto flex items-start gap-3 rounded-lg border border-success-border bg-success-bg px-4 py-3 shadow-overlay">
        <span className="mt-0.5 shrink-0 text-success-fg">
          <CheckCircle2 className="size-5" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-body-md font-medium text-success-fg">
            Purchase recorded
          </p>
          <p className="mt-0.5 truncate font-mono text-body-sm text-success-fg/80">
            #{purchaseId.slice(0, 8)}
          </p>
        </div>

        <Link
          href={viewHref}
          className="shrink-0 self-center text-body-sm font-medium text-success-fg underline-offset-2 hover:underline"
        >
          View
        </Link>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-mr-1 -mt-1 inline-flex size-6 shrink-0 items-center justify-center rounded text-success-fg/60 transition-colors hover:bg-success-fg/10 hover:text-success-fg"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  CreatePurchaseScreen                                                      */
/* ========================================================================== */

export function CreatePurchaseScreen({
  storeId,
  currency = "DZD",
  products,
  suppliers,
  createPurchaseAction,
  supplierNewHref,
  purchaseDetailBasePath,
}: CreatePurchaseScreenProps) {
  const [supplierId, setSupplierId] = useState("");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<PurchaseLine[]>([]);
  const [discountAmount, setDiscountAmount] = useState("");
  const [taxAmount, setTaxAmount] = useState("");
  const [shippingCost, setShippingCost] = useState("");
  const [otherCost, setOtherCost] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const cartDialogRef = useRef<HTMLDialogElement>(null);

  /* ---------- Filtered product list ---------- */

  const filteredProducts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.sku.toLowerCase().includes(needle),
    );
  }, [products, search]);

  const cartQuantityByProduct = useMemo(() => {
    const map = new Map<string, number>();
    for (const line of cart) map.set(line.productId, line.quantity);
    return map;
  }, [cart]);

  /* ---------- Totals ---------- */

  const totals: Totals = useMemo(() => {
    const subtotal = cart.reduce(
      (sum, l) => sum + l.unitCost * l.quantity,
      0,
    );
    const discountNum = Number.parseFloat(discountAmount) || 0;
    const discount = Math.min(Math.max(discountNum, 0), subtotal);
    const tax = Math.max(Number.parseFloat(taxAmount) || 0, 0);
    const shipping = Math.max(Number.parseFloat(shippingCost) || 0, 0);
    const other = Math.max(Number.parseFloat(otherCost) || 0, 0);

    const total = subtotal - discount + tax + shipping + other;
    const paid = Number.parseFloat(amountPaid) || 0;
    const due = Math.max(total - paid, 0);

    return { subtotal, discount, tax, shipping, other, total, due };
  }, [cart, discountAmount, taxAmount, shippingCost, otherCost, amountPaid]);

  /* ---------- Server Action binding ---------- */

  const [state, formAction, isPending] = useActionState<
    CreatePurchaseResult | null,
    FormData
  >(async () => {
    const input: CreatePurchaseInput = {
      storeId,
      supplierId,
      discountAmount: totals.discount,
      taxAmount: totals.tax,
      shippingCost: totals.shipping,
      otherCost: totals.other,
      amountPaid: Number.parseFloat(amountPaid) || 0,
    };

    const items: CreatePurchaseItemInput[] = cart.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
      unitCost: l.unitCost,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount: l.unitCost * l.quantity,
      lineSubtotal: l.unitCost * l.quantity,
    }));

    try {
      return await createPurchaseAction(storeId, input, items);
    } catch {
      return {
        ok: false,
        message: "Could not complete the purchase. Please try again.",
      };
    }
  }, null);

  /* ---------- Side effect: reset everything on success ---------- */

  useEffect(() => {
    const handler = () => {
      setBannerDismissed(false);

      if (state?.ok) {
        setCart([]);
        setSupplierId("");
        setDiscountAmount("");
        setTaxAmount("");
        setShippingCost("");
        setOtherCost("");
        setAmountPaid("");
      }
    }

    handler();
  }, [state]);

  /* ---------- Cart operations ---------- */

  const addToCart = (product: PurchaseProduct) => {
    setBannerDismissed(true);

    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        return prev.map((l) =>
          l.productId === product.id
            ? { ...l, quantity: l.quantity + 1 }
            : l,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          unit: product.unit,
          unitCost: product.averageCost,
          quantity: 1,
        },
      ];
    });
  };

  const setQuantity = (productId: string, quantity: number) => {
    setCart((prev) =>
      prev.map((l) =>
        l.productId === productId
          ? { ...l, quantity: Math.max(Math.floor(quantity), 1) }
          : l,
      ),
    );
  };

  const setUnitCost = (productId: string, unitCost: number) => {
    setCart((prev) =>
      prev.map((l) =>
        l.productId === productId
          ? { ...l, unitCost: Math.max(unitCost, 0) }
          : l,
      ),
    );
  };

  const removeLine = (productId: string) => {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountAmount("");
    setTaxAmount("");
    setShippingCost("");
    setOtherCost("");
    setAmountPaid("");
  };

  const itemCount = cart.reduce((sum, l) => sum + l.quantity, 0);
  const supplierSelected = supplierId !== "";

  /* ---------- Dialog ---------- */

  const openCart = () => cartDialogRef.current?.showModal();
  const closeCart = () => cartDialogRef.current?.close();

  /* ---------- Derived ---------- */

  const error = state && !state.ok ? state.message : null;

  const purchaseViewHref =
    state?.ok && purchaseDetailBasePath
      ? `${purchaseDetailBasePath}/${state.id}`
      : "";

  /* ---------- Render ---------- */

  return (
    <>
      {state?.ok && !bannerDismissed && purchaseDetailBasePath && (
        <SuccessBanner
          purchaseId={state.id}
          viewHref={purchaseViewHref}
          onDismiss={() => setBannerDismissed(true)}
        />
      )}

      <div className="-m-4 flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden sm:-m-6">
        <SupplierBar
          suppliers={suppliers}
          value={supplierId}
          onChange={setSupplierId}
          supplierNewHref={supplierNewHref}
        />

        {/* ─── Desktop: two columns ─── */}
        <div className="hidden min-h-0 flex-1 lg:grid lg:grid-cols-[1fr_400px]">
          <div className="flex min-h-0 flex-col">
            <div className="shrink-0 border-b border-outline-variant bg-surface-lowest p-4">
              <ProductSearchInput
                value={search}
                onChange={setSearch}
                autoFocus
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-surface-lowest scrollbar-thin">
              {filteredProducts.length === 0 ? (
                <EmptyState
                  size="sm"
                  title="No products found"
                  description="Try a different name or SKU."
                />
              ) : (
                <ul className="divide-y divide-outline-variant">
                  {filteredProducts.map((product) => (
                    <li key={product.id}>
                      <ProductRow
                        product={product}
                        inCartQuantity={
                          cartQuantityByProduct.get(product.id) ?? 0
                        }
                        onAdd={() => addToCart(product)}
                        currency={currency}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <aside className="flex min-h-0 flex-col border-l border-outline-variant bg-surface-lowest">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-outline-variant px-4 py-3">
              <div className="min-w-0">
                <h2 className="text-headline-sm text-on-surface">
                  Current Purchase
                </h2>
                <p className="truncate text-body-sm text-on-surface-variant">
                  <span className="tabular-nums">{itemCount}</span>{" "}
                  {itemCount === 1 ? "unit" : "units"}
                  {" · "}
                  <span className="tabular-nums">{cart.length}</span>{" "}
                  {cart.length === 1 ? "line" : "lines"}
                </p>
              </div>
              {cart.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearCart}
                  disabled={isPending}
                >
                  Clear
                </Button>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
              <CartItems
                cart={cart}
                onQtyChange={setQuantity}
                onCostChange={setUnitCost}
                onRemove={removeLine}
                currency={currency}
              />
            </div>

            <CartTotals
              cart={cart}
              supplierSelected={supplierSelected}
              totals={totals}
              currency={currency}
              discountAmount={discountAmount}
              setDiscountAmount={setDiscountAmount}
              taxAmount={taxAmount}
              setTaxAmount={setTaxAmount}
              shippingCost={shippingCost}
              setShippingCost={setShippingCost}
              otherCost={otherCost}
              setOtherCost={setOtherCost}
              amountPaid={amountPaid}
              setAmountPaid={setAmountPaid}
              formAction={formAction}
              pending={isPending}
              error={error}
            />
          </aside>
        </div>

        {/* ─── Mobile: single column + bottom bar ─── */}
        <div className="flex min-h-0 flex-1 flex-col lg:hidden">
          <div className="shrink-0 border-b border-outline-variant bg-surface-lowest p-3">
            <ProductSearchInput value={search} onChange={setSearch} />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-surface-lowest scrollbar-thin">
            {filteredProducts.length === 0 ? (
              <EmptyState
                size="sm"
                title="No products found"
                description="Try a different name or SKU."
              />
            ) : (
              <ul className="divide-y divide-outline-variant">
                {filteredProducts.map((product) => (
                  <li key={product.id}>
                    <ProductRow
                      product={product}
                      inCartQuantity={
                        cartQuantityByProduct.get(product.id) ?? 0
                      }
                      onAdd={() => addToCart(product)}
                      currency={currency}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {cart.length > 0 && (
            <div className="shrink-0 border-t border-outline-variant bg-surface-lowest p-3">
              <button
                type="button"
                onClick={openCart}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-md bg-primary-container px-4 py-3",
                  "text-on-primary transition-colors hover:bg-slate-700",
                )}
              >
                <span className="flex items-center gap-2">
                  <span className="inline-flex size-5 items-center justify-center rounded-full bg-white/15 text-label-sm tabular-nums">
                    {cart.length}
                  </span>
                  <span className="text-body-md font-medium">
                    View Purchase
                  </span>
                </span>
                <span className="text-body-lg font-semibold tabular-nums">
                  {formatCurrency(totals.total, currency)}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Mobile cart dialog ─── */}
      <dialog
        ref={cartDialogRef}
        onClick={(e) => {
          if (e.target === cartDialogRef.current) closeCart();
        }}
        className={cn(
          "fixed inset-0 z-50 m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-transparent p-0 lg:hidden",
          "backdrop:bg-slate-900/40 backdrop:backdrop-blur-[2px]",
        )}
      >
        <div className="flex h-full w-full flex-col bg-surface-lowest">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-outline-variant px-4">
            <div className="min-w-0">
              <h2 className="text-headline-sm text-on-surface">
                Current Purchase
              </h2>
              <p className="truncate text-body-sm text-on-surface-variant">
                {supplierSelected ? (
                  <>
                    From{" "}
                    <span className="text-on-surface">
                      {suppliers.find((s) => s.id === supplierId)?.name}
                    </span>
                    {" · "}
                  </>
                ) : (
                  <span className="text-warning-fg">
                    No supplier selected ·{" "}
                  </span>
                )}
                <span className="tabular-nums">{itemCount}</span>{" "}
                {itemCount === 1 ? "unit" : "units"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {cart.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearCart}
                  disabled={isPending}
                >
                  Clear
                </Button>
              )}
              <button
                type="button"
                onClick={closeCart}
                aria-label="Close"
                className="inline-flex size-9 items-center justify-center rounded-md text-on-surface-variant hover:bg-slate-100 hover:text-on-surface"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
            <CartItems
              cart={cart}
              onQtyChange={setQuantity}
              onCostChange={setUnitCost}
              onRemove={removeLine}
              currency={currency}
            />
          </div>

          <div className="shrink-0">
            <CartTotals
              cart={cart}
              supplierSelected={supplierSelected}
              totals={totals}
              currency={currency}
              discountAmount={discountAmount}
              setDiscountAmount={setDiscountAmount}
              taxAmount={taxAmount}
              setTaxAmount={setTaxAmount}
              shippingCost={shippingCost}
              setShippingCost={setShippingCost}
              otherCost={otherCost}
              setOtherCost={setOtherCost}
              amountPaid={amountPaid}
              setAmountPaid={setAmountPaid}
              formAction={formAction}
              pending={isPending}
              error={error}
            />
          </div>
        </div>
      </dialog>
    </>
  );
}