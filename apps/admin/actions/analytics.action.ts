"use server"

/**
 * People > Sign-ups, Money > Reports (Financial, Admin activity). Every export checks the admin (`analytics` read)
 * and returns ActionResult. Every day bucket and "today" is a NEPAL day (lib/nepal-time.ts, like Home); each report's
 * reads are one db.batch. The financial report's reads live in lib/money-data.ts (server only).
 */
import { adminAccess, adminAuditLog, user } from "@repo/db/schema"
import { count, db, eq, gte, sql } from "@repo/db"
import { fail, ok, type ActionResult } from "@repo/errors"
import { loadFinancialReport, type FinancialReport } from "@/lib/money-data"
import { fillNepalDays, nepalDayKeys, nepalDaySql, nepalDaysAgo, nepalStartOfDay } from "@/lib/nepal-time"
import { requireAdminAction } from "./guard"

/** Counts in explicit windows (AGENTS.md section 9) - never a bare total quoted as "today's". Nepal days. */
export interface WindowedCount {
    today: number
    last7: number
    last30: number
    allTime: number
}

export interface DailyPoint {
    /** YYYY-MM-DD, Nepal time */
    day: string
    value: number
}

export interface AnalyticsData {
    signups: WindowedCount
    /** Active admin accounts right now (a state, not a window). */
    activeAdmins: number
    adminActions: WindowedCount
    /** New users per Nepal day, the last 30 days, oldest first (zero days included - a day with none is a real 0). */
    dailySignups: DailyPoint[]
    /** Users who have verified their email / all users. */
    verifiedUsers: number
    generatedAt: string
}

export async function getAnalyticsData(): Promise<ActionResult<AnalyticsData>> {
    try {
        await requireAdminAction("analytics", "read")
        const now = new Date()
        const today = nepalStartOfDay(now)
        const d7 = nepalDaysAgo(now, 7)
        const d30 = nepalDaysAgo(now, 30)
        const dayExpr = nepalDaySql(user.createdAt)

        const [
            [usersToday], [users7], [users30], [usersAll], [verified],
            [admins],
            [actsToday], [acts7], [acts30], [actsAll],
            daily,
        ] = await db.batch([
            db.select({ c: count() }).from(user).where(gte(user.createdAt, today)),
            db.select({ c: count() }).from(user).where(gte(user.createdAt, d7)),
            db.select({ c: count() }).from(user).where(gte(user.createdAt, d30)),
            db.select({ c: count() }).from(user),
            db.select({ c: count() }).from(user).where(eq(user.emailVerified, true)),
            db.select({ c: count() }).from(adminAccess).where(eq(adminAccess.status, "ACTIVE")),
            db.select({ c: count() }).from(adminAuditLog).where(gte(adminAuditLog.createdAt, today)),
            db.select({ c: count() }).from(adminAuditLog).where(gte(adminAuditLog.createdAt, d7)),
            db.select({ c: count() }).from(adminAuditLog).where(gte(adminAuditLog.createdAt, d30)),
            db.select({ c: count() }).from(adminAuditLog),
            db.select({ day: dayExpr, value: count() }).from(user).where(gte(user.createdAt, d30)).groupBy(sql`1`),
        ])

        return ok({
            signups: { today: usersToday?.c ?? 0, last7: users7?.c ?? 0, last30: users30?.c ?? 0, allTime: usersAll?.c ?? 0 },
            activeAdmins: admins?.c ?? 0,
            adminActions: { today: actsToday?.c ?? 0, last7: acts7?.c ?? 0, last30: acts30?.c ?? 0, allTime: actsAll?.c ?? 0 },
            dailySignups: fillNepalDays(nepalDayKeys(30, now), daily),
            verifiedUsers: verified?.c ?? 0,
            generatedAt: now.toISOString(),
        })
    } catch (err) {
        return fail(err, "analytics.signups")
    }
}

// ─── Financial: rupees received, credits sold / granted / spent ────────────────

export async function getFinancialReport(): Promise<ActionResult<FinancialReport>> {
    try {
        await requireAdminAction("analytics", "read")
        return ok(await loadFinancialReport())
    } catch (err) {
        return fail(err, "analytics.financial")
    }
}

// ─── Admin activity report ─────────────────────────────────────────────────────

export interface AdminActivityRow {
    adminId: string
    name: string
    email: string
    role: string
    last30: number
    allTime: number
    lastActionAt: string | null
}

export interface AdminActivityReport {
    actions: WindowedCount
    /** Actions per Nepal day, last 30 days. */
    daily: DailyPoint[]
    /** Actions per module, last 30 days. */
    byModule: { module: string; count: number }[]
    admins: AdminActivityRow[]
    generatedAt: string
}

export async function getAdminActivityReport(): Promise<ActionResult<AdminActivityReport>> {
    try {
        await requireAdminAction("analytics", "read")
        const now = new Date()
        const today = nepalStartOfDay(now)
        const d7 = nepalDaysAgo(now, 7)
        const d30 = nepalDaysAgo(now, 30)
        const dayExpr = nepalDaySql(adminAuditLog.createdAt)
        const recent30 = sql<number>`count(*) filter (where ${adminAuditLog.createdAt} >= ${d30.toISOString()}::timestamp)`

        const [[a0], [a7], [a30], [aAll], daily, byModule, perAdmin, admins] = await db.batch([
            db.select({ c: count() }).from(adminAuditLog).where(gte(adminAuditLog.createdAt, today)),
            db.select({ c: count() }).from(adminAuditLog).where(gte(adminAuditLog.createdAt, d7)),
            db.select({ c: count() }).from(adminAuditLog).where(gte(adminAuditLog.createdAt, d30)),
            db.select({ c: count() }).from(adminAuditLog),
            db.select({ day: dayExpr, value: count() }).from(adminAuditLog).where(gte(adminAuditLog.createdAt, d30)).groupBy(sql`1`),
            db.select({ module: adminAuditLog.module, count: count() }).from(adminAuditLog)
                .where(gte(adminAuditLog.createdAt, d30)).groupBy(adminAuditLog.module),
            db.select({
                adminId: adminAuditLog.adminId,
                last30: recent30,
                allTime: count(),
                lastAt: sql<Date | null>`max(${adminAuditLog.createdAt})`,
            }).from(adminAuditLog).groupBy(adminAuditLog.adminId),
            db.select({ id: adminAccess.id, role: adminAccess.adminRole, name: user.name, email: user.email })
                .from(adminAccess).leftJoin(user, eq(user.id, adminAccess.userId)),
        ])

        const stats = new Map(perAdmin.map((p) => [p.adminId, p]))
        return ok({
            actions: { today: a0?.c ?? 0, last7: a7?.c ?? 0, last30: a30?.c ?? 0, allTime: aAll?.c ?? 0 },
            daily: fillNepalDays(nepalDayKeys(30, now), daily),
            byModule: byModule.map((m) => ({ module: m.module, count: m.count })).sort((x, y) => y.count - x.count),
            admins: admins
                .map((a): AdminActivityRow => {
                    const s = stats.get(a.id)
                    const last = s?.lastAt ? new Date(s.lastAt) : null
                    return {
                        adminId: a.id,
                        name: a.name ?? "",
                        email: a.email ?? "",
                        role: a.role,
                        last30: Number(s?.last30 ?? 0),
                        allTime: Number(s?.allTime ?? 0),
                        lastActionAt: last ? last.toISOString() : null,
                    }
                    })
                    .sort((x, y) => y.last30 - x.last30 || y.allTime - x.allTime),
                generatedAt: now.toISOString(),
        })
    } catch (err) {
        return fail(err, "analytics.activity")
    }
}
