"use server"

import { revalidatePath } from "next/cache"
import { db } from "@repo/db"
import { adminAuditLog, adminNotification, adminSystemSettings } from "@repo/db/schema"
import { and, count, desc, eq, sql } from "@repo/db"
import { errorText, requireAdminAction } from "./guard"

/** The shape every action here returns. Kept as is: the shell's notifications bell reads it. */
interface Response<T = unknown> {
    success: boolean
    data?: T
    error?: string
}

export type SystemSetting = typeof adminSystemSettings.$inferSelect
export type AdminNotificationRow = typeof adminNotification.$inferSelect

export interface SystemHealth {
    databaseStatus: "healthy" | "unhealthy"
    /** Audit entries recorded with the ERROR action, all time. */
    recentErrors: number
    checkedAt: string
}

export async function getSystemSettings(): Promise<Response<SystemSetting[]>> {
    try {
        await requireAdminAction("system", "read")
        const settings = await db.query.adminSystemSettings.findMany({
            orderBy: [desc(adminSystemSettings.updatedAt)],
        })
        return { success: true, data: settings }
    } catch (err) {
        return { success: false, error: errorText(err, "Could not load the settings") }
    }
}

export async function updateSystemSetting(
    key: string,
    data: { value: unknown; description?: string },
): Promise<Response<SystemSetting>> {
    try {
        const admin = await requireAdminAction("system", "write")
        const cleanKey = key.trim()
        if (!cleanKey) return { success: false, error: "A setting needs a key" }
        const [setting] = await db
            .insert(adminSystemSettings)
            .values({
                key: cleanKey,
                value: data.value,
                description: data.description,
                lastModifiedBy: admin.id,
            })
            .onConflictDoUpdate({
                target: adminSystemSettings.key,
                set: { value: data.value, description: data.description, lastModifiedBy: admin.id, updatedAt: new Date() },
            })
            .returning()

        await db.insert(adminAuditLog).values({
            adminId: admin.id,
            action: "UPDATE",
            module: "system",
            resourceType: "SystemSettings",
            resourceId: cleanKey,
            description: `Updated system setting: ${cleanKey}`,
        })

        revalidatePath("/system/settings")
        return { success: true, data: setting }
    } catch (err) {
        return { success: false, error: errorText(err, "Could not save the setting") }
    }
}

export async function getSystemHealth(): Promise<Response<SystemHealth>> {
    try {
        await requireAdminAction("system", "read")
    } catch (err) {
        return { success: false, error: errorText(err, "Could not check the system") }
    }
    try {
        await db.execute(sql`SELECT 1`)
        const [errorResult] = await db.select({ count: count() }).from(adminAuditLog).where(eq(adminAuditLog.action, "ERROR"))
        return {
            success: true,
            data: { databaseStatus: "healthy", recentErrors: errorResult?.count ?? 0, checkedAt: new Date().toISOString() },
        }
    } catch (err) {
        console.error("[system] health check failed:", err)
        return {
            success: true,
            data: { databaseStatus: "unhealthy", recentErrors: 0, checkedAt: new Date().toISOString() },
        }
    }
}

/** The routes this app actually has - every revalidatePath names a route that exists. */
const CACHEABLE_PATHS = ["/home", "/analytics", "/users", "/communications", "/admins", "/billing", "/billing/payments", "/billing/credits", "/system/settings", "/system/health"] as const

export async function clearCache(cacheKeys?: string[]): Promise<Response<{ cleared: string[] }>> {
    try {
        const admin = await requireAdminAction("system", "write")
        const targets = cacheKeys && cacheKeys.length > 0
            ? cacheKeys.filter((k) => (CACHEABLE_PATHS as readonly string[]).includes(k))
            : [...CACHEABLE_PATHS]
        for (const path of targets) revalidatePath(path)

        await db.insert(adminAuditLog).values({
            adminId: admin.id,
            action: "UPDATE",
            module: "system",
            resourceType: "Cache",
            resourceId: "cache",
            description: `Cleared cache: ${targets.join(", ")}`,
        })
        return { success: true, data: { cleared: targets } }
    } catch (err) {
        return { success: false, error: errorText(err, "Could not clear the cache") }
    }
}

// ─── Notifications - personal, so any active admin reads their own ────────────

