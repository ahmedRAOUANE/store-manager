import { vi } from "vitest";

// import "temporal-polyfill/full/global";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
    default: {
        products: {
            findMany: vi.fn(),
            upsert: vi.fn(),
            findUnique: vi.fn(),
        },
    },
}));