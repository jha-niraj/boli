/**
 * Shapes the admin console's actions return and its screens render. Server actions import these as types only, so
 * nothing here pulls the database schema into a browser bundle.
 */
import type { AdminPermissions, AdminRole } from "@/lib/permissions"

export type { AdminRole }

export type AdminStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED"

export const ADMIN_STATUSES: AdminStatus[] = ["ACTIVE", "INACTIVE", "SUSPENDED"]

export function formatAdminStatus(status: string): string {
    switch (status) {
        case "ACTIVE": return "Active"
        case "INACTIVE": return "Inactive"
        case "SUSPENDED": return "Suspended"
        default: return status.charAt(0) + status.slice(1).toLowerCase()
    }
}

/** One row of the team list (getAdminUsers). */
export interface AdminUser {
    id: string
    userId: string
    /** Alias for adminRole */
    role: AdminRole
    adminRole: AdminRole
    status: AdminStatus
    permissions: AdminPermissions
    name: string | null
    email: string
    image: string | null
    lastLoginAt: Date | null
    loginCount: number
    createdAt: Date
    updatedAt: Date
    user: { id: string; name: string; email: string; image: string | null } | null
}

/** A pending invitation (getPendingInvitations). */
export interface AdminInvitationRow {
    id: string
    email: string
    name: string | null
    code: string
    adminRole: AdminRole
    status: string
    permissions: AdminPermissions
    expiresAt: Date
    createdAt: Date
}

// ─── Users ───────────────────────────────────────────────────────────────────

export type UserRole = "USER" | "ADMIN"

export interface UserRow {
    id: string
    name: string
    email: string
    image: string | null
    role: UserRole
    isActive: boolean
    emailVerified: boolean
    createdAt: Date
}

export interface UserDetail extends UserRow {
    bio: string | null
    updatedAt: Date
    adminAccess: { adminRole: AdminRole; status: AdminStatus } | null
}

export interface UserListPage {
    items: UserRow[]
    total: number
    pages: number
}

/**
 * The toolbar's filter chips, resolved to the values each field allows. Omitted = no filter on that field; an EMPTY
 * array = nothing allowed (an "is" and an "is not" on the same value).
 */
export interface UserFilters {
    roles?: UserRole[]
    active?: boolean[]
    verified?: boolean[]
}

/** Headline counts: all time, and new in the last 30 days. */
export interface UserStats {
    total: number
    active: number
    inactive: number
    verified: number
    newLast30: number
}

/** Boli platform: one user's API keys (read-only for admins, plus revoke) and usage totals. Dates are ISO strings. */
export interface AdminUserApiKey {
    id: string
    name: string
    prefix: string
    createdAt: string
    lastUsedAt: string | null
    revokedAt: string | null
}

export interface AdminUserPlatform {
    keys: AdminUserApiKey[]
    /** Last 30 days, every source (Kura + API). Credits in micro-credits. */
    last30: { requests: number; costMicro: number }
    allTime: { requests: number; costMicro: number }
}
