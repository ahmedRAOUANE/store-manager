"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { requestToCreateStore } from "@/actions/user.actions";

export default function CreateStoreForm() {
    const [message, setMessage] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    async function handleSubmit(formData: FormData) {
        setMessage(null);

        const storeData = {
            name: String(formData.get("name") ?? "").trim(),
            description: String(formData.get("description") ?? "").trim(),
            phone: String(formData.get("phone") ?? "").trim(),
            email: String(formData.get("email") ?? "").trim(),
            address: String(formData.get("address") ?? "").trim(),
            currency: String(formData.get("currency") ?? "USD"),
            timezone: String(formData.get("timezone") ?? "UTC"),
        };

        startTransition(async () => {
            const result = await requestToCreateStore(storeData);

            if (!result.ok) {
                setMessage(result.message);
                return;
            }

            setMessage(result.message);
        });
    }

    return (
        <form
            action={handleSubmit}
            className="mt-6 space-y-4"
        >
            <div>
                <label
                    htmlFor="store-name"
                    className="mb-1.5 block text-label-md"
                >
                    Store name
                </label>

                <input
                    id="store-name"
                    name="name"
                    type="text"
                    required
                    placeholder="e.g. Downtown Market"
                    className="h-10 w-full rounded-md border border-outline-variant bg-surface-lowest px-3 text-body-md outline-none focus:border-info"
                />
            </div>

            <div>
                <label
                    htmlFor="store-description"
                    className="mb-1.5 block text-label-md"
                >
                    Description
                </label>

                <textarea
                    id="store-description"
                    name="description"
                    rows={3}
                    placeholder="Tell people what this store is about."
                    className="w-full resize-none rounded-md border border-outline-variant bg-surface-lowest px-3 py-2 text-body-md outline-none focus:border-info"
                />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <input
                    name="phone"
                    type="tel"
                    placeholder="Phone"
                    className="h-10 rounded-md border border-outline-variant bg-surface-lowest px-3 text-body-md outline-none focus:border-info"
                />

                <input
                    name="email"
                    type="email"
                    placeholder="Email"
                    className="h-10 rounded-md border border-outline-variant bg-surface-lowest px-3 text-body-md outline-none focus:border-info"
                />
            </div>

            <input
                name="address"
                type="text"
                placeholder="Address"
                className="h-10 w-full rounded-md border border-outline-variant bg-surface-lowest px-3 text-body-md outline-none focus:border-info"
            />

            <div className="grid gap-4 sm:grid-cols-2">
                <select
                    name="currency"
                    defaultValue="USD"
                    className="h-10 rounded-md border border-outline-variant bg-surface-lowest px-3 text-body-md outline-none focus:border-info"
                >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="DZD">DZD</option>
                </select>

                <select
                    name="timezone"
                    defaultValue="UTC"
                    className="h-10 rounded-md border border-outline-variant bg-surface-lowest px-3 text-body-md outline-none focus:border-info"
                >
                    <option value="UTC">UTC</option>
                    <option value="Africa/Algiers">Africa/Algiers</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="Europe/Paris">Europe/Paris</option>
                </select>
            </div>

            {message && (
                <p className="rounded-md border border-info-border bg-info-bg px-3 py-2 text-body-sm text-info-fg">
                    {message}
                </p>
            )}

            <div className="flex gap-2">
                <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex h-10 flex-1 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-60"
                >
                    {isPending ? "Creating..." : "Create store"}
                </button>

                <button
                    type="button"
                    disabled={isPending}
                    className="inline-flex h-10 items-center gap-2 rounded-md border border-outline-variant px-4 text-sm font-medium disabled:opacity-60"
                >
                    <X className="size-4" />
                    Cancel
                </button>
            </div>
        </form>
    );
}
