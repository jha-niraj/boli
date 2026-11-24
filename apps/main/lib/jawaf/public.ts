import "server-only"
import { cache } from "react"
import { and, asc, db, desc, eq, gt, sql } from "@repo/db"
import { jawafBot, jawafContact, jawafConversation, jawafFactSection, jawafMessage } from "@repo/db/schema"
import { AppError } from "@repo/errors"
import { isPublicStorageConfigured, storageHref } from "@repo/storage"
import { JAWAF_BUSINESS_TYPE_INFO, JAWAF_LIMITS, JAWAF_SCRIPTS, type JawafBusinessType, type JawafScript } from "@repo/boli/jawaf"
import type { JawafAnswerSource, JawafPageLook } from "@/types/jawaf"
import type {
    JawafPublicBot, JawafPublicCard, JawafPublicContactField, JawafPublicMessage, JawafPublicMessageKind, JawafPublicRestore, JawafPublicSection,
} from "@/types/jawaf-public"
import { checkContactFields, normaliseNepalMobile } from "@/schemas/jawaf-public"
import { narrowContactFields, narrowLook, toBotSummary, type BotRow } from "./bots"
import { htmlIsEmpty, safeHref, sanitizePublicHtml } from "./public-html"

/**
 * The public face of a bot (/j/<slug>, the poster, later the widget): the slug lookup, the visitor-safe view, the
 * visitor cookie, conversation restore, contact capture, ratings and the rate limits. Nothing here needs a session;
 * everything a visitor can touch is filtered by bot AND by the visitor's cookie id.
 */

// ---------------------------------------------------------------------------------------------------------------------
// The bot
// ---------------------------------------------------------------------------------------------------------------------

/** Who may be reached at /j/<slug>: a live bot, or a demo the Boli team built (draft bots stay private). */
export function isPublic(b: BotRow): boolean {
    return b.status === "live" || b.demo
}

/** The bot row by slug when it is public (one read per request: the page and its metadata share it). */
export const loadPublicBotRow = cache(async (slug: string): Promise<BotRow | null> => {
    const clean = slug.trim().toLowerCase()
    if (!/^[a-z0-9-]{3,40}$/.test(clean)) return null
    const [b] = await db.select().from(jawafBot).where(eq(jawafBot.slug, clean)).limit(1)
    return b && isPublic(b) ? b : null
})

/** The look the public sees: the published one, else the one being edited (never published yet). */
export function publicLook(b: BotRow): JawafPageLook {
    return narrowLook(b.publishedLook ?? b.look)
}

/** Default accent: the sky's text-safe ink (white text passes 4.5:1 on it; the #3d8fd6 fill does not). */
const DEFAULT_ACCENT = "#1d64a3"

function luminance(hex: string): number {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!
}

/** White on the accent when it reads (4.5:1), else near-black. */
export function accentInk(hex: string): string {
    const l = luminance(hex)
    return (1.05) / (l + 0.05) >= 4.5 ? "#ffffff" : "#141414"
}

/** An R2 key in the bot's look -> an href a signed-out visitor can open. */
export function publicImageHref(slug: string, key: string | null): string | null {
    if (!key) return null
    if (/^https:\/\//i.test(key)) return key
    if (isPublicStorageConfigured()) return storageHref(key)
    // A private bucket: our own route checks the key belongs to this bot's published look, then redirects to a signed URL.
    return `/j/${slug}/api/image/${key.split("/").map(encodeURIComponent).join("/")}`
}

/** Every image key the public look may show (the image route allows only these). */
export function publicImageKeys(b: BotRow): Set<string> {
    const look = publicLook(b)
    const keys = new Set<string>()
    if (look.coverKey) keys.add(look.coverKey)
    if (look.logoKey) keys.add(look.logoKey)
    for (const s of look.sections) if (s.type === "gallery") s.imageKeys.forEach((k) => keys.add(k))
    return keys
}

const PREFERRED_TIMES = ["Morning (9 to 12)", "Afternoon (12 to 4)", "Evening (4 to 7)", "Any time"]
const BUILTIN_LABELS = { name: "Your name", phone: "Mobile number", email: "Email", interest: "What are you interested in?", preferredTime: "Best time to call" } as const

export function publicContactFields(b: BotRow): JawafPublicContactField[] {
    const cf = narrowContactFields(b.contactFields)
    const out: JawafPublicContactField[] = []
    for (const id of ["name", "phone", "email", "interest", "preferredTime"] as const) {
        const t = cf.builtIn[id]
        if (!t.enabled) continue
        out.push({ id, label: BUILTIN_LABELS[id], type: id, required: t.required, options: id === "preferredTime" ? PREFERRED_TIMES : [] })
    }
    for (const c of cf.custom) out.push({ id: `c_${c.id}`, label: c.label, type: c.type, required: c.required, options: c.options })
    // A contact card without a way to call back is useless: phone is always asked when nothing else reaches the person.
    if (!out.some((f) => f.type === "phone" || f.type === "email")) out.splice(1, 0, { id: "phone", label: BUILTIN_LABELS.phone, type: "phone", required: true, options: [] })
    return out
}

// --- the business card, from APPROVED facts ---------------------------------------------------------------------------

const SOCIAL_HOSTS: [RegExp, string][] = [
    [/(^|\.)facebook\.com$|(^|\.)fb\.com$/, "Facebook"],
    [/(^|\.)instagram\.com$/, "Instagram"],
    [/(^|\.)tiktok\.com$/, "TikTok"],
    [/(^|\.)youtube\.com$|(^|\.)youtu\.be$/, "YouTube"],
    [/(^|\.)linkedin\.com$/, "LinkedIn"],
    [/(^|\.)x\.com$|(^|\.)twitter\.com$/, "X"],
    [/(^|\.)viber\.com$/, "Viber"],
]

function urlsIn(text: string, html: string): string[] {
    const found = new Set<string>()
    for (const m of html.matchAll(/href\s*=\s*"([^"]+)"/gi)) found.add(m[1]!)
    for (const m of text.matchAll(/https?:\/\/[^\s<>"')]+/gi)) found.add(m[0].replace(/[.,;]+$/, ""))
    for (const m of text.matchAll(/\b(?:www\.)?(?:facebook|instagram|tiktok|youtube|linkedin)\.com\/[^\s<>"')]+/gi)) found.add(`https://${m[0].replace(/[.,;]+$/, "")}`)
    return [...found].flatMap((u) => (safeHref(u) && /^https?:/i.test(u) ? [u] : []))
}

const PHONE_RUN = /(?:\+?977[\s-]?)?(?:\d[\s-]?){7,10}\d/g
const HAS_PHONE = /(?:\+?977[\s-]?)?(?:\d[\s-]?){7,10}\d/

function phonesIn(text: string): string[] {
    const out = new Set<string>()
    for (const m of text.matchAll(PHONE_RUN)) {
        const raw = m[0].trim()
        const mobile = normaliseNepalMobile(raw)
        if (mobile) {
            out.add(mobile)
            continue
        }
        // Landlines: 01-4xxxxxx (Kathmandu) and other area codes, 9 or 10 digits starting with 0.
        const d = raw.replace(/[\s-]/g, "").replace(/^\+?977/, "0")
        if (/^0\d{7,9}$/.test(d)) out.add(raw.replace(/\s+/g, " "))
    }
    return [...out].slice(0, 3)
}

function emailsIn(text: string): string[] {
    return [...new Set([...text.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)].map((m) => m[0].toLowerCase()))].slice(0, 2)
}

const ADDRESS_LABEL = /^(?:[-*•]\s*)?(?:address|location|where we are|find us|visit us|our office|office|head office|located at)\s*[:\-]?\s*/i

function addressFrom(text: string): string | null {
    const lines = text.split(/\n+/).map((l) => l.replace(/^[-*•]\s*/, "").trim()).filter(Boolean)
    const picked = lines
        .filter((l) => !/@|https?:|www\./i.test(l) && !HAS_PHONE.test(l))
        .map((l) => l.replace(ADDRESS_LABEL, "").trim())
        .filter((l) => l.length >= 3 && l.length <= 140)
    return picked.length ? picked.slice(0, 2).join(", ") : null
}

async function publicCard(b: BotRow): Promise<JawafPublicCard> {
    const rows = await db.select().from(jawafFactSection)
        .where(and(eq(jawafFactSection.botId, b.id), eq(jawafFactSection.approved, true)))
        .orderBy(asc(jawafFactSection.sort))
    const by = (key: string) => rows.find((r) => r.key === key)
    const about = by("about")
    const hours = by("hours")
    const location = by("location")
    const allText = rows.map((r) => r.text).join("\n")
    const allHtml = rows.map((r) => r.html).join("\n")
    const locText = location?.text ?? ""

    const phones = phonesIn(locText).length ? phonesIn(locText) : phonesIn(allText)
    const mobile = phones.map((p) => normaliseNepalMobile(p)).find(Boolean) ?? null
    const socials: JawafPublicCard["socials"] = []
    for (const u of urlsIn(allText, allHtml)) {
        let host = ""
        try { host = new URL(u).hostname.replace(/^www\./, "") } catch { continue }
        const hit = SOCIAL_HOSTS.find(([re]) => re.test(host))
        if (hit && !socials.some((s) => s.label === hit[1])) socials.push({ label: hit[1], url: u })
    }
    const aboutHtml = about ? sanitizePublicHtml(about.html) : ""
    const hoursHtml = hours ? sanitizePublicHtml(hours.html) : ""
    const address = addressFrom(locText)
    const website = b.website && safeHref(b.website) ? b.website : null
    return {
        aboutHtml: aboutHtml && !htmlIsEmpty(aboutHtml) ? aboutHtml : null,
        hoursHtml: hoursHtml && !htmlIsEmpty(hoursHtml) ? hoursHtml : null,
        address,
        mapQuery: address ? (address.toLowerCase().includes("nepal") ? address : `${address}, Nepal`) : null,
        phones,
        whatsapp: mobile ? `977${mobile}` : null,
        emails: emailsIn(locText).length ? emailsIn(locText) : emailsIn(allText),
        website,
        socials: socials.slice(0, 6),
    }
}

function publicSections(b: BotRow, look: JawafPageLook): JawafPublicSection[] {
    return look.sections.flatMap((s): JawafPublicSection[] => {
        if (s.type === "rich_text") {
            const html = sanitizePublicHtml(s.html)
            return htmlIsEmpty(html) ? [] : [{ id: s.id, type: "rich_text", title: s.title, html }]
        }
        if (s.type === "gallery") {
            const images = (Array.isArray(s.imageKeys) ? s.imageKeys : []).flatMap((k) => {
                const h = typeof k === "string" ? publicImageHref(b.slug, k) : null
                return h ? [h] : []
            }).slice(0, 12)
            return images.length ? [{ id: s.id, type: "gallery", title: s.title, images }] : []
        }
        if (s.type === "links") {
            const links = (Array.isArray(s.links) ? s.links : []).flatMap((l) => {
                const url = l && typeof l.url === "string" ? safeHref(l.url) : null
                return url && /^https?:/i.test(url) && typeof l.label === "string" ? [{ label: l.label.slice(0, 60), url }] : []
            }).slice(0, 10)
            return links.length ? [{ id: s.id, type: "links", title: s.title, links }] : []
        }
        if (s.type === "hours_map") {
            const hours = Array.isArray(s.hours) ? s.hours.filter((h) => h && typeof h.day === "number").slice(0, 7) : []
            const mapQuery = typeof s.mapQuery === "string" && s.mapQuery.trim() ? s.mapQuery.trim().slice(0, 200) : null
            return hours.length || mapQuery ? [{ id: s.id, type: "hours_map", title: s.title, hours, mapQuery }] : []
        }
        return []
    })
}

/** The visitor-safe view of a public bot (one batch of reads: the facts). */
export const loadPublicBot = cache(async (slug: string): Promise<JawafPublicBot | null> => {
    const b = await loadPublicBotRow(slug)
    if (!b) return null
    const look = publicLook(b)
    const summary = toBotSummary(b)
    const type = summary.businessType as JawafBusinessType
    const accent = look.accent ?? DEFAULT_ACCENT
    const suggested = (Array.isArray(b.suggestedQuestions) ? b.suggestedQuestions.filter((s): s is string => typeof s === "string" && !!s.trim()) : [])
    return {
        slug: b.slug,
        name: b.name,
        businessType: type,
        demo: b.demo,
        tagline: look.tagline,
        coverHref: publicImageHref(b.slug, look.coverKey),
        logoHref: publicImageHref(b.slug, look.logoKey),
        accent,
        accentInk: accentInk(accent),
        theme: look.theme,
        greeting: b.greeting.trim() || `Namaste! Ask ${b.name} anything - in Nepali, Romanized Nepali or English.`,
        suggested: (suggested.length ? suggested : JAWAF_BUSINESS_TYPE_INFO[type]?.suggested ?? []).slice(0, 4),
        showSources: b.showSources,
        brandingRemoved: b.brandingRemoved,
        contactFields: publicContactFields(b),
        card: await publicCard(b),
        sections: publicSections(b, look),
    }
})

// ---------------------------------------------------------------------------------------------------------------------
// The visitor cookie (HttpOnly, 30 days, scoped to /j/<slug> so each business keeps its own visitor)
// ---------------------------------------------------------------------------------------------------------------------

export const VISITOR_COOKIE = "jawaf_v"
const VISITOR_ID = /^[0-9a-f-]{36}$/

export function readVisitorId(raw: string | null | undefined): string | null {
    return raw && VISITOR_ID.test(raw) ? raw : null
}

/** The visitor id from a request's Cookie header (the route handlers). */
export function visitorFromRequest(req: Request): string | null {
    const header = req.headers.get("cookie") ?? ""
    for (const part of header.split(/;\s*/)) {
        const i = part.indexOf("=")
        if (i > 0 && part.slice(0, i) === VISITOR_COOKIE) return readVisitorId(decodeURIComponent(part.slice(i + 1)))
    }
    return null
}

export function visitorCookie(slug: string, id: string, secure: boolean): string {
    const maxAge = JAWAF_LIMITS.visitorMemoryDays * 24 * 60 * 60
    return `${VISITOR_COOKIE}=${id}; Path=/j/${slug}; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`
}

export function clearVisitorCookie(slug: string, secure: boolean): string {
    return `${VISITOR_COOKIE}=; Path=/j/${slug}; Max-Age=0; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`
}

// ---------------------------------------------------------------------------------------------------------------------
// Conversation restore
// ---------------------------------------------------------------------------------------------------------------------

function asSources(v: unknown): JawafAnswerSource[] {
    if (!Array.isArray(v)) return []
    return v.flatMap((s) => {
        if (!s || typeof s !== "object") return []
        const x = s as Record<string, unknown>
        if (typeof x.n !== "number" || typeof x.title !== "string") return []
        const url = typeof x.url === "string" ? safeHref(x.url) : null
        return [{
            n: x.n,
            kind: (typeof x.kind === "string" ? x.kind : "page") as JawafAnswerSource["kind"],
            title: x.title.slice(0, 200),
            url: url && /^https?:/i.test(url) ? url : null,
            fileName: typeof x.fileName === "string" ? x.fileName.slice(0, 200) : null,
            snippet: typeof x.snippet === "string" ? x.snippet.slice(0, 300) : "",
        }]
    })
}

const KINDS: JawafPublicMessageKind[] = ["answered", "not_found", "credits", "offline", "error"]

/** Sources a visitor may see: only when the owner shows them, and only links to http(s). */
export function visibleSources(bot: { showSources: boolean }, sources: unknown): JawafAnswerSource[] {
    return bot.showSources ? asSources(sources) : []
}

/** The visitor's latest conversation with this bot in the last 30 days (newest 60 messages). */
export async function restoreConversation(b: BotRow, visitorId: string | null): Promise<JawafPublicRestore> {
    const empty: JawafPublicRestore = { conversationId: null, messages: [], contactSaved: false }
    if (!visitorId) return empty
    const since = new Date(Date.now() - JAWAF_LIMITS.visitorMemoryDays * 24 * 60 * 60 * 1000)
    const [c] = await db.select({ id: jawafConversation.id, contactCaptured: jawafConversation.contactCaptured }).from(jawafConversation)
        .where(and(eq(jawafConversation.botId, b.id), eq(jawafConversation.visitorId, visitorId), gt(jawafConversation.lastAt, since)))
        .orderBy(desc(jawafConversation.lastAt)).limit(1)
    if (!c) return empty
    const rows = await db.select().from(jawafMessage).where(eq(jawafMessage.conversationId, c.id)).orderBy(desc(jawafMessage.createdAt)).limit(60)
    const messages: JawafPublicMessage[] = rows.reverse().map((m) => ({
        id: m.id,
        role: m.role,
        text: m.text,
        sources: m.role === "assistant" ? visibleSources(b, m.sources) : [],
        kind: m.role === "assistant" && KINDS.includes(m.status as JawafPublicMessageKind) ? (m.status as JawafPublicMessageKind) : null,
        script: (JAWAF_SCRIPTS as readonly string[]).includes(m.script ?? "") ? (m.script as JawafScript) : null,
        rating: m.rating === 1 || m.rating === -1 ? m.rating : null,
        createdAt: m.createdAt.toISOString(),
    }))
    return { conversationId: c.id, messages, contactSaved: c.contactCaptured }
}

/** The conversation id when it belongs to this bot AND this visitor; null otherwise. */
export async function ownConversation(botId: string, visitorId: string | null, conversationId: string | null | undefined): Promise<string | null> {
    if (!visitorId || !conversationId) return null
    const [c] = await db.select({ id: jawafConversation.id }).from(jawafConversation)
        .where(and(eq(jawafConversation.id, conversationId), eq(jawafConversation.botId, botId), eq(jawafConversation.visitorId, visitorId))).limit(1)
    return c?.id ?? null
}

// ---------------------------------------------------------------------------------------------------------------------
// Rate limits
// ---------------------------------------------------------------------------------------------------------------------

export const PUBLIC_LIMITS = {
    /** Questions per visitor (counted in the database: survives isolates). */
    askVisitorPerMinute: 20,
    askVisitorPerDay: 300,
    /** Questions per IP (per Worker isolate, best effort: a school's wifi shares one IP, so these sit higher). */
    askIpPerMinute: 40,
    askIpPerDay: 1000,
    /** Voice clips (Sarvam costs money per clip; per isolate). */
    speechVisitorPerMinute: 6,
    speechVisitorPerDay: 60,
    speechIpPerMinute: 15,
    /** Contact cards. */
    contactVisitorPerHour: 3,
    contactIpPerHour: 6,
    /** Ratings per IP per minute (a rating is one row update; this only stops a loop). */
    rateIpPerMinute: 60,
} as const

const windows = new Map<string, number[]>()

/** A sliding window in this isolate's memory. True = allowed (and counted). */
export function memoryHit(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now()
    const list = (windows.get(key) ?? []).filter((t) => now - t < windowMs)
    if (list.length >= limit) {
        windows.set(key, list)
        return false
    }
    list.push(now)
    windows.set(key, list)
    if (windows.size > 20_000) {
        for (const [k, v] of windows) if (!v.length || now - v[v.length - 1]! > 86_400_000) windows.delete(k)
    }
    return true
}

/** The caller's IP, hashed (never stored or logged raw). */
export async function ipKey(req: Request): Promise<string> {
    const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "unknown"
    const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`jawaf:${ip}`)))
    return Array.from(bytes.slice(0, 12), (x) => x.toString(16).padStart(2, "0")).join("")
}

const SLOW_DOWN = "You are asking very quickly. Wait a minute and try again."
const DAY_DONE = "That is a lot of questions for one day. Please contact the business directly, or come back tomorrow."

/** Throws AppError('ratelimit') with a visitor-friendly sentence when this question would go over a limit. */
export async function checkAskLimits(botId: string, visitorId: string | null, ip: string): Promise<void> {
    if (!memoryHit(`ask:m:${ip}`, PUBLIC_LIMITS.askIpPerMinute, 60_000)) throw new AppError("ratelimit", SLOW_DOWN)
    if (!memoryHit(`ask:d:${ip}`, PUBLIC_LIMITS.askIpPerDay, 86_400_000)) throw new AppError("ratelimit", DAY_DONE)
    if (!visitorId) return
    const res = await db.execute(sql`
        SELECT count(*) FILTER (WHERE m.created_at > now() - interval '1 minute')::int AS minute, count(*)::int AS day
          FROM jawaf_message m
          JOIN jawaf_conversation c ON c.id = m.conversation_id
         WHERE c.bot_id = ${botId} AND c.visitor_id = ${visitorId} AND m.role = 'user' AND m.created_at > now() - interval '1 day'
    `)
    const row = (res.rows[0] ?? {}) as { minute?: number; day?: number }
    if ((row.minute ?? 0) >= PUBLIC_LIMITS.askVisitorPerMinute) throw new AppError("ratelimit", SLOW_DOWN)
    if ((row.day ?? 0) >= PUBLIC_LIMITS.askVisitorPerDay) throw new AppError("ratelimit", DAY_DONE)
}

export function checkSpeechLimits(visitorId: string | null, ip: string): void {
    if (!memoryHit(`stt:m:${ip}`, PUBLIC_LIMITS.speechIpPerMinute, 60_000)) throw new AppError("ratelimit", "Too many voice messages at once. Wait a minute, or type instead.")
    if (visitorId) {
        if (!memoryHit(`stt:vm:${visitorId}`, PUBLIC_LIMITS.speechVisitorPerMinute, 60_000)) throw new AppError("ratelimit", "Too many voice messages at once. Wait a minute, or type instead.")
        if (!memoryHit(`stt:vd:${visitorId}`, PUBLIC_LIMITS.speechVisitorPerDay, 86_400_000)) throw new AppError("ratelimit", "Voice is resting for today. Type your question instead.")
    }
}

// ---------------------------------------------------------------------------------------------------------------------
// Contact capture and ratings
// ---------------------------------------------------------------------------------------------------------------------

export async function saveContact(input: {
    bot: BotRow
    visitorId: string | null
    ip: string
    conversationId: string | null | undefined
    fields: Record<string, string>
    channel: "link" | "qr"
}): Promise<{ id: string }> {
    const { bot } = input
    if (!memoryHit(`contact:${input.ip}`, PUBLIC_LIMITS.contactIpPerHour, 3_600_000)) {
        throw new AppError("ratelimit", "You have sent your details several times already. The business will be in touch.")
    }
    if (input.visitorId) {
        const res = await db.execute(sql`
            SELECT count(*)::int AS n FROM jawaf_contact k JOIN jawaf_conversation c ON c.id = k.conversation_id
             WHERE k.bot_id = ${bot.id} AND c.visitor_id = ${input.visitorId} AND k.created_at > now() - interval '1 hour'
        `)
        if (((res.rows[0] as { n?: number } | undefined)?.n ?? 0) >= PUBLIC_LIMITS.contactVisitorPerHour) {
            throw new AppError("ratelimit", "You have sent your details several times already. The business will be in touch.")
        }
    }
    const config = publicContactFields(bot)
    const errors = checkContactFields(config, input.fields)
    const first = Object.values(errors)[0]
    if (first) throw new AppError("validation", first)

    // Keep only the fields this bot asks for; phones stored as their 10 digits; custom ids without the c_ prefix.
    const clean: Record<string, string> = {}
    for (const f of config) {
        const v = (input.fields[f.id] ?? "").trim().slice(0, 500)
        if (!v) continue
        const key = f.id.startsWith("c_") ? f.id.slice(2) : f.id
        clean[key] = f.type === "phone" ? (normaliseNepalMobile(v) ?? v) : v
    }
    const conversationId = await ownConversation(bot.id, input.visitorId, input.conversationId)
    const id = crypto.randomUUID()
    const insert = db.insert(jawafContact).values({ id, workspaceId: bot.workspaceId, botId: bot.id, conversationId, fields: clean, channel: input.channel })
    if (conversationId) {
        await db.batch([insert, db.update(jawafConversation).set({ contactCaptured: true }).where(eq(jawafConversation.id, conversationId))])
    } else {
        await insert
    }
    return { id }
}

/** A visitor's thumbs up / down (or 0 to take it back) on one of THEIR assistant messages. */
export async function rateMessage(input: { bot: BotRow; visitorId: string | null; ip: string; messageId: string; rating: 1 | -1 | 0; reason?: string | null }): Promise<void> {
    if (!input.visitorId) throw new AppError("notfound", "That reply could not be found.")
    if (!memoryHit(`rate:${input.ip}`, PUBLIC_LIMITS.rateIpPerMinute, 60_000)) throw new AppError("ratelimit", "Wait a moment and try again.")
    const res = await db.update(jawafMessage)
        .set({ rating: input.rating === 0 ? null : input.rating, ratingReason: input.rating === -1 ? (input.reason?.trim() || null) : null })
        .where(and(
            eq(jawafMessage.id, input.messageId),
            eq(jawafMessage.botId, input.bot.id),
            eq(jawafMessage.role, "assistant"),
            sql`${jawafMessage.conversationId} IN (SELECT id FROM jawaf_conversation WHERE bot_id = ${input.bot.id} AND visitor_id = ${input.visitorId})`,
        ))
        .returning({ id: jawafMessage.id })
    if (!res.length) throw new AppError("notfound", "That reply could not be found.")
}
