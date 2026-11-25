import "server-only"

import { cache } from "react"
import { and, count, db, desc, eq, gte, ilike, isNotNull, isNull, or, sql, type SQL } from "@repo/db"
import { contactMessage, feedback, user } from "@repo/db/schema"
import { readPilotDetails } from "@/schemas/inbox"
import {
    JAWAF_PILOT_TOPIC,
    type InboxAttention, type InboxContactRow, type InboxFeedbackRow, type InboxFilters, type InboxPage, type InboxStats, type InboxWindow,
} from "@/types/inbox"

/**
 * Inbox reads (Communications > Inbox and the Home's Needs attention). Server only, never a 'use server' file: the
 * actions in actions/inbox.action.ts check the admin and call these. Every list is one round trip (items + total in a
 * `db.batch`).
 */

export const INBOX_PAGE_SIZE = 25

/** Nepal is UTC+5:45; "today" starts at midnight in Kathmandu. */
const NPT_OFFSET_MS = (5 * 60 + 45) * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

function windowStart(w: InboxWindow): Date {
    const now = Date.now()
    if (w === "7d") return new Date(now - 7 * DAY_MS)
    if (w === "30d") return new Date(now - 30 * DAY_MS)
    const local = now + NPT_OFFSET_MS
    return new Date(local - (local % DAY_MS) - NPT_OFFSET_MS)
}

/** The handling admin's name, read in the same query (admin_access -> user). */
function handlerName(handledBy: typeof contactMessage.handledBy | typeof feedback.handledBy) {
    return sql<string | null>`(select u.name from admin_access a join "user" u on u.id = a.user_id where a.id = ${handledBy})`
}

function iso(d: Date | null): string | null {
    return d ? d.toISOString() : null
}

function pages(total: number): number {
    return Math.max(1, Math.ceil(total / INBOX_PAGE_SIZE))
}

export async function listContactMessages(filters: InboxFilters, page: number): Promise<InboxPage<InboxContactRow>> {
    const where: SQL[] = []
    if (filters.topic) where.push(eq(contactMessage.topic, filters.topic))
    if (filters.status === "open") where.push(isNull(contactMessage.handledAt))
    if (filters.status === "handled") where.push(isNotNull(contactMessage.handledAt))
    if (filters.window) where.push(gte(contactMessage.createdAt, windowStart(filters.window)))
    if (filters.search) {
        const q = `%${filters.search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
        const any = or(ilike(contactMessage.name, q), ilike(contactMessage.email, q), ilike(contactMessage.message, q), sql`${contactMessage.details}->>'businessName' ilike ${q}`)
        if (any) where.push(any)
    }
    const cond = where.length ? and(...where) : undefined
    const [rows, totals] = await db.batch([
        db
            .select({
                id: contactMessage.id,
                name: contactMessage.name,
                email: contactMessage.email,
                topic: contactMessage.topic,
                message: contactMessage.message,
                details: contactMessage.details,
                createdAt: contactMessage.createdAt,
                handledAt: contactMessage.handledAt,
                handledByName: handlerName(contactMessage.handledBy),
            })
            .from(contactMessage)
            .where(cond)
            .orderBy(desc(contactMessage.createdAt))
            .limit(INBOX_PAGE_SIZE)
            .offset((page - 1) * INBOX_PAGE_SIZE),
        db.select({ n: count() }).from(contactMessage).where(cond),
    ])
    const total = totals[0]?.n ?? 0
    return {
        items: rows.map((r) => ({
            id: r.id,
            name: r.name,
            email: r.email,
            topic: r.topic,
            message: r.message,
            pilot: readPilotDetails(r.details),
            createdAt: r.createdAt.toISOString(),
            handledAt: iso(r.handledAt),
            handledByName: r.handledByName,
        })),
        total,
        page,
        pages: pages(total),
    }
}

export async function listFeedback(filters: InboxFilters, page: number): Promise<InboxPage<InboxFeedbackRow>> {
    const where: SQL[] = []
    if (filters.status === "open") where.push(isNull(feedback.handledAt))
    if (filters.status === "handled") where.push(isNotNull(feedback.handledAt))
    if (filters.window) where.push(gte(feedback.createdAt, windowStart(filters.window)))
    if (filters.search) {
        const q = `%${filters.search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
        const any = or(ilike(feedback.message, q), ilike(user.email, q), ilike(user.name, q), ilike(feedback.page, q))
        if (any) where.push(any)
    }
    const cond = where.length ? and(...where) : undefined
    const [rows, totals] = await db.batch([
        db
            .select({
                id: feedback.id,
                message: feedback.message,
                rating: feedback.rating,
                page: feedback.page,
                userId: feedback.userId,
                userName: user.name,
                userEmail: user.email,
                createdAt: feedback.createdAt,
                handledAt: feedback.handledAt,
                handledByName: handlerName(feedback.handledBy),
            })
            .from(feedback)
            .leftJoin(user, eq(user.id, feedback.userId))
            .where(cond)
            .orderBy(desc(feedback.createdAt))
            .limit(INBOX_PAGE_SIZE)
            .offset((page - 1) * INBOX_PAGE_SIZE),
        db.select({ n: count() }).from(feedback).leftJoin(user, eq(user.id, feedback.userId)).where(cond),
    ])
    const total = totals[0]?.n ?? 0
    return {
        items: rows.map((r) => ({
            id: r.id,
            message: r.message,
            rating: r.rating,
            page: r.page,
            userId: r.userId,
            userName: r.userName,
            userEmail: r.userEmail,
            createdAt: r.createdAt.toISOString(),
            handledAt: iso(r.handledAt),
            handledByName: r.handledByName,
        })),
        total,
        page,
        pages: pages(total),
    }
}

/** The Inbox band: open messages, open pilot requests, open feedback, average rating in the last 30 days. One round trip. */
export async function inboxStats(): Promise<InboxStats> {
    const since = new Date(Date.now() - 30 * DAY_MS).toISOString()
    const [contact, fb] = await db.batch([
        db
            .select({
                open: sql<number>`count(*) filter (where ${contactMessage.handledAt} is null)::int`,
                openPilots: sql<number>`count(*) filter (where ${contactMessage.handledAt} is null and ${contactMessage.topic} = ${JAWAF_PILOT_TOPIC})::int`,
            })
            .from(contactMessage),
        db
            .select({
                open: sql<number>`count(*) filter (where ${feedback.handledAt} is null)::int`,
                rated: sql<number>`count(${feedback.rating}) filter (where ${feedback.createdAt} >= ${since})::int`,
                avg: sql<string | null>`avg(${feedback.rating}) filter (where ${feedback.createdAt} >= ${since})`,
            })
            .from(feedback),
    ])
    const c = contact[0]
    const f = fb[0]
    const rated = Number(f?.rated ?? 0)
    return {
        openMessages: Number(c?.open ?? 0),
        openPilots: Number(c?.openPilots ?? 0),
        openFeedback: Number(f?.open ?? 0),
        avgRating30d: rated > 0 && f?.avg != null ? Math.round(Number(f.avg) * 10) / 10 : null,
        rated30d: rated,
    }
}

/**
 * For the admin Home's "Needs attention": unhandled Jawaf pilot requests and unhandled app feedback. One round trip,
 * memoised per request. The caller checks the admin (`requireAdminPage` / `adminCan(admin, "communications", "read")`)
 * before showing it.
 */
export const getInboxAttention = cache(async (): Promise<InboxAttention> => {
    const [pilots, fb] = await db.batch([
        db.select({ n: count() }).from(contactMessage).where(and(isNull(contactMessage.handledAt), eq(contactMessage.topic, JAWAF_PILOT_TOPIC))),
        db.select({ n: count() }).from(feedback).where(isNull(feedback.handledAt)),
    ])
    return { pilotRequests: pilots[0]?.n ?? 0, feedback: fb[0]?.n ?? 0 }
})
