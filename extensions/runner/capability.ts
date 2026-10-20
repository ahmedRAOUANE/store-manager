import {
    ExtensionCapabilityError,
} from "./types";

export const CAPABILITY_NAMES = [
    "db.read",
    "db.write",
    "storage.read",
    "storage.write",
    "notifications.publish",
    "http.fetch",
    "logs.write",
] as const;

export type CapabilityName = typeof CAPABILITY_NAMES[number];

export function hasCapability(
    capabilities: Set<string>,
    name: CapabilityName,
): boolean {
    return capabilities.has(name);
}

export function assertCapability(
    extensionId: string,
    capabilities: Set<string>,
    name: CapabilityName,
): void {
    if (!capabilities.has(name)) {
        throw new ExtensionCapabilityError(extensionId, name);
    }
}