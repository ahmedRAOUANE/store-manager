/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type StoreRole = "OWNER" | "MANAGER" | "STAFF";

export type NavIconKey =
    | "dashboard"
    | "products"
    | "sales"
    | "purchases"
    | "suppliers"
    | "members"
    | "settings"
    | "users"
    | "profile"
    | "stores";

export type NavLabelNamespace = "navigation" | "admin";

export interface NavItem {
    key: string;
    labelKey: string;
    labelNamespace?: NavLabelNamespace;
    href: string;
    iconKey: NavIconKey;
    badge?: number;
}

/* -------------------------------------------------------------------------- */
/*  Store nav — role-scoped paths                                             */
/*                                                                            */
/*  The base path segment mirrors the role: /stores/{id}/owner, .../manager,  */
/*  .../staff. Each role's page tree lives under its own segment, so a user   */
/*  can only reach the routes they were granted — access control is enforced  */
/*  at the layout boundary, not by conditional UI.                            */
/* -------------------------------------------------------------------------- */

const ROLE_SEGMENT: Record<StoreRole, string> = {
    OWNER: "owner",
    MANAGER: "manager",
    STAFF: "staff",
};

export function buildStoreNavItems(
    storeId: string,
    role: StoreRole,
): NavItem[] {
    const base = `/stores/${storeId}/${ROLE_SEGMENT[role]}`;

    /* Everyone gets Dashboard and Sales. */
    const items: NavItem[] = [
        {
            key: "dashboard",
            labelKey: "dashboard",
            href: `${base}/dashboard`,
            iconKey: "dashboard",
        },
        {
            key: "sales",
            labelKey: "sales",
            href: `${base}/sales`,
            iconKey: "sales",
        },
    ];

    /* Management-only: everything between Sales and Settings. */
    if (role === "OWNER" || role === "MANAGER") {
        items.push(
            {
                key: "products",
                labelKey: "products",
                href: `${base}/products`,
                iconKey: "products",
            },
            {
                key: "purchases",
                labelKey: "purchases",
                href: `${base}/purchases`,
                iconKey: "purchases",
            },
            {
                key: "suppliers",
                labelKey: "suppliers",
                href: `${base}/suppliers`,
                iconKey: "suppliers",
            },
            {
                key: "members",
                labelKey: "members",
                href: `${base}/members`,
                iconKey: "members",
            },
        );
    }

    /* Settings for everyone — but each role sees a different page - keep for next versions */
    // items.push({
    //     key: "settings",
    //     labelKey: "settings",
    //     href: `${base}/settings`,
    //     iconKey: "settings",
    // });

    return items;
}

/* -------------------------------------------------------------------------- */
/*  Admin nav — unchanged                                                     */
/* -------------------------------------------------------------------------- */

export function buildAdminNavItems(adminId: string): NavItem[] {
    return [
        { key: "dashboard", labelKey: "dashboard", href: `/admin/${adminId}/dashboard`, iconKey: "dashboard", labelNamespace: "admin", },
        { key: "users", labelKey: "users", href: `/admin/${adminId}/users`, iconKey: "users", labelNamespace: "admin", },
        { key: "stores", labelKey: "storesTitle", href: `/admin/${adminId}/stores`, iconKey: "stores", labelNamespace: "admin", },
    ];
}

/* -------------------------------------------------------------------------- */
/*  User nav — unchanged                                                      */
/* -------------------------------------------------------------------------- */

export function buildUserNavItems(userId: string): NavItem[] {
    return [
        { key: "profile", labelKey: "profile", href: `/user/${userId}/profile`, iconKey: "profile" },
        { key: "stores", labelKey: "stores", href: `/user/${userId}/stores`, iconKey: "stores" },
        // { key: "memberships", labelKey: "memberships", href: `/user/${userId}/memberships`, iconKey: "users" },
        // { key: "settings", labelKey: "settings", href: `/user/${userId}/settings`, iconKey: "settings" },
    ];
}