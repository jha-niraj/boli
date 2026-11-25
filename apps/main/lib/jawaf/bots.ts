import "server-only"
import { db, eq } from "@repo/db"
import { jawafBot } from "@repo/db/schema"
import {
    JAWAF_BUILTIN_FIELDS, JAWAF_BUSINESS_TYPES, JAWAF_CUSTOM_FIELD_TYPES, JAWAF_LENGTHS, JAWAF_RESERVED_SLUGS, JAWAF_SETUP_STEPS, JAWAF_SLUG_PATTERN,
    JAWAF_THEMES, JAWAF_TONES,
} from "@repo/boli/jawaf"
import type {
    JawafBot, JawafBotSummary, JawafBusinessType, JawafContactFields, JawafCustomSection, JawafLength, JawafPageLook, JawafSetupStep, JawafSlugCheck,
    JawafTone,
} from "@/types/jawaf"
import { botLimits, loadBot, narrowLimits, type BotRow } from "@repo/jawaf/bots"
import { slugify } from "./text"

/**
 * Bots: the tenant-checked loader every Jawaf module goes through (`loadBot(workspaceId, botId)` filters by BOTH and
 * throws notfound otherwise), the jsonb narrowing (stored JSON is never trusted as-is) and the view builders.
 */

// The row type, the loader and the limits live in @repo/jawaf (the jobs Worker needs them too).
export { botLimits, loadBot, narrowLimits, type BotRow }

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null)
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const str = (v: unknown, max = 2000): string | null => (typeof v === "string" ? v.slice(0, max) : null)
const oneOf = <T extends string>(list: readonly T[], v: unknown, d: T): T => (typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : d)

export const DEFAULT_CONTACT_FIELDS: JawafContactFields = {
    builtIn: {
        name: { enabled: true, required: true },
        phone: { enabled: true, required: true },
        email: { enabled: false, required: false },
        interest: { enabled: true, required: false },
        preferredTime: { enabled: false, required: false },
    },
    custom: [],
}

export const DEFAULT_LOOK: JawafPageLook = { coverKey: null, logoKey: null, accent: null, theme: "light", tagline: null, sections: [] }

export function narrowContactFields(raw: unknown): JawafContactFields {
    const o = obj(raw)
    const b = obj(o.builtIn)
    const builtIn = Object.fromEntries(
        JAWAF_BUILTIN_FIELDS.map((f) => {
            const t = obj(b[f])
            const d = DEFAULT_CONTACT_FIELDS.builtIn[f]
            return [f, { enabled: typeof t.enabled === "boolean" ? t.enabled : d.enabled, required: typeof t.required === "boolean" ? t.required : d.required }]
        }),
    ) as JawafContactFields["builtIn"]
    const custom = (Array.isArray(o.custom) ? o.custom : []).flatMap((c) => {
        const x = obj(c)
        const id = str(x.id, 40)
        const label = str(x.label, 60)
        if (!id || !label) return []
        return [{
            id,
            label,
            type: oneOf(JAWAF_CUSTOM_FIELD_TYPES, x.type, "text"),
            options: Array.isArray(x.options) ? x.options.filter((s): s is string => typeof s === "string").slice(0, 20) : [],
            required: x.required === true,
        }]
    })
    return { builtIn, custom }
}

export function narrowLook(raw: unknown): JawafPageLook {
    const o = obj(raw)
    const sections = (Array.isArray(o.sections) ? o.sections : []).filter((s): s is JawafCustomSection => {
        const x = obj(s)
        return typeof x.id === "string" && typeof x.type === "string" && ["rich_text", "gallery", "links", "hours_map"].includes(x.type)
    })
    return {
        coverKey: str(o.coverKey, 300),
        logoKey: str(o.logoKey, 300),
        accent: typeof o.accent === "string" && /^#[0-9a-fA-F]{6}$/.test(o.accent) ? o.accent : null,
        theme: oneOf(JAWAF_THEMES, o.theme, "light"),
        tagline: str(o.tagline, 120),
        sections,
    }
}

export function toBotSummary(b: BotRow): JawafBotSummary {
    return {
        id: b.id,
        name: b.name,
        slug: b.slug,
        businessType: oneOf<JawafBusinessType>(JAWAF_BUSINESS_TYPES, b.businessType, "other"),
        status: b.status === "live" ? "live" : "draft",
        setupStep: oneOf<JawafSetupStep>(JAWAF_SETUP_STEPS, b.setupStep, "business"),
        demo: b.demo,
        website: b.website,
        createdAt: b.createdAt.toISOString(),
    }
}

export function toBotView(b: BotRow): JawafBot {
    return {
        ...toBotSummary(b),
        tone: oneOf<JawafTone>(JAWAF_TONES, b.tone, "friendly"),
        length: oneOf<JawafLength>(JAWAF_LENGTHS, b.length, "balanced"),
        instructions: b.instructions,
        greeting: b.greeting,
        suggestedQuestions: Array.isArray(b.suggestedQuestions) ? b.suggestedQuestions.filter((s): s is string => typeof s === "string") : [],
        contactFields: narrowContactFields(b.contactFields),
        look: narrowLook(b.look),
        showSources: b.showSources,
        brandingRemoved: b.brandingRemoved,
        trainingOptIn: b.trainingOptIn,
        limits: botLimits(b),
        claimExpiresAt: iso(b.claimExpiresAt),
        updatedAt: b.updatedAt.toISOString(),
    }
}

/** Public lookup by slug (the /j page, widget, API) - no tenant filter by design; callers read only public fields. */
export async function loadBotBySlug(slug: string): Promise<BotRow | null> {
    const [b] = await db.select().from(jawafBot).where(eq(jawafBot.slug, slug.toLowerCase())).limit(1)
    return b ?? null
}

export async function checkSlug(raw: string, exceptBotId?: string): Promise<JawafSlugCheck> {
    const slug = raw.trim().toLowerCase()
    const suggest = async (base: string): Promise<string | null> => {
        const stem = slugify(base).slice(0, 34).replace(/-+$/, "")
        for (let i = 0; i < 6; i++) {
            const cand = i === 0 && stem.length >= 3 && !(JAWAF_RESERVED_SLUGS as readonly string[]).includes(stem) ? stem : `${stem}-${Math.random().toString(36).slice(2, 6)}`
            if (!JAWAF_SLUG_PATTERN.test(cand)) continue
            const [hit] = await db.select({ id: jawafBot.id }).from(jawafBot).where(eq(jawafBot.slug, cand)).limit(1)
            if (!hit) return cand
        }
        return null
    }
    if (!JAWAF_SLUG_PATTERN.test(slug)) return { slug, available: false, suggestion: await suggest(slug || "bot"), reason: "invalid" }
    if ((JAWAF_RESERVED_SLUGS as readonly string[]).includes(slug)) return { slug, available: false, suggestion: await suggest(`${slug}-np`), reason: "reserved" }
    const [hit] = await db.select({ id: jawafBot.id }).from(jawafBot).where(eq(jawafBot.slug, slug)).limit(1)
    if (hit && hit.id !== exceptBotId) return { slug, available: false, suggestion: await suggest(slug), reason: "taken" }
    return { slug, available: true, suggestion: null, reason: null }
}
