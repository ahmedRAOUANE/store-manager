import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
    plugins: [react(), tsconfigPaths()],
    test: {
        environment: "node",
        globals: true,
        setupFiles: ["./tests/setup.ts"],
        tags: [
            {name: "get"},
            {name: "create"},
            {name: "update"},
            {name: "delete"},
            {name: "search"},

            {name: "all"},
            
            {name: "user"},
            {name: "users"},
            { name: "store"},
            { name: "stores"},
            { name: "product"},
            { name: "products"},
            { name: "supplier"},
            { name: "suppliers"},
            { name: "purchase"},
            { name: "purchases"},
            { name: "purchaseItem"},
            { name: "purchaseItems"},
            { name: "membership"},
            { name: "memberships"},
            { name: "sale"},
            { name: "sales"},
            { name: "membershipRequest"},
            { name: "membershipRequests"},
            { name: "admin"},

        ]
    }
});