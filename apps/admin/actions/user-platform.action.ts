"use server"

/**
 * Boli platform data on the Users sheet: a user's API keys and usage totals (read with `users:read`), and revoking a
 * key (`users:write`, audited). Every export checks the admin session and permission itself and returns ActionResult.
 * The key's secret is never stored, so nothing here can reveal one.
 */
import { revalidatePath } from "next/cache"
import { and, db, desc, eq, gte, isNull, sql } from "@repo/db"
import { adminAuditLog, apiKey, inferenceRequest } from "@repo/db/schema"
import { fail, failWith, ok, type ActionResult } from "@repo/errors"
import type { AdminUserPlatform } from "@/types/admin"
import { requireAdminAction } from "./guard"

export async function getUserPlatform(userId: string): Promise<ActionResult<AdminUserPlatform>> {
    try {
        await requireAdminAction("users", "read")
        if (typeof userId !== "string" || !userId) return failWith("validation", "Choose a user.")
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        const after = gte(inferenceRequest.createdAt, since)
        const [keys, [totals]] = await db.batch([
            db.select().from(apiKey).where(eq(apiKey.userId, userId)).orderBy(desc(apiKey.createdAt)),
            db
                .select({
                    requests30: sql<number>`count(*) filter (where ${after})`.mapWith(Number),
                    cost30: sql<number>`coalesce(sum(${inferenceRequest.costMicro}) filter (where ${after}), 0)`.mapWith(Number),
                    requestsAll: sql<number>`count(*)`.mapWith(Number),
                    costAll: sql<number>`coalesce(sum(${inferenceRequest.costMicro}), 0)`.mapWith(Number),
                })
                .from(inferenceRequest)
                .where(eq(inferenceRequest.userId, userId)),
        ])
        return ok({
            keys: keys.map((k) => ({
                id: k.id,
                name: k.name,
                prefix: k.prefix,
                createdAt: k.createdAt.toISOString(),
                lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
                revokedAt: k.revokedAt ? k.revokedAt.toISOString() : null,
            })),
            last30: { requests: totals?.requests30 ?? 0, costMicro: totals?.cost30 ?? 0 },
            allTime: { requests: totals?.requestsAll ?? 0, costMicro: totals?.costAll ?? 0 },
        })
    } catch (err) {
        return fail(err)
    }
}

export async function revokeUserApiKey(userId: string, keyId: string): Promise<ActionResult<{ id: string }>> {
    try {
        const admin = await requireAdminAction("users", "write")
        if (typeof userId !== "string" || !userId || typeof keyId !== "string" || !keyId) return failWith("validation", "That key could not be found.")
        const [row] = await db
            .update(apiKey)
            .set({ revokedAt: new Date() })
            .where(and(eq(apiKey.id, keyId), eq(apiKey.userId, userId), isNull(apiKey.revokedAt)))
            .returning({ id: apiKey.id, name: apiKey.name })
        if (!row) return failWith("notfound", "That key is already revoked or does not exist.")
        await db.insert(adminAuditLog).values({
            adminId: admin.id,
            action: "UPDATE",
            module: "users",
            resourceType: "ApiKey",
            resourceId: row.id,
            description: `Revoked API key "${row.name}" of user ${userId}`,
            createdAt: new Date(),
        })
        revalidatePath("/users")
        return ok({ id: row.id })
    } catch (err) {
        return fail(err)
    }
}
