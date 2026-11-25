import { getInboxAttention } from "@/lib/inbox"
import "server-only"

import { and, count, db, desc, eq, gte, inArray, lt, lte, or, sql, sum } from "@repo/db"
import { creditLedger, inferenceRequest, jawafBot, jawafJob, jawafMessage, jawafProspect, payment, user } from "@repo/db/schema"
import { adminCan, type AdminPermissions } from "./permissions"

/**
 * The console Home's numbers (plan/admin/jawaf/admin-v1.md "Admin Home"). Server only: the page and
 * actions/home.action.ts call it. Admin sees every workspace, so nothing here filters by one.
 *
 * Days are NEPAL days (Asia/Kathmandu is a fixed UTC+05:45, no DST), so a bucket is `created_at + 5h45m` as a date.
 * Each permission's reads are ONE `db.batch` (one round trip); the batches run side by side.
 */

const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000
const DAY = 24 * 60 * 60 * 1000
/** A queued job older than this, or a running one whose lease ran out, is stuck. */
const STUCK_QUEUED_MS = 15 * 60 * 1000
/** Days on the Home charts. */
export const HOME_CHART_DAYS = 30
/** Rows shown in each Needs attention list. */
const ATTENTION_ROWS = 5

export interface HomeDay {
    /** YYYY-MM-DD, Nepal time */
    day: string
    signups: number
    kuraMicro: number
    apiMicro: number
    jawafMicro: number
}

export interface WaitingPayment {
    id: string
    who: string
    provider: string
    amountMinor: number
    currency: string
    createdAt: string
}

export interface StuckJob {
    id: string
    botName: string
    kind: string
    status: string
    error: string | null
    since: string
}

export interface HomeData {
    /** null = this admin cannot read that part (the section is left out, never shown as 0). */
    people: { newUsers7: number; activeWorkspaces30: number } | null
    money: { creditsSoldMonthMicro: number; paymentsWaiting: number; waiting: WaitingPayment[] } | null
    jawaf: {
        botsLive: number
        demoBots: number
        /**
         * TODO(task 2, plan/admin/jawaf/admin-v1.md): demos by stage (Sent / Met / Pilot / Paying / Lost) once the demo
         * tracker table exists. null = "not set up yet" on Home.
         */
        demosByStage: Record<string, number> | null
        /** TODO(task 2): demo follow-ups whose next step date is today or past. null = not wired yet. */
        followUpsDue: number | null
        stuckJobs: number
        stuck: StuckJob[]
    } | null
    /** Unanswered Jawaf pilot requests from the Inbox (lib/inbox.ts getInboxAttention). null = cannot read Communications. */
    pilotRequests: number | null
    /** Sign-ups and credits spent per Nepal day, oldest first, zero days included (a day with none is a real 0). */
    days: HomeDay[] | null
    generatedAt: string
}

/** The UTC instant a Nepal day / month starts. */
function nepalStartOfDay(now: Date): Date {
    const local = new Date(now.getTime() + NEPAL_OFFSET_MS)
    return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - NEPAL_OFFSET_MS)
}
function nepalStartOfMonth(now: Date): Date {
    const local = new Date(now.getTime() + NEPAL_OFFSET_MS)
    return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - NEPAL_OFFSET_MS)
}

/** The last `n` Nepal days as YYYY-MM-DD, oldest first. */
function nepalDayKeys(n: number, now: Date): string[] {
    const today = nepalStartOfDay(now).getTime() + NEPAL_OFFSET_MS
    return Array.from({ length: n }, (_, i) => new Date(today - (n - 1 - i) * DAY).toISOString().slice(0, 10))
}

const nepalDay = (col: typeof user.createdAt | typeof inferenceRequest.createdAt | typeof jawafMessage.createdAt) => sql<string>`to_char(${col} + interval '5 hours 45 minutes', 'YYYY-MM-DD')`

export async function loadHomeData(admin: { role: string; permissions: AdminPermissions }): Promise<HomeData> {
    const now = new Date()
    const since7 = new Date(now.getTime() - 7 * DAY)
    const since30 = new Date(now.getTime() - 30 * DAY)
    const chartFrom = new Date(nepalStartOfDay(now).getTime() - (HOME_CHART_DAYS - 1) * DAY)
    const monthStart = nepalStartOfMonth(now)
    const canPeople = adminCan(admin, "users") || adminCan(admin, "analytics")
    const canMoney = adminCan(admin, "analytics")
    const canJawaf = adminCan(admin, "jawaf")

    const peopleRead = canPeople
        ? db.batch([
            db.select({ n: count() }).from(user).where(gte(user.createdAt, since7)),
            // Active = asked Kura, called the API or had a Jawaf answer in the last 30 days.
            db.select({ n: sql<number>`count(distinct ws)::int` }).from(sql`(
                select ${inferenceRequest.workspaceId} as ws from ${inferenceRequest} where ${inferenceRequest.createdAt} >= ${since30.toISOString()} and ${inferenceRequest.workspaceId} is not null
                union
                select ${jawafMessage.workspaceId} as ws from ${jawafMessage} where ${jawafMessage.createdAt} >= ${since30.toISOString()} and ${jawafMessage.role} = 'assistant'
            ) as active`),
            db.select({ day: nepalDay(user.createdAt), n: count() }).from(user).where(gte(user.createdAt, chartFrom)).groupBy(sql`1`),
        ])
        : null

    const moneyRead = canMoney
        ? db.batch([
            db.select({ micro: sum(creditLedger.amountMicro) }).from(creditLedger)
                .where(and(eq(creditLedger.kind, "purchase"), gte(creditLedger.createdAt, monthStart))),
            db.select({ n: count() }).from(payment).where(eq(payment.status, "pending")),
            db.select({
                id: payment.id, provider: payment.provider, amountMinor: payment.amountMinor, currency: payment.currency,
                createdAt: payment.createdAt, name: user.name, email: user.email,
            }).from(payment).leftJoin(user, eq(user.id, payment.userId))
                .where(eq(payment.status, "pending")).orderBy(desc(payment.createdAt)).limit(ATTENTION_ROWS),
            db.select({ day: nepalDay(inferenceRequest.createdAt), source: inferenceRequest.source, micro: sum(inferenceRequest.costMicro) })
                .from(inferenceRequest).where(gte(inferenceRequest.createdAt, chartFrom)).groupBy(sql`1`, inferenceRequest.source),
            db.select({ day: nepalDay(jawafMessage.createdAt), micro: sum(jawafMessage.costMicro) })
                .from(jawafMessage).where(and(gte(jawafMessage.createdAt, chartFrom), eq(jawafMessage.role, "assistant"))).groupBy(sql`1`),
        ])
        : null

    const stuckWhere = or(
        and(eq(jawafJob.status, "running"), lt(jawafJob.leaseUntil, now)),
        and(eq(jawafJob.status, "queued"), lt(jawafJob.createdAt, new Date(now.getTime() - STUCK_QUEUED_MS))),
    )
    const jawafRead = canJawaf
        ? db.batch([
            db.select({ n: count() }).from(jawafBot).where(and(eq(jawafBot.status, "live"), eq(jawafBot.demo, false))),
            db.select({ n: count() }).from(jawafBot).where(eq(jawafBot.demo, true)),
            db.select({ n: count() }).from(jawafJob).where(and(inArray(jawafJob.status, ["queued", "running"]), stuckWhere)),
            db.select({
                id: jawafJob.id, kind: jawafJob.kind, status: jawafJob.status, error: jawafJob.error,
                createdAt: jawafJob.createdAt, startedAt: jawafJob.startedAt, botName: jawafBot.name,
            }).from(jawafJob).innerJoin(jawafBot, eq(jawafBot.id, jawafJob.botId))
                .where(and(inArray(jawafJob.status, ["queued", "running"]), stuckWhere))
                .orderBy(jawafJob.createdAt).limit(ATTENTION_ROWS),
            db.select({ stage: jawafProspect.stage, n: count() }).from(jawafProspect).groupBy(jawafProspect.stage),
            db.select({ n: count() }).from(jawafProspect)
                .where(and(lte(jawafProspect.nextStepAt, now), inArray(jawafProspect.stage, ["sent", "met", "pilot"]))),
        ])
        : null

    // Unanswered Jawaf pilot requests from the site's contact form (Inbox, lib/inbox.ts) - only for admins who can read
    // Communications; null hides the item.
    const pilotRead = adminCan(admin, "communications", "read") ? getInboxAttention().then((a) => a.pilotRequests).catch(() => null) : Promise.resolve(null)
    const [people, money, jawaf, pilotRequests] = await Promise.all([peopleRead, moneyRead, jawafRead, pilotRead])

    let days: HomeDay[] | null = null
    if (people || money) {
        const map = new Map<string, HomeDay>(nepalDayKeys(HOME_CHART_DAYS, now).map((day) => [day, { day, signups: 0, kuraMicro: 0, apiMicro: 0, jawafMicro: 0 }]))
        for (const r of people?.[2] ?? []) { const d = map.get(r.day); if (d) d.signups = Number(r.n) }
        for (const r of money?.[3] ?? []) {
            const d = map.get(r.day)
            if (!d) continue
            if (r.source === "kura") d.kuraMicro += Number(r.micro ?? 0)
            else d.apiMicro += Number(r.micro ?? 0)
        }
        for (const r of money?.[4] ?? []) { const d = map.get(r.day); if (d) d.jawafMicro = Number(r.micro ?? 0) }
        days = [...map.values()]
    }

    return {
        people: people ? { newUsers7: Number(people[0][0]?.n ?? 0), activeWorkspaces30: Number(people[1][0]?.n ?? 0) } : null,
        money: money
            ? {
                creditsSoldMonthMicro: Number(money[0][0]?.micro ?? 0),
                paymentsWaiting: Number(money[1][0]?.n ?? 0),
                waiting: money[2].map((p) => ({
                    id: p.id, who: p.name || p.email || "Deleted account", provider: p.provider, amountMinor: p.amountMinor,
                    currency: p.currency, createdAt: p.createdAt.toISOString(),
                })),
            }
            : null,
        jawaf: jawaf
            ? {
                botsLive: Number(jawaf[0][0]?.n ?? 0),
                demoBots: Number(jawaf[1][0]?.n ?? 0),
                demosByStage: Object.fromEntries(jawaf[4].map((r) => [r.stage, Number(r.n)])),
                followUpsDue: Number(jawaf[5][0]?.n ?? 0),
                stuckJobs: Number(jawaf[2][0]?.n ?? 0),
                stuck: jawaf[3].map((j) => ({
                    id: j.id, botName: j.botName, kind: j.kind, status: j.status, error: j.error,
                    since: (j.startedAt ?? j.createdAt).toISOString(),
                })),
            }
            : null,
        pilotRequests,
        days,
        generatedAt: now.toISOString(),
    }
}
