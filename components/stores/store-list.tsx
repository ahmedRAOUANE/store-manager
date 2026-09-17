"use client";

import { requestToJoinAStore } from "@/actions/user.actions";
import { AppError } from "@/errors/base.error";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import StoreSection from "./store-sections";

export type UserStore = {
    id: string;
    name: string;
    description: string | null;
    address: string | null;
    membershipStatus:
    | "PENDING"
    | "ACTIVE"
    | "REJECTED"
    | "INVALIDATED"
    | null;
    role: "OWNER" | "MANAGER" | "STAFF" | null;
};

type StoreListProps = {
    stores: UserStore[];
};

export default function StoreList({ stores }: StoreListProps) {
    const router = useRouter();

    const [isPending, startTransition] = useTransition();
    const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleRequest = (storeId: string) => {
        setSelectedStoreId(storeId);
        setMessage(null);
        setError(null);

        startTransition(async () => {
            const result = await requestToJoinAStore(storeId);

            if (result instanceof AppError) {
                setError(result.message);
                setSelectedStoreId(null);
                return;
            }

            setMessage("Membership request sent successfully.");
            setSelectedStoreId(null);

            router.refresh();
        });
    };

    const yourStores = stores.filter(
        (store) => store.membershipStatus === "ACTIVE"
    );

    const pendingStores = stores.filter(
        (store) => store.membershipStatus === "PENDING"
    );

    const discoverStores = stores.filter(
        (store) =>
            store.membershipStatus === null ||
            store.membershipStatus === "REJECTED" ||
            store.membershipStatus === "INVALIDATED"
    );

    return (
        <div className="space-y-10">
            {message && (
                <div className="rounded-lg border p-4">
                    {message}
                </div>
            )}

            {error && (
                <div className="rounded-lg border p-4">
                    {error}
                </div>
            )}

            <StoreSection
                title="Your stores"
                stores={yourStores}
            />

            <StoreSection
                title="Pending requests"
                stores={pendingStores}
            />

            <StoreSection
                title="Discover more"
                stores={discoverStores}
                onRequest={handleRequest}
                isPending={isPending}
                selectedStoreId={selectedStoreId}
            />
        </div>
    );
}