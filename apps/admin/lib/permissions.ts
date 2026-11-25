/**
 * Admin permissions - the catalogue and the checks. Plain module (no "use client" / "server-only"): the server layout,
 * server actions and client components all read the same rules.
 *
 * A SUPER_ADMIN holds every permission. A TEAM_MEMBER holds exactly what is stored on their access row - an empty set
 * is valid and means "nothing" (falling back to defaults would be an over-grant).
 */
export type AdminRole = "SUPER_ADMIN" | "TEAM_MEMBER"

export type AdminPermission =
    | "users"
    | "analytics"
    | "communications"
    | "admin_management"
    | "system"
    | "jawaf"

export type PermissionLevel = "read" | "write" | "delete" | "full"

export type AdminPermissions = Partial<Record<string, PermissionLevel[] | string[]>>

export const PERMISSION_LEVELS: PermissionLevel[] = ["read", "write", "delete", "full"]

/**
 * The access matrix's rows. `levels`: the levels that mean something for this module (the matrix shows "-" for the
 * rest); omitted = all four.
 */
export const ADMIN_MODULES: { id: AdminPermission; label: string; description: string; levels?: PermissionLevel[] }[] = [
    { id: "users", label: "Users", description: "Look up and manage user accounts" },
    { id: "analytics", label: "Analytics and reports", description: "Sign-up trends, activity and financial reports" },
    { id: "communications", label: "Communications", description: "Announcements and email broadcasts" },
    { id: "admin_management", label: "Team", description: "Invite admins, set access, read the audit log" },
    { id: "system", label: "System", description: "Platform settings and notifications" },
    { id: "jawaf", label: "Jawaf", description: "Demo bots, claims and every bot's numbers", levels: ["read", "write"] },
]

export const defaultPermissionsByRole: Record<AdminRole, AdminPermissions> = {
    SUPER_ADMIN: {
        users: ["read", "write", "delete", "full"],
        analytics: ["read", "write", "full"],
        communications: ["read", "write", "delete", "full"],
        admin_management: ["read", "write", "delete", "full"],
        system: ["read", "write", "full"],
        jawaf: ["read", "write", "full"],
    },
    TEAM_MEMBER: {},
}

export function hasPermission(permissions: AdminPermissions, module: AdminPermission, level: PermissionLevel): boolean {
    const granted = permissions[module]
    if (!granted) return false
    return granted.includes(level) || granted.includes("full")
}

/** The one check every screen and action uses: SUPER_ADMIN passes, everyone else needs the stored grant. */
export function adminCan(
    admin: { role: string; permissions: AdminPermissions } | null | undefined,
    module: AdminPermission,
    level: PermissionLevel = "read",
): boolean {
    if (!admin) return false
    if (admin.role === "SUPER_ADMIN") return true
    return hasPermission(admin.permissions, module, level)
}

export function formatAdminRole(role: string): string {
    switch (role) {
        case "SUPER_ADMIN": return "Super admin"
        case "TEAM_MEMBER": return "Team member"
        default: return role.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())
    }
}
