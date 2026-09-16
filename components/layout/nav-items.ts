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

export interface NavItem {
    key: string;
    label: string;
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
            label: "Dashboard",
            href: `${base}/dashboard`,
            iconKey: "dashboard",
        },
        {
            key: "sales",
            label: "Sales",
            href: `${base}/sales`,
            iconKey: "sales",
        },
    ];

    /* Management-only: everything between Sales and Settings. */
    if (role === "OWNER" || role === "MANAGER") {
        items.push(
            {
                key: "products",
                label: "Products",
                href: `${base}/products`,
                iconKey: "products",
            },
            {
                key: "purchases",
                label: "Purchases",
                href: `${base}/purchases`,
                iconKey: "purchases",
            },
            {
                key: "suppliers",
                label: "Suppliers",
                href: `${base}/suppliers`,
                iconKey: "suppliers",
            },
            {
                key: "members",
                label: "Members",
                href: `${base}/members`,
                iconKey: "members",
            },
        );
    }

    /* Settings for everyone — but each role sees a different page - keep for next versions */
    // items.push({
    //     key: "settings",
    //     label: "Settings",
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
        { key: "dashboard", label: "Dashboard", href: `/admin/${adminId}/dashboard`, iconKey: "dashboard" },
        { key: "users", label: "Users", href: `/admin/${adminId}/users`, iconKey: "users" },
        { key: "stores", label: "Stores", href: `/admin/${adminId}/stores`, iconKey: "stores" },
    ];
}

/* -------------------------------------------------------------------------- */
/*  User nav — unchanged                                                      */
/* -------------------------------------------------------------------------- */

export function buildUserNavItems(userId: string): NavItem[] {
    return [
        { key: "profile", label: "Profile", href: `/user/${userId}/profile`, iconKey: "profile" },
        { key: "stores", label: "Stores", href: `/user/${userId}/stores`, iconKey: "stores" },
        // { key: "memberships", label: "Memberships", href: `/user/${userId}/memberships`, iconKey: "users" },
        // { key: "settings", label: "Settings", href: `/user/${userId}/settings`, iconKey: "settings" },
    ];
}