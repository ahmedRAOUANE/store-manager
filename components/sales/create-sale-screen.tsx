"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/UI/btn";
import { Input } from "@/components/UI/form";
import { EmptyState } from "@/components/UI/state";
import { formatCurrency } from "@/utils/format";
import { cn } from "@/utils/jsx-classes";
import { GetForSaleProducts } from "@/zod/product.schema";
import { createSale } from "@/actions/sales.actions";
import { Minus, Plus, Search, ShoppingCart, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";

/* ========================================================================== */
/*  Types                                                                     */
/* ========================================================================== */

export interface SaleProduct {
    id: string;
    name: string;
    sku: string;
    unit: string;
    sellingPrice: number;
    stockQuantity: number;
    isActive: boolean;
}

interface CartLine {
    productId: string;
    name: string;
    unit: string;
    unitPrice: number;
    quantity: number;
    availableStock: number;
}

export interface CreateSaleScreenProps {
    storeId: string;
    currency?: string;
    /** Fractional tax rate, e.g. 0.1 for 10%. */
    taxRate?: number;
    products: GetForSaleProducts[];
    createSaleAction: typeof createSale;
}

type CreateSaleResult =
    | {
        ok: true;
        sale: {
            id: string;
            invoiceNumber: string;
            totalAmount: number;
            amountPaid: number;
            amountDue: number;
        };
        message?: string
    }
    | { ok: false; message: string; };

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
    const t = useTranslations("sales");

    return (
        <div className="relative">
            <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-s-3 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant"
            >
                <Search />
            </span>
            <input
                type="search"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={t("searchProducts")}
                autoFocus={autoFocus}
                autoComplete="off"
                spellCheck={false}
                className={cn(
                    "h-10 w-full rounded-md border border-outline-variant bg-surface-lowest ps-9 pe-3",
                    "text-body-md text-on-surface placeholder:text-outline",
                    "focus:border-info focus:outline-none focus:ring-1 focus:ring-info",
                )}
            />
            {value && (
                <button
                    type="button"
                    onClick={() => onChange("")}
                    aria-label={t("clearSearch")}
                    className="absolute inset-e-2 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded text-on-surface-variant hover:bg-slate-100 hover:text-on-surface"
                >
                    <span className="size-3.5" aria-hidden="true">
                        <X />
                    </span>
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
    product: SaleProduct;
    inCartQuantity: number;
    onAdd: () => void;
    currency: string;
}) {
    const t = useTranslations("sales");

    const out = product.stockQuantity <= 0;
    const maxed = inCartQuantity >= product.stockQuantity;
    const disabled = out || maxed;

    return (
        <button
            type="button"
            onClick={onAdd}
            disabled={disabled}
            className={cn(
                "flex w-full items-center justify-between gap-3 px-4 py-3 text-start",
                "transition-colors",
                disabled
                    ? "cursor-not-allowed opacity-55"
                    : "hover:bg-slate-50 active:bg-slate-100",
            )}
        >
            <div className="min-w-0 flex-1">
                <p className="truncate text-body-md font-medium text-on-surface">
                    {product.name}
                </p>
                <p className="mt-0.5 truncate font-mono text-body-sm text-on-surface-variant">
                    {product.sku}
                </p>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-0.5">
                <span className="text-body-md font-medium tabular-nums text-on-surface">
                    {formatCurrency(product.sellingPrice, currency)}
                </span>
                <span
                    className={cn(
                        "text-body-sm tabular-nums",
                        out
                            ? "font-medium text-danger-fg"
                            : product.stockQuantity <= 5
                                ? "font-medium text-warning-fg"
                                : "text-on-surface-variant",
                    )}
                >
                    {out ? t("outOfStock") : `${product.stockQuantity} ${product.unit}`}
                </span>
            </div>

            {inCartQuantity > 0 && (
                <span className="ms-1 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-info text-label-sm text-on-primary tabular-nums">
                    {inCartQuantity}
                </span>
            )}
        </button>
    );
}

/* ========================================================================== */
/*  CartLineRow                                                               */
/* ========================================================================== */

function CartLineRow({
    line,
    onQtyChange,
    onRemove,
    currency,
}: {
    line: CartLine;
    onQtyChange: (q: number) => void;
    onRemove: () => void;
    currency: string;
}) {
    const t = useTranslations("sales");

    const lineTotal = line.unitPrice * line.quantity;
    const atMax = line.quantity >= line.availableStock;

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
                    <p className="mt-0.5 text-body-sm text-on-surface-variant">
                        {formatCurrency(line.unitPrice, currency)} / {line.unit}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onRemove}
                    aria-label={t("removeItem", { name: line.name })}
                    className="inline-flex size-7 shrink-0 items-center justify-center rounded text-on-surface-variant hover:bg-slate-100 hover:text-danger-fg"
                >
                    <span className="size-4" aria-hidden="true">
                        <Trash2 />
                    </span>
                </button>
            </div>

            <div className="mt-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => onQtyChange(line.quantity - 1)}
                        disabled={line.quantity <= 1}
                        aria-label={t("decreaseQuantity")}
                        className={stepperBtn}
                    >
                        <span className="size-3.5" aria-hidden="true">
                            <Minus />
                        </span>
                    </button>

                    <input
                        type="number"
                        value={line.quantity}
                        onChange={(e) => {
                            const next = Number.parseInt(e.target.value, 10);
                            if (Number.isFinite(next)) onQtyChange(next);
                        }}
                        min={1}
                        max={line.availableStock}
                        aria-label={t("quantityFor", { name: line.name })}
                        className="h-8 w-14 rounded-md border border-outline-variant bg-surface-lowest text-center text-body-md tabular-nums text-on-surface focus:border-info focus:outline-none focus:ring-1 focus:ring-info"
                    />

                    <button
                        type="button"
                        onClick={() => onQtyChange(line.quantity + 1)}
                        disabled={atMax}
                        aria-label={t("increaseQuantity")}
                        className={stepperBtn}
                    >
                        <span className="size-3.5" aria-hidden="true">
                            <Plus />
                        </span>
                    </button>

                    {atMax && (
                        <span className="ms-1 text-body-sm text-warning-fg">
                            {t("max")}
                        </span>
                    )}
                </div>

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
    onRemove,
    currency,
}: {
    cart: CartLine[];
    onQtyChange: (productId: string, q: number) => void;
    onRemove: (productId: string) => void;
    currency: string;
}) {
    const t = useTranslations("sales");

    if (cart.length === 0) {
        return (
            <EmptyState
                size="sm"
                icon={<ShoppingCart />}
                title={t("cartEmpty")}
                description={t("cartEmptyDescription")}
            />
        );
    }

    return (
        <ul className="divide-y divide-outline-variant">
            {cart.map((line) => (
                <CartLineRow
                    key={line.productId}
                    line={line}
                    currency={currency}
                    onQtyChange={(q) => onQtyChange(line.productId, q)}
                    onRemove={() => onRemove(line.productId)}
                />
            ))}
        </ul>
    );
}

/* ========================================================================== */
/*  CartFooter — now a <form> bound to the Server Action                      */
/* ========================================================================== */

interface Totals {
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    due: number;
    change: number;
}

function CartFooter({
    cart,
    totals,
    discountAmount,
    setDiscountAmount,
    amountPaid,
    setAmountPaid,
    currency,
    formAction,
    pending,
    error,
}: {
    cart: CartLine[];
    totals: Totals;
    discountAmount: string;
    setDiscountAmount: (v: string) => void;
    amountPaid: string;
    setAmountPaid: (v: string) => void;
    currency: string;
    formAction: (formData: FormData) => void;
    pending: boolean;
    error: string | null;
}) {
    const t = useTranslations("sales");
    const empty = cart.length === 0;
    const disabled = empty || pending;

    return (
        <form
            action={formAction}
            className="space-y-3 border-t border-outline-variant p-4"
        >
            <dl className="space-y-1.5 text-body-md">
                <div className="flex items-center justify-between">
                    <dt className="text-on-surface-variant">
                        {t("subtotal")}
                    </dt>
                    <dd className="tabular-nums text-on-surface">
                        {formatCurrency(totals.subtotal, currency)}
                    </dd>
                </div>

                {/* Discount — editable */}
                <div className="flex items-center justify-between gap-3">
                    <dt className="shrink-0 text-on-surface-variant">
                        {t("discount")}
                    </dt>
                    <dd className="w-28">
                        <Input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            value={discountAmount}
                            onChange={(e) => setDiscountAmount(e.target.value)}
                            placeholder="0.00"
                            disabled={empty}
                            aria-label={t("discountAmount")}
                            className="h-8 text-end tabular-nums"
                            leadingIcon={
                                <span className="text-body-sm text-on-surface-variant">$</span>
                            }
                        />
                    </dd>
                </div>

                {totals.tax > 0 && (
                    <div className="flex items-center justify-between">
                        <dt className="text-on-surface-variant">
                            {t("tax")}
                        </dt>
                        <dd className="tabular-nums text-on-surface">
                            {formatCurrency(totals.tax, currency)}
                        </dd>
                    </div>
                )}

                <div className="flex items-center justify-between border-t border-outline-variant pt-2">
                    <dt className="text-title-md text-on-surface">
                        {t("total")}
                    </dt>
                    <dd className="text-title-md tabular-nums text-on-surface">
                        {formatCurrency(totals.total, currency)}
                    </dd>
                </div>

                {/* Amount paid — editable with an "exact" shortcut */}
                <div className="flex items-center justify-between gap-3 pt-1.5">
                    <dt className="shrink-0 text-on-surface-variant">
                        {t("paid")}
                    </dt>
                    <dd className="flex w-full items-center justify-end gap-1.5">
                        <Input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            value={amountPaid}
                            onChange={(e) => setAmountPaid(e.target.value)}
                            placeholder="0.00"
                            disabled={empty}
                            aria-label={t("amountPaid")}
                            className="h-8 text-end tabular-nums"
                            leadingIcon={
                                <span className="text-body-sm text-on-surface-variant">$</span>
                            }
                        />
                        <button
                            type="button"
                            onClick={() => setAmountPaid(totals.total.toFixed(2))}
                            disabled={empty}
                            className="h-8 shrink-0 rounded-md px-2 text-body-sm font-medium text-info-fg transition-colors hover:bg-info-bg disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {t("exact")}
                        </button>
                    </dd>
                </div>

                {totals.change > 0 && (
                    <div className="flex items-center justify-between">
                        <dt className="text-on-surface-variant">
                            {t("change")}
                        </dt>
                        <dd className="tabular-nums font-medium text-success-fg">
                            {formatCurrency(totals.change, currency)}
                        </dd>
                    </div>
                )}

                {totals.due > 0 && (
                    <div className="flex items-center justify-between">
                        <dt className="text-on-surface-variant">
                            {t("due")}
                        </dt>
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
                {pending ? t("completing") : t("completeSale")}
            </Button>
        </form>
    );
}

/* ========================================================================== */
/*  CreateSaleScreen                                                          */
/* ========================================================================== */

export function CreateSaleScreen({
    storeId,
    currency = "DZD",
    taxRate = 0,
    products,
    createSaleAction,
}: CreateSaleScreenProps) {
    const t = useTranslations("sales");

    const [search, setSearch] = useState("");
    const [cart, setCart] = useState<CartLine[]>([]);
    const [discountAmount, setDiscountAmount] = useState("");
    const [amountPaid, setAmountPaid] = useState("");
    const cartDialogRef = useRef<HTMLDialogElement>(null);

    /* ---------- Derived: filtered product list ---------- */

    const filteredProducts = useMemo(() => {
        const needle = search.trim().toLowerCase();
        const active = products.filter((p) => p.isActive);
        if (!needle) return active;

        return active.filter(
            (p) =>
                p.name.toLowerCase().includes(needle) ||
                p.sku.toLowerCase().includes(needle),
        );
    }, [products, search]);

    /* ---------- Derived: cart lookup for product row badges ---------- */

    const cartQuantityByProduct = useMemo(() => {
        const map = new Map<string, number>();
        for (const line of cart) map.set(line.productId, line.quantity);
        return map;
    }, [cart]);

    /* ---------- Derived: totals ---------- */

    const totals: Totals = useMemo(() => {
        const subtotal = cart.reduce(
            (sum, l) => sum + l.unitPrice * l.quantity,
            0,
        );
        const discountNum = Number.parseFloat(discountAmount) || 0;
        const discount = Math.min(Math.max(discountNum, 0), subtotal);
        const taxableBase = subtotal - discount;
        const tax = taxableBase * taxRate;
        const total = taxableBase + tax;
        const paid = Number.parseFloat(amountPaid) || 0;
        const due = Math.max(total - paid, 0);
        const change = Math.max(paid - total, 0);

        return { subtotal, discount, tax, total, due, change };
    }, [cart, discountAmount, amountPaid, taxRate]);

    /* ---------- Server Action binding ---------- */

    const [state, formAction, isPending] = useActionState<
        CreateSaleResult | null,
        FormData
    >(async () => {
        const items = cart.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discountAmount: 0,
            taxAmount: 0,
        }));

        try {
            return await createSaleAction(storeId, {
                discountAmount: totals.discount,
                taxAmount: totals.tax,
                amountPaid: Number.parseFloat(amountPaid) || 0,
                items,
            });
        } catch {
            return {
                ok: false,
                message: t("saveError"),
            };
        }
    }, null);

    /* ---------- Side effect: clear the cart on successful sale ---------- */

    useEffect(() => {
        const handler = () => {
            if (state?.ok) {
                setCart([]);
                setDiscountAmount("");
                setAmountPaid("");
            }
        }

        handler();
    }, [state]);

    /* ---------- Derived: message for the form footer ---------- */

    const error = state && !state.ok ? state.message : null;

    /* ---------- Cart operations ---------- */

    const addToCart = (product: SaleProduct) => {
        if (product.stockQuantity <= 0) return;
        setCart((prev) => {
            const existing = prev.find((l) => l.productId === product.id);
            if (existing) {
                if (existing.quantity >= product.stockQuantity) return prev;
                return prev.map((l) =>
                    l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l,
                );
            }
            return [
                ...prev,
                {
                    productId: product.id,
                    name: product.name,
                    unit: product.unit,
                    unitPrice: product.sellingPrice,
                    quantity: 1,
                    availableStock: product.stockQuantity,
                },
            ];
        });
    };

    const setQuantity = (productId: string, quantity: number) => {
        setCart((prev) =>
            prev.map((l) =>
                l.productId === productId
                    ? {
                        ...l,
                        quantity: Math.min(
                            Math.max(Math.floor(quantity), 1),
                            l.availableStock,
                        ),
                    }
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
        setAmountPaid("");
    };

    const itemCount = cart.reduce((sum, l) => sum + l.quantity, 0);

    /* ---------- Dialog controls ---------- */

    const openCart = () => cartDialogRef.current?.showModal();
    const closeCart = () => cartDialogRef.current?.close();

    /* ---------- Render ---------- */

    return (
        <>
            <div className="-m-4 h-[calc(100dvh-3.5rem)] overflow-hidden sm:-m-6">
                {/* ─── Desktop: two columns ─── */}
                <div className="hidden h-full lg:grid lg:grid-cols-[1fr_400px]">
                    {/* Left — product search + results */}
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
                                    title={t("noProductsFound")}
                                    description={t("tryDifferentSearch")}
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

                    {/* Right — cart */}
                    <aside className="flex min-h-0 flex-col border-s border-outline-variant bg-surface-lowest">
                        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-outline-variant px-4 py-3">
                            <div>
                                <h2 className="text-headline-sm text-on-surface">
                                    {t("currentSale")}
                                </h2>
                                <p className="text-body-sm text-on-surface-variant">
                                    {t("itemCount", { count: itemCount })}
                                </p>
                            </div>
                            {cart.length > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearCart}
                                    disabled={isPending}
                                >
                                    {t("clear")}
                                </Button>
                            )}
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
                            <CartItems
                                cart={cart}
                                onQtyChange={setQuantity}
                                onRemove={removeLine}
                                currency={currency}
                            />
                        </div>

                        <CartFooter
                            cart={cart}
                            totals={totals}
                            discountAmount={discountAmount}
                            setDiscountAmount={setDiscountAmount}
                            amountPaid={amountPaid}
                            setAmountPaid={setAmountPaid}
                            currency={currency}
                            formAction={formAction}
                            pending={isPending}
                            error={error}
                        />
                    </aside>
                </div>

                {/* ─── Mobile: single column + bottom bar ─── */}
                <div className="flex h-full flex-col lg:hidden">
                    <div className="shrink-0 border-b border-outline-variant bg-surface-lowest p-3">
                        <ProductSearchInput value={search} onChange={setSearch} />
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto bg-surface-lowest scrollbar-thin">
                        {filteredProducts.length === 0 ? (
                            <EmptyState
                                size="sm"
                                title={t("noProductsFound")}
                                description={t("tryDifferentSearch")}
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
                                        {itemCount}
                                    </span>
                                    <span className="text-body-md font-medium">
                                        {t("viewCart")}
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
                        <div>
                            <h2 className="text-headline-sm text-on-surface">
                                {t("currentSale")}
                            </h2>
                            <p className="text-body-sm text-on-surface-variant">
                                {t("itemCount", { count: itemCount })}
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
                                    {t("clear")}
                                </Button>
                            )}
                            <button
                                type="button"
                                onClick={closeCart}
                                aria-label={t("closeCart")}
                                className="inline-flex size-9 items-center justify-center rounded-md text-on-surface-variant hover:bg-slate-100 hover:text-on-surface"
                            >
                                <span className="size-5" aria-hidden="true">
                                    <X />
                                </span>
                            </button>
                        </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
                        <CartItems
                            cart={cart}
                            onQtyChange={setQuantity}
                            onRemove={removeLine}
                            currency={currency}
                        />
                    </div>

                    <div className="shrink-0">
                        <CartFooter
                            cart={cart}
                            totals={totals}
                            discountAmount={discountAmount}
                            setDiscountAmount={setDiscountAmount}
                            amountPaid={amountPaid}
                            setAmountPaid={setAmountPaid}
                            currency={currency}
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