/* ========================================================================== */
/*  Roles                                                                     */
/* ========================================================================== */

export type RoleValue = "OWNER" | "MANAGER" | "STAFF";

export const ROLE_LABELS: Record<RoleValue, string> = {
    OWNER: "Owner",
    MANAGER: "Manager",
    STAFF: "Staff",
};

/**
 * Roles that can be assigned through the normal role dropdown.
 *
 * OWNER is intentionally excluded because ownership changes should use
 * a dedicated ownership-transfer flow.
 */
export const ASSIGNABLE_ROLES: RoleValue[] = ["STAFF", "MANAGER"];

/* ========================================================================== */
/*  Role hierarchy                                                            */
/* ========================================================================== */

export const ROLE_RANK: Record<RoleValue, number> = {
    STAFF: 1,
    MANAGER: 2,
    OWNER: 3,
};

/* ========================================================================== */
/*  Role permissions                                                          */
/* ========================================================================== */

/**
 * Returns the roles the current user is allowed to assign.
 *
 * OWNER:
 *   - STAFF
 *   - MANAGER
 *
 * MANAGER:
 *   - STAFF
 *   - MANAGER
 *
 * STAFF:
 *   - nothing
 *
 * OWNER is intentionally excluded from every list because ownership
 * transfer is handled separately.
 */
export const getAllowedRoles = (
    currentUserRole: RoleValue,
): RoleValue[] => {
    switch (currentUserRole) {
        case "OWNER":
            return ["STAFF", "MANAGER"];

        case "MANAGER":
            return ["STAFF", "MANAGER"];

        case "STAFF":
            return [];

        default:
            return [];
    }
};

/**
 * Returns a reason when the current user cannot modify the target member's
 * role, or null when the role can be changed.
 *
 * Current frontend-only rules:
 *
 * 1. A user cannot change their own role.
 * 2. STAFF cannot change anybody's role.
 * 3. OWNER cannot be modified through this dropdown.
 * 4. A user cannot promote someone to a role higher than their own.
 */
export function getRoleDisabledReason(
    currentUserId: string,
    currentUserRole: RoleValue,
    targetUserId: string,
    targetRole: RoleValue,
): string | null {
    // You cannot change your own role.
    if (targetUserId === currentUserId) {
        return "You can't change your own role.";
    }

    // Staff members cannot manage roles.
    if (currentUserRole === "STAFF") {
        return "Staff members can't change roles.";
    }

    // Owner's role is handled by the ownership-transfer flow.
    if (targetRole === "OWNER") {
        return "Ownership is transferred from a dedicated flow, not here.";
    }

    // A member cannot be promoted above the current user's role.
    if (ROLE_RANK[targetRole] > ROLE_RANK[currentUserRole]) {
        return "You can't promote a member above your own role.";
    }

    return null;
}