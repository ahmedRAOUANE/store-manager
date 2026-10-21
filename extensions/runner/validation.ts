import type { Manifest } from "./manifest";
import {
    HOOK_NAMES,
    type ExtensionExportedDefault,
    type ExtensionNotificationDefinition,
    type HookName,
} from "./types";

/**
 * The library version the runner currently provides. When Phase B ships
 * the actual library, this constant will be replaced by the library's
 * version at build time. For Phase A, everything is "1.0.0".
 */
export const RUNNER_LIBRARY_VERSION = "1.0.0";

/**
 * Check whether `version` satisfies the semver `range`.
 *
 * Supported forms (matching the manifest schema's `SemverRangeSchema`):
 *   - "^X.Y.Z"  →  >=X.Y.Z  <(X+1).0.0   (major-compatible)
 *   - "~X.Y.Z"  →  >=X.Y.Z  <X.(Y+1).0   (minor-compatible)
 *   - "X.Y.Z"   →  exact match
 *
 * Edge case: the `^0.x.y` family (where semver says "compatible with
 * minor" not "compatible with major") is not handled. Not relevant at
 * 1.x. Revisit if the runner ever ships a 0.x pre-release.
 */
export function versionSatisfies(version: string, range: string): boolean {
    const parse = (s: string) => s.split(".").map(Number);
    const [vMaj, vMin, vPat] = parse(version);

    if (range.startsWith("^")) {
        const [rMaj, rMin, rPat] = parse(range.slice(1));
        if (vMaj !== rMaj) return false;
        return vMin > rMin || (vMin === rMin && vPat >= rPat);
    }

    if (range.startsWith("~")) {
        const [rMaj, rMin, rPat] = parse(range.slice(1));
        if (vMaj !== rMaj || vMin !== rMin) return false;
        return vPat >= rPat;
    }

    const [rMaj, rMin, rPat] = parse(range);
    return vMaj === rMaj && vMin === rMin && vPat === rPat;
}

/**
 * Derive the capability Set from a validated manifest.
 *
 * Boolean capabilities become present/absent entries; array capabilities
 * (notifications.publish, http.fetch) are present iff the array is
 * non-empty. The specific allowed notification events and domains are
 * validated at the point of use (publish, fetch), not here.
 */
export function buildCapabilitySet(manifest: Manifest): Set<string> {
    const set = new Set<string>();
    if (manifest.capabilities["db.read"]) set.add("db.read");
    if (manifest.capabilities["db.write"]) set.add("db.write");
    if (manifest.capabilities["storage.read"]) set.add("storage.read");
    if (manifest.capabilities["storage.write"]) set.add("storage.write");
    if (manifest.capabilities["logs.write"]) set.add("logs.write");
    if (manifest.capabilities["notifications.publish"].length > 0) {
        set.add("notifications.publish");
    }
    if (manifest.capabilities["http.fetch"].length > 0) {
        set.add("http.fetch");
    }
    return set;
}

/**
 * Structural validation of the object exported as `default` from an
 * extension's `index.js`. Does not validate that the extension is
 * "correct" — only that its shape is what the runner expects.
 *
 * The `payloadSchema` check duck-types on `.safeParse` because Zod
 * schemas can't be structurally validated without running them. Any
 * `.safeParse`-having object is accepted; the runner calls `.parse()`
 * at publish time and the error propagates from there if the schema is
 * broken.
 */
export function isExtensionExportedDefault(
    value: unknown,
): value is ExtensionExportedDefault {
    if (typeof value !== "object" || value === null) return false;
    const obj = value as Record<string, unknown>;

    if (typeof obj.notifications !== "object" || obj.notifications === null) {
        return false;
    }
    if (typeof obj.hooks !== "object" || obj.hooks === null) {
        return false;
    }

    for (const def of Object.values(
        obj.notifications as Record<string, unknown>,
    )) {
        if (!isExtensionNotificationDefinition(def)) return false;
    }

    for (const [hook, fn] of Object.entries(
        obj.hooks as Record<string, unknown>,
    )) {
        if (!HOOK_NAMES.includes(hook as HookName)) return false;
        if (typeof fn !== "function") return false;
    }

    return true;
}

function isExtensionNotificationDefinition(
    value: unknown,
): value is ExtensionNotificationDefinition {
    if (typeof value !== "object" || value === null) return false;
    const o = value as Record<string, unknown>;

    if (
        typeof o.payloadSchema !== "object" ||
        o.payloadSchema === null ||
        typeof (o.payloadSchema as { safeParse?: unknown }).safeParse !==
        "function"
    ) {
        return false;
    }

    if (typeof o.presentation !== "object" || o.presentation === null) {
        return false;
    }
    const p = o.presentation as Record<string, unknown>;
    if (typeof p.titleKey !== "string" || typeof p.bodyKey !== "string") {
        return false;
    }

    if (typeof o.recipients !== "object" || o.recipients === null) {
        return false;
    }
    const r = o.recipients as Record<string, unknown>;
    if (r.scope !== "store" && r.scope !== "user") return false;
    if (r.roles !== undefined) {
        if (!Array.isArray(r.roles)) return false;
        for (const role of r.roles) {
            if (
                role !== "OWNER" &&
                role !== "MANAGER" &&
                role !== "STAFF"
            ) {
                return false;
            }
        }
    }
    if (r.excludeActor !== undefined && typeof r.excludeActor !== "boolean") {
        return false;
    }

    return true;
}