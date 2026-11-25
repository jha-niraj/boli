import "server-only"

import { and, asc, count, db, desc, eq, getJawafHouseWorkspaceId, gte, inArray, isNotNull, isNull, max, ne, sql } from "@repo/db"
import {
    adminAccess, adminAuditLog, contactMessage, jawafBot, jawafClaim, jawafContact, jawafConversation, jawafJob, jawafMessage, jawafPage, jawafProspect, jawafSource, user, workspace, workspaceMember,
} from "@repo/db/schema"
import { balanceMicroForWorkspace } from "@repo/billing"
import { AppError } from "@repo/errors"
import { jobs as jobsClient } from "./jobs"
import {
    JAWAF_BUSINESS_TYPE_INFO, JAWAF_BUSINESS_TYPES, JAWAF_CHANNELS, JAWAF_LIMITS, JAWAF_RESERVED_SLUGS, JAWAF_SLUG_PATTERN, jawafLimitsFor,
    type JawafBusinessType, type JawafChannel, type JawafJobStatus,
} from "@repo/boli/jawaf"
import { readPilotDetails } from "@/schemas/inbox"
import {
    PROSPECT_STAGES,
    type BotHealth, type BotNumbers, type BotRow, type BotsData, type ClaimStatus, type ClaimView, type ConversationBrief, type ConversationTranscript,
    type DemoDetail, type DemoPrefill, type DemosData, type JobBrief, type ProspectRow, type ProspectStage,
} from "@/types/jawaf"

/**
 * Jawaf in admin - the reads and the shared writes (plan/admin/jawaf/admin-v1.md task 2). Server only, never a
 * 'use server' file: actions/jawaf/*.action.ts check the admin and call these.
 *
 * Privacy line (owner): a CUSTOMER bot shows numbers only - never a question, an answer or a contact. A bot is "house"
 * (everything may be shown) when it sits in the Boli Demos workspace or carries the demo flag (only the Boli team sets
 * it; a claim clears it). Every text read below checks `isHouse` first.
 */

type BotDbRow = typeof jawafBot.$inferSelect

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null)
const num = (v: unknown) => Number(v ?? 0) || 0
const oneOf = <T extends string>(list: readonly T[], v: unknown, d: T): T => (typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : d)

export function isHouse(bot: Pick<BotDbRow, "workspaceId" | "demo">, houseId: string | null): boolean {
    return bot.demo || (!!houseId && bot.workspaceId === houseId)
}

export async function requireHouse(): Promise<string> {
    const id = await getJawafHouseWorkspaceId()
    if (!id) throw new AppError("conflict", "The Boli Demos workspace is not set up yet. Run pnpm --filter @repo/db jawaf:house --apply.")
    return id
}

/** The first instant of the current Nepal-time month (UTC+5:45), as a UTC Date - the window Jawaf bills in. */
export function nepalMonthStart(at = new Date()): { start: Date; month: string } {
    const off = (5 * 60 + 45) * 60_000
    const local = new Date(at.getTime() + off)
    const y = local.getUTCFullYear()
    const m = local.getUTCMonth()
    return { start: new Date(Date.UTC(y, m, 1) - off), month: `${y}-${String(m + 1).padStart(2, "0")}` }
}

export function sha256Hex(text: string): Promise<string> {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)).then((b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join(""))
}

/** 32 random bytes, base64url: the claim token (only its hash is stored). */
export function newClaimToken(): string {
    const b = crypto.getRandomValues(new Uint8Array(32))
    return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

// ---------------------------------------------------------------------------------------------------------------------
// Numbers (visitor channels only; the playground never counts)
// ---------------------------------------------------------------------------------------------------------------------

const EMPTY_NUMBERS: BotNumbers = { questions: 0, answerRate: null, lastVisitAt: null }

async function numbersFor(botIds: string[], since?: Date): Promise<Map<string, BotNumbers>> {
    const out = new Map<string, BotNumbers>()
    if (!botIds.length) return out
    const [answers, visits] = await Promise.all([
        db.select({
            botId: jawafMessage.botId,
            replies: sql<number>`count(*) filter (where ${jawafMessage.status} in ('answered', 'not_found'))`,
            answered: sql<number>`count(*) filter (where ${jawafMessage.status} = 'answered')`,
        }).from(jawafMessage)
            .innerJoin(jawafConversation, eq(jawafConversation.id, jawafMessage.conversationId))
            .where(and(inArray(jawafMessage.botId, botIds), eq(jawafMessage.role, "assistant"), ne(jawafConversation.channel, "playground"), since ? gte(jawafMessage.createdAt, since) : undefined))
            .groupBy(jawafMessage.botId),
        db.select({ botId: jawafConversation.botId, last: max(jawafConversation.lastAt) }).from(jawafConversation)
            .where(and(inArray(jawafConversation.botId, botIds), ne(jawafConversation.channel, "playground")))
            .groupBy(jawafConversation.botId),
    ])
    for (const r of answers) {
        const replies = num(r.replies)
        out.set(r.botId, { questions: replies, answerRate: replies ? Math.round((100 * num(r.answered)) / replies) : null, lastVisitAt: null })
    }
    for (const v of visits) {
        const cur = out.get(v.botId) ?? { ...EMPTY_NUMBERS }
        out.set(v.botId, { ...cur, lastVisitAt: v.last ? new Date(v.last).toISOString() : null })
    }
    return out
}

function claimStatus(c: Pick<typeof jawafClaim.$inferSelect, "claimedAt" | "revokedAt" | "expiresAt">): ClaimStatus {
    if (c.claimedAt) return "claimed"
    if (c.revokedAt) return "revoked"
    if (c.expiresAt.getTime() <= Date.now()) return "expired"
    return "open"
}

function botBrief(b: BotDbRow | null) {
    if (!b) return null
    return { id: b.id, name: b.name, slug: b.slug, status: b.status === "live" ? ("live" as const) : ("draft" as const), paused: b.paused, demo: b.demo, workspaceId: b.workspaceId }
}

// ---------------------------------------------------------------------------------------------------------------------
// Demos (prospects)
// ---------------------------------------------------------------------------------------------------------------------

type ProspectJoin = { p: typeof jawafProspect.$inferSelect; b: BotDbRow | null; ownerName: string | null }

async function prospectRows(where?: ReturnType<typeof eq>): Promise<ProspectJoin[]> {
    return db.select({ p: jawafProspect, b: jawafBot, ownerName: user.name }).from(jawafProspect)
        .leftJoin(jawafBot, eq(jawafBot.id, jawafProspect.botId))
        .leftJoin(user, eq(user.id, jawafProspect.ownerUserId))
        .where(where)
        .orderBy(desc(jawafProspect.createdAt))
        .limit(500)
}

async function toProspectRows(rows: ProspectJoin[]): Promise<ProspectRow[]> {
    const botIds = rows.flatMap((r) => (r.b ? [r.b.id] : []))
    const [numbers, claims] = await Promise.all([
        numbersFor(botIds),
        botIds.length
            ? db.select({ botId: jawafClaim.botId, claimedAt: jawafClaim.claimedAt, revokedAt: jawafClaim.revokedAt, expiresAt: jawafClaim.expiresAt })
                .from(jawafClaim).where(inArray(jawafClaim.botId, botIds)).orderBy(desc(jawafClaim.createdAt))
            : Promise.resolve([]),
    ])
    const latest = new Map<string, ClaimStatus>()
    // A claimed link wins over newer revoked ones; otherwise the newest link's state.
    for (const c of claims) if (c.claimedAt) latest.set(c.botId, "claimed")
    for (const c of claims) if (!latest.has(c.botId)) latest.set(c.botId, claimStatus(c))
    return rows.map(({ p, b, ownerName }) => ({
        id: p.id,
        business: p.business,
        website: p.website,
        businessType: oneOf<JawafBusinessType>(JAWAF_BUSINESS_TYPES, p.businessType, "other"),
        sector: p.sector,
        city: p.city,
        contactName: p.contactName,
        phone: p.phone,
        email: p.email,
        stage: oneOf<ProspectStage>(PROSPECT_STAGES, p.stage, "sent"),
        nextStepAt: iso(p.nextStepAt),
        notes: p.notes,
        ownerUserId: p.ownerUserId,
        ownerName: ownerName ?? null,
        sourceContactMessageId: p.sourceContactMessageId,
        bot: botBrief(b),
        numbers: (b && numbers.get(b.id)) ?? EMPTY_NUMBERS,
        claim: b ? latest.get(b.id) ?? null : null,
        createdAt: p.createdAt.toISOString(),
    }))
}

export async function activeAdmins(): Promise<{ userId: string; name: string; email: string }[]> {
    return db.select({ userId: user.id, name: user.name, email: user.email }).from(adminAccess)
        .innerJoin(user, eq(user.id, adminAccess.userId)).where(eq(adminAccess.status, "ACTIVE")).orderBy(asc(user.name))
}

export async function listDemos(): Promise<DemosData> {
    const [houseWorkspaceId, rows, owners] = await Promise.all([getJawafHouseWorkspaceId(), prospectRows(), activeAdmins()])
    return { houseWorkspaceId, rows: await toProspectRows(rows), owners }
}

export async function prospectRow(id: string): Promise<ProspectRow> {
    const [row] = await toProspectRows(await prospectRows(eq(jawafProspect.id, id)))
    if (!row) throw new AppError("notfound", "That demo could not be found.")
    return row
}

async function claimViews(where: ReturnType<typeof eq> | undefined, limit = 500): Promise<ClaimView[]> {
    const creator = user
    const rows = await db.select({
        c: jawafClaim, botName: jawafBot.name, business: jawafProspect.business, createdByName: creator.name, wsName: workspace.name,
    }).from(jawafClaim)
        .innerJoin(jawafBot, eq(jawafBot.id, jawafClaim.botId))
        .leftJoin(jawafProspect, eq(jawafProspect.id, jawafClaim.prospectId))
        .leftJoin(adminAccess, eq(adminAccess.id, jawafClaim.createdByAdminId))
        .leftJoin(creator, eq(creator.id, adminAccess.userId))
        .leftJoin(workspace, eq(workspace.id, jawafClaim.claimedWorkspaceId))
        .where(where).orderBy(desc(jawafClaim.createdAt)).limit(limit)
    return rows.map(({ c, botName, business, createdByName, wsName }) => ({
        id: c.id, botId: c.botId, botName, prospectId: c.prospectId, prospectBusiness: business ?? null,
        createdAt: c.createdAt.toISOString(), createdByName: createdByName ?? null,
        sentAt: iso(c.sentAt), sentToEmail: c.sentToEmail, linkOpenedAt: iso(c.linkOpenedAt), claimedAt: iso(c.claimedAt),
        claimedWorkspaceName: wsName ?? null, expiresAt: c.expiresAt.toISOString(), revokedAt: iso(c.revokedAt), status: claimStatus(c),
    }))
}

export const listClaims = () => claimViews(undefined)

/** A demo bot's visitor conversations, newest first, with the first question (house bots only - the caller checked). */
async function recentConversations(botId: string, limit = 20): Promise<ConversationBrief[]> {
    const firstQ = sql<string | null>`(select m.text from jawaf_message m where m.conversation_id = ${jawafConversation.id} and m.role = 'user' order by m.created_at asc limit 1)`
    const rows = await db.select({
        id: jawafConversation.id, channel: jawafConversation.channel, messageCount: jawafConversation.messageCount, contactCaptured: jawafConversation.contactCaptured,
        startedAt: jawafConversation.startedAt, lastAt: jawafConversation.lastAt, firstQuestion: firstQ,
    }).from(jawafConversation)
        .where(and(eq(jawafConversation.botId, botId), ne(jawafConversation.channel, "playground")))
        .orderBy(desc(jawafConversation.lastAt)).limit(limit)
    return rows.map((r) => ({
        id: r.id, channel: oneOf<JawafChannel>(JAWAF_CHANNELS, r.channel, "link"), firstQuestion: r.firstQuestion ? String(r.firstQuestion).slice(0, 200) : null,
        messageCount: r.messageCount, contactCaptured: r.contactCaptured, startedAt: r.startedAt.toISOString(), lastAt: r.lastAt.toISOString(),
    }))
}

export async function demoDetail(prospectId: string): Promise<DemoDetail> {
    const prospect = await prospectRow(prospectId)
    const house = await getJawafHouseWorkspaceId()
    const bot = prospect.bot
    const [claims, conversations] = await Promise.all([
        bot ? claimViews(eq(jawafClaim.botId, bot.id), 20) : Promise.resolve([]),
        bot && isHouse(bot, house) ? recentConversations(bot.id) : Promise.resolve([]),
    ])
    return { prospect, claims, conversations }
}

// ---------------------------------------------------------------------------------------------------------------------
// Demo bot creation (the same row main's onboarding makes; the crawl / read / draft then runs in main's Jawaf setup)
// ---------------------------------------------------------------------------------------------------------------------

function slugify(name: string): string {
    const s = name.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/g, "")
    return s.length >= 3 ? s : `${s || "bot"}-${Math.random().toString(36).slice(2, 6)}`
}

/** A free public page name from the business name (main's checkSlug rules: pattern, reserved words, unique). */
export async function freeSlug(name: string): Promise<string> {
    const stem = slugify(name).slice(0, 34).replace(/-+$/, "")
    for (let i = 0; i < 8; i++) {
        const cand = i === 0 && !(JAWAF_RESERVED_SLUGS as readonly string[]).includes(stem) ? stem : `${stem}-${Math.random().toString(36).slice(2, 6)}`
        if (!JAWAF_SLUG_PATTERN.test(cand)) continue
        const [hit] = await db.select({ id: jawafBot.id }).from(jawafBot).where(eq(jawafBot.slug, cand)).limit(1)
        if (!hit) return cand
    }
    throw new AppError("conflict", "No free page name for that business. Change the name a little and try again.")
}

/** Keep equal to apps/main lib/jawaf/bots.ts DEFAULT_CONTACT_FIELDS / DEFAULT_LOOK. */
const DEFAULT_CONTACT_FIELDS = {
    builtIn: {
        name: { enabled: true, required: true },
        phone: { enabled: true, required: true },
        email: { enabled: false, required: false },
        interest: { enabled: true, required: false },
        preferredTime: { enabled: false, required: false },
    },
    custom: [],
}
const DEFAULT_LOOK = { coverKey: null, logoKey: null, accent: null, theme: "light", tagline: null, sections: [] }

/**
 * A demo bot in the house workspace, exactly as main's createJawafBot makes one (greeting, suggested questions,
 * contact fields, look), plus `demo = true`. The house has no 10-bot cap (it holds every prospect's demo). With a
 * website, setup starts at "pages": opening it in Jawaf maps the site, then read and draft run as for any owner.
 */
export async function insertDemoBot(input: { houseId: string; name: string; businessType: JawafBusinessType; website: string | null; createdById: string }): Promise<BotDbRow> {
    const slug = await freeSlug(input.name)
    const info = JAWAF_BUSINESS_TYPE_INFO[input.businessType]
    const [row] = await db.insert(jawafBot).values({
        workspaceId: input.houseId,
        name: input.name,
        slug,
        businessType: input.businessType,
        website: input.website,
        greeting: `Namaste! Ask me anything about ${input.name}.`,
        suggestedQuestions: info.suggested.slice(0, JAWAF_LIMITS.suggestedQuestions),
        contactFields: DEFAULT_CONTACT_FIELDS,
        look: DEFAULT_LOOK,
        setupStep: input.website ? "pages" : "review",
        demo: true,
        createdById: input.createdById,
    }).onConflictDoNothing().returning()
    if (!row) throw new AppError("conflict", "That page name was just taken. Try again.")
    return row
}

// ---------------------------------------------------------------------------------------------------------------------
// All bots
// ---------------------------------------------------------------------------------------------------------------------

function narrowOverrides(raw: unknown): { pagesPerBot: number | null; filesPerBot: number | null; fileMaxBytes?: number } {
    const o = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
    const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.round(v) : null)
    return { pagesPerBot: n(o.pagesPerBot), filesPerBot: n(o.filesPerBot), ...(n(o.fileMaxBytes) ? { fileMaxBytes: n(o.fileMaxBytes)! } : {}) }
}

function toBotRow(b: BotDbRow, wsName: string, house: string | null, extra: { pages: number; files: number; numbers: BotNumbers; creditsMicro: number; prospectId: string | null }): BotRow {
    const o = narrowOverrides(b.limits)
    const l = jawafLimitsFor({ pagesPerBot: o.pagesPerBot ?? undefined, filesPerBot: o.filesPerBot ?? undefined })
    return {
        id: b.id, name: b.name, slug: b.slug, status: b.status === "live" ? "live" : "draft", paused: b.paused, pausedReason: b.pausedReason, demo: b.demo,
        house: isHouse(b, house), workspaceId: b.workspaceId, workspaceName: wsName,
        pages: extra.pages, files: extra.files, answers: extra.numbers.questions, answerRate: extra.numbers.answerRate,
        creditsUsedMicro: extra.creditsMicro, lastActiveAt: extra.numbers.lastVisitAt,
        limits: { pagesPerBot: l.pagesPerBot, filesPerBot: l.filesPerBot }, limitOverrides: { pagesPerBot: o.pagesPerBot, filesPerBot: o.filesPerBot },
        prospectId: extra.prospectId, createdAt: b.createdAt.toISOString(),
    }
}

/** Credits each bot spent since `since`: answers, first page reads and file pages, from the ledger's own keys. */
async function creditsByBot(since: Date): Promise<Map<string, number>> {
    const res = await db.execute(sql`
        SELECT coalesce(m.bot_id, p.bot_id, s.bot_id) AS bot_id, sum(-l.amount_micro)::bigint AS used
          FROM credit_ledger l
          LEFT JOIN jawaf_message m ON l.idempotency_key LIKE 'spend:jawaf-answer:%' AND m.id = split_part(l.idempotency_key, ':', 3)
          LEFT JOIN jawaf_page p ON l.idempotency_key LIKE 'spend:jawaf-page:%' AND p.id = split_part(l.idempotency_key, ':', 3)
          LEFT JOIN jawaf_source s ON l.idempotency_key LIKE 'spend:jawaf-file:%' AND s.id = split_part(l.idempotency_key, ':', 3)
         WHERE l.kind = 'spend' AND l.idempotency_key LIKE 'spend:jawaf-%' AND l.created_at >= ${since}
         GROUP BY 1
    `)
    const out = new Map<string, number>()
    for (const r of res.rows as { bot_id: string | null; used: string | number | null }[]) if (r.bot_id) out.set(r.bot_id, num(r.used))
    return out
}

async function botRowsFor(bots: { b: BotDbRow; wsName: string }[], house: string | null, since: Date): Promise<BotRow[]> {
    const ids = bots.map((x) => x.b.id)
    if (!ids.length) return []
    const [pages, files, numbers, credits, prospects] = await Promise.all([
        db.select({ botId: jawafPage.botId, n: count() }).from(jawafPage)
            .where(and(inArray(jawafPage.botId, ids), eq(jawafPage.status, "included"), isNotNull(jawafPage.url))).groupBy(jawafPage.botId),
        db.select({ botId: jawafSource.botId, n: count() }).from(jawafSource).where(and(inArray(jawafSource.botId, ids), eq(jawafSource.kind, "file"))).groupBy(jawafSource.botId),
        numbersFor(ids, since),
        creditsByBot(since),
        db.select({ botId: jawafProspect.botId, id: jawafProspect.id }).from(jawafProspect).where(inArray(jawafProspect.botId, ids)),
    ])
    const pageN = new Map(pages.map((r) => [r.botId, num(r.n)]))
    const fileN = new Map(files.map((r) => [r.botId, num(r.n)]))
    const prospectOf = new Map(prospects.flatMap((r) => (r.botId ? [[r.botId, r.id] as const] : [])))
    return bots.map(({ b, wsName }) => toBotRow(b, wsName, house, {
        pages: pageN.get(b.id) ?? 0, files: fileN.get(b.id) ?? 0, numbers: numbers.get(b.id) ?? EMPTY_NUMBERS,
        creditsMicro: credits.get(b.id) ?? 0, prospectId: prospectOf.get(b.id) ?? null,
    }))
}

export async function listBots(): Promise<BotsData> {
    const { start, month } = nepalMonthStart()
    const [house, bots] = await Promise.all([
        getJawafHouseWorkspaceId(),
        db.select({ b: jawafBot, wsName: workspace.name }).from(jawafBot).innerJoin(workspace, eq(workspace.id, jawafBot.workspaceId)).orderBy(desc(jawafBot.createdAt)).limit(1000),
    ])
    return { houseWorkspaceId: house, month, rows: await botRowsFor(bots, house, start) }
}

export async function loadBotOr404(botId: string): Promise<BotDbRow> {
    const [b] = await db.select().from(jawafBot).where(eq(jawafBot.id, botId)).limit(1)
    if (!b) throw new AppError("notfound", "That bot could not be found.")
    return b
}

export async function botRow(botId: string): Promise<BotRow> {
    const { start } = nepalMonthStart()
    const [house, found] = await Promise.all([
        getJawafHouseWorkspaceId(),
        db.select({ b: jawafBot, wsName: workspace.name }).from(jawafBot).innerJoin(workspace, eq(workspace.id, jawafBot.workspaceId)).where(eq(jawafBot.id, botId)).limit(1),
    ])
    const [row] = await botRowsFor(found, house, start)
    if (!row) throw new AppError("notfound", "That bot could not be found.")
    return row
}

// ---------------------------------------------------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------------------------------------------------

/** A job nobody has advanced for this long is "stuck" (a slice runs in < 25 s; the cron is hourly in production). */
const STUCK_MS = 15 * 60_000

function toJobBrief(j: typeof jawafJob.$inferSelect): JobBrief {
    const p = j.progress && typeof j.progress === "object" ? (j.progress as Record<string, unknown>) : {}
    return {
        id: j.id, kind: j.kind, status: j.status as JawafJobStatus, label: typeof p.label === "string" ? p.label : "Waiting to start",
        done: typeof p.done === "number" ? p.done : 0, total: typeof p.total === "number" ? p.total : 0, error: j.error, updatedAt: j.updatedAt.toISOString(),
    }
}

export async function botHealth(botId: string): Promise<BotHealth> {
    const bot = await loadBotOr404(botId)
    const house = await getJawafHouseWorkspaceId()
    const weekAgo = new Date(Date.now() - 7 * 86_400_000)
    // Last read = the newest of: a source's stamp, a read page's own stamp, the latest finished read job. The source stamp
    // alone stayed empty for bots read page by page, so the sheet said "Never" beside "12 of 12 read".
    const [[src], [pages], [lastJob], failed, active, week, balance] = await Promise.all([
        db.select({ last: max(jawafSource.lastReadAt) }).from(jawafSource).where(eq(jawafSource.botId, bot.id)),
        db.select({
            included: sql<number>`count(*) filter (where ${jawafPage.status} = 'included' and ${jawafPage.url} is not null)`,
            // Read pages among the INCLUDED ones, so "read" can never be more than "included".
            read: sql<number>`count(*) filter (where ${jawafPage.status} = 'included' and ${jawafPage.readStatus} = 'read' and ${jawafPage.url} is not null)`,
            lastRead: sql<string | null>`to_char(max(${jawafPage.lastReadAt}) filter (where ${jawafPage.readStatus} = 'read'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
            failed: sql<number>`count(*) filter (where ${jawafPage.status} = 'included' and ${jawafPage.readStatus} = 'failed')`,
        }).from(jawafPage).where(eq(jawafPage.botId, bot.id)),
        db.select({ last: max(jawafJob.finishedAt) }).from(jawafJob).where(and(eq(jawafJob.botId, bot.id), eq(jawafJob.kind, "read"), eq(jawafJob.status, "done"))),
        db.select({ id: jawafPage.id, url: jawafPage.url, error: jawafPage.error }).from(jawafPage)
            .where(and(eq(jawafPage.botId, bot.id), eq(jawafPage.status, "included"), eq(jawafPage.readStatus, "failed"))).orderBy(asc(jawafPage.rank)).limit(10),
        db.select().from(jawafJob).where(and(eq(jawafJob.botId, bot.id), inArray(jawafJob.status, ["queued", "running"]))).orderBy(asc(jawafJob.createdAt)),
        numbersFor([bot.id], weekAgo),
        balanceMicroForWorkspace(bot.workspaceId),
    ])
    let top: BotHealth["topUnanswered"] = null
    if (isHouse(bot, house)) {
        const res = await db.execute(sql`
            SELECT a.conversation_id, a.created_at,
                   (SELECT u.text FROM jawaf_message u WHERE u.conversation_id = a.conversation_id AND u.role = 'user' AND u.created_at <= a.created_at
                     ORDER BY u.created_at DESC LIMIT 1) AS question
              FROM jawaf_message a JOIN jawaf_conversation c ON c.id = a.conversation_id
             WHERE a.bot_id = ${bot.id} AND a.role = 'assistant' AND c.channel <> 'playground' AND (a.status = 'not_found' OR a.rating = -1)
             ORDER BY a.created_at DESC LIMIT 5
        `)
        top = (res.rows as { conversation_id: string; created_at: string | Date; question: string | null }[])
            .filter((r) => r.question).map((r) => ({ question: String(r.question).slice(0, 200), askedAt: new Date(r.created_at).toISOString(), conversationId: r.conversation_id }))
    }
    const jobs = active.map(toJobBrief)
    const stuck = jobs.filter((j) => Date.now() - new Date(j.updatedAt).getTime() > STUCK_MS)
    const lastReadMs = Math.max(
        src?.last ? new Date(src.last).getTime() : 0,
        pages?.lastRead ? new Date(pages.lastRead).getTime() : 0,
        lastJob?.last ? new Date(lastJob.last).getTime() : 0,
    )
    return {
        lastReadAt: lastReadMs > 0 ? new Date(lastReadMs).toISOString() : null,
        pagesIncluded: num(pages?.included), pagesRead: num(pages?.read), failedCount: num(pages?.failed),
        failedPages: failed, activeJob: jobs[0] ?? null, stuckJobs: stuck,
        week: week.get(bot.id) ?? EMPTY_NUMBERS, topUnanswered: top, workspaceBalanceMicro: balance,
    }
}

/**
 * Queue a reading job for a bot (main's lib/jawaf/jobs.ts startRead, same rows): `all` puts every included page back
 * to pending (unchanged pages are then skipped by their hash, re-reads never charge); `failed` retries only the failed
 * ones. The partial unique index makes a second press return the job already running.
 */
export async function queueRead(bot: BotDbRow, mode: "all" | "failed", createdById: string): Promise<JobBrief> {
    const now = new Date()
    await db.update(jawafPage).set({ readStatus: "pending", ...(mode === "failed" ? { error: null } : {}), updatedAt: now })
        .where(and(
            eq(jawafPage.botId, bot.id), eq(jawafPage.status, "included"), isNotNull(jawafPage.url),
            mode === "all" ? inArray(jawafPage.readStatus, ["read", "failed"]) : eq(jawafPage.readStatus, "failed"),
        ))
    await db.update(jawafSource).set({ status: "reading", updatedAt: now }).where(and(eq(jawafSource.botId, bot.id), inArray(jawafSource.kind, ["site", "url"])))
    const [made] = await db.insert(jawafJob).values({
        workspaceId: bot.workspaceId, botId: bot.id, kind: "read", createdById, cursor: { draft: false },
        progress: { done: 0, total: 0, label: "Starting to read" },
    }).onConflictDoNothing().returning()
    // JOBS_RUNNER=workflow: hand the new job to boli-jobs (a Workflow instance); local: the sheet's tick drives it.
    if (made) await jobsClient.dispatch(made).catch((err: unknown) => console.error("[jobs] dispatch failed; the job stays queued", err))
    if (made) return toJobBrief(made)
    const [activeJob] = await db.select().from(jawafJob)
        .where(and(eq(jawafJob.botId, bot.id), eq(jawafJob.kind, "read"), isNull(jawafJob.sourceId), inArray(jawafJob.status, ["queued", "running"]))).limit(1)
    if (!activeJob) throw new AppError("conflict", "The read could not be started. Try again.")
    return toJobBrief(activeJob)
}

// ---------------------------------------------------------------------------------------------------------------------
// One conversation (house bots only)
// ---------------------------------------------------------------------------------------------------------------------

const FIELD_LABELS: Record<string, string> = { name: "Name", phone: "Phone", email: "Email", interest: "Interested in", preferredTime: "Best time" }

/** null = the conversation is not a house bot's (the page shows the 403). Throws notfound when it does not exist. */
export async function conversationTranscript(id: string): Promise<ConversationTranscript | null> {
    const [row] = await db.select({ c: jawafConversation, b: jawafBot }).from(jawafConversation)
        .innerJoin(jawafBot, eq(jawafBot.id, jawafConversation.botId)).where(eq(jawafConversation.id, id)).limit(1)
    if (!row) throw new AppError("notfound", "That conversation could not be found.")
    const house = await getJawafHouseWorkspaceId()
    if (!isHouse(row.b, house)) return null
    const { c, b } = row
    const [messages, contacts, [prospect]] = await Promise.all([
        db.select().from(jawafMessage).where(and(eq(jawafMessage.conversationId, c.id), eq(jawafMessage.botId, b.id))).orderBy(asc(jawafMessage.createdAt)).limit(300),
        db.select().from(jawafContact).where(and(eq(jawafContact.conversationId, c.id), eq(jawafContact.botId, b.id))).orderBy(asc(jawafContact.createdAt)),
        db.select({ id: jawafProspect.id, business: jawafProspect.business }).from(jawafProspect).where(eq(jawafProspect.botId, b.id)).limit(1),
    ])
    const contactFields = (b.contactFields && typeof b.contactFields === "object" ? (b.contactFields as { custom?: unknown }).custom : null)
    const customLabels = new Map((Array.isArray(contactFields) ? contactFields : []).flatMap((f) => {
        const x = f && typeof f === "object" ? (f as Record<string, unknown>) : {}
        return typeof x.id === "string" && typeof x.label === "string" ? [[x.id, x.label] as const] : []
    }))
    return {
        id: c.id,
        bot: { id: b.id, name: b.name, slug: b.slug },
        prospectId: prospect?.id ?? null,
        prospectBusiness: prospect?.business ?? null,
        channel: oneOf<JawafChannel>(JAWAF_CHANNELS, c.channel, "link"),
        pageUrl: c.pageUrl,
        script: c.script,
        startedAt: c.startedAt.toISOString(),
        lastAt: c.lastAt.toISOString(),
        messages: messages.map((m) => ({
            id: m.id, role: m.role, text: m.text, status: m.status, script: m.script, rating: m.rating, ratingReason: m.ratingReason, latencyMs: m.latencyMs,
            sources: (Array.isArray(m.sources) ? m.sources : []).flatMap((s) => {
                const x = s && typeof s === "object" ? (s as Record<string, unknown>) : {}
                return typeof x.n === "number" ? [{
                    n: x.n, kind: typeof x.kind === "string" ? x.kind : "page", title: typeof x.title === "string" ? x.title : "Source",
                    url: typeof x.url === "string" && /^https?:/i.test(x.url) ? x.url : null, snippet: typeof x.snippet === "string" ? x.snippet.slice(0, 300) : "",
                }] : []
            }),
            createdAt: m.createdAt.toISOString(),
        })),
        contacts: contacts.map((k) => {
            const f = k.fields && typeof k.fields === "object" && !Array.isArray(k.fields) ? (k.fields as Record<string, unknown>) : {}
            return {
                fields: Object.entries(f).flatMap(([key, v]) => (typeof v === "string" && v.trim() ? [{ label: FIELD_LABELS[key] ?? customLabels.get(key) ?? key, value: v.slice(0, 300) }] : [])),
                status: k.status, notes: k.notes, createdAt: k.createdAt.toISOString(),
            }
        }),
    }
}

/** Owners of a workspace (pause notices go to them). */
export async function workspaceOwners(workspaceId: string): Promise<{ id: string; email: string; name: string }[]> {
    return db.select({ id: user.id, email: user.email, name: user.name }).from(workspaceMember)
        .innerJoin(user, eq(user.id, workspaceMember.userId)).where(and(eq(workspaceMember.workspaceId, workspaceId), eq(workspaceMember.role, "owner")))
}

/** One audit row under the `jawaf` module (inline: it is part of the action, never after()). */
export async function auditJawaf(adminId: string, row: { action: "CREATE" | "UPDATE" | "DELETE"; resourceType: string; resourceId: string; description: string; changes?: unknown; metadata?: unknown }): Promise<void> {
    await db.insert(adminAuditLog).values({ adminId, module: "jawaf", ...row })
}

/**
 * The New demo form pre-filled from a contact message (Communications > Inbox "Create demo" links to
 * /jawaf/demos?new=1&from=<id>). Read in the page on the server; null when the id is not a contact message.
 */
export async function demoPrefill(contactMessageId: string | null): Promise<DemoPrefill | null> {
    const id = contactMessageId?.trim()
    if (!id || id.length > 64) return null
    const [m] = await db.select({ id: contactMessage.id, name: contactMessage.name, email: contactMessage.email, details: contactMessage.details })
        .from(contactMessage).where(eq(contactMessage.id, id)).limit(1)
    if (!m) return null
    const d = readPilotDetails(m.details)
    return {
        sourceContactMessageId: m.id,
        business: d?.businessName ?? "",
        website: d?.businessWebsite ?? "",
        businessType: oneOf(JAWAF_BUSINESS_TYPES, d?.businessType, "other"),
        city: d?.city ?? "",
        sector: d?.sector ?? "",
        phone: d?.phone ?? "",
        contactName: m.name ?? "",
        email: m.email ?? "",
    }
}

export const getHouseOrNull = getJawafHouseWorkspaceId
