/**
 * Jawaf's contract (plan/main/jawaf/jawaf-v1.md): prices, limits, business types, tones and the plain value lists the
 * dashboard, the server and the database agree on. Browser-safe: no env reads, no server imports. Change a price or a
 * limit here and nowhere else.
 */
import { MICRO_PER_CREDIT } from "./boli"

// ---------------------------------------------------------------------------------------------------------------------
// Money (credits only; 1 credit = Rs 1; stored in integer micro-credits)
// ---------------------------------------------------------------------------------------------------------------------

export const JAWAF_PRICES = {
    /** One visitor answer (answered OR not-found) after the workspace's free answers this month. Rs 0.50. */
    answerMicro: MICRO_PER_CREDIT / 2,
    /** One web page read for the first time, after the bot's free pages. */
    pageMicro: MICRO_PER_CREDIT,
    /** One page of an uploaded file (PDF / image / Word, read once). */
    filePageMicro: 2 * MICRO_PER_CREDIT,
    /** "Powered by Boli" removed, per month. */
    brandingMonthlyMicro: 500 * MICRO_PER_CREDIT,
    /** Free visitor answers per WORKSPACE per month (resets on the 1st, Nepal time). Playground answers are always free. */
    freeAnswersPerMonth: 100,
    /** Free web pages per BOT (first reads only; re-reads of a page never charge). */
    freePagesPerBot: 20,
} as const

/** Characters of plain text counted as one "page" for a Word / TXT file (OCR'd files count real pages). */
export const JAWAF_TEXT_CHARS_PER_PAGE = 3000

// ---------------------------------------------------------------------------------------------------------------------
// Limits (per bot; an admin can raise them per bot through `limits` overrides)
// ---------------------------------------------------------------------------------------------------------------------

export const JAWAF_LIMITS = {
    pagesPerBot: 200,
    filesPerBot: 50,
    fileMaxBytes: 20 * 1024 * 1024,
    /** Bots per workspace (a sanity cap). */
    botsPerWorkspace: 10,
    qaPerBot: 1000,
    phrasingsPerQa: 10,
    notesPerBot: 200,
    suggestedQuestions: 6,
    customFields: 8,
    customSections: 8,
    questionChars: 1000,
    answerChars: 4000,
    noteChars: 50_000,
    /** Days between automatic re-reads of a bot's website. */
    rereadDays: 7,
    /** Visitor memory on the same device. */
    visitorMemoryDays: 30,
} as const

export interface JawafLimitOverrides {
    pagesPerBot?: number
    filesPerBot?: number
    fileMaxBytes?: number
}

/** The limits a bot runs with: the defaults, raised by its overrides. */
export function jawafLimitsFor(overrides: JawafLimitOverrides | null | undefined) {
    const o = overrides ?? {}
    const pick = (v: number | undefined, d: number) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.round(v) : d)
    return {
        pagesPerBot: pick(o.pagesPerBot, JAWAF_LIMITS.pagesPerBot),
        filesPerBot: pick(o.filesPerBot, JAWAF_LIMITS.filesPerBot),
        fileMaxBytes: pick(o.fileMaxBytes, JAWAF_LIMITS.fileMaxBytes),
    }
}

// ---------------------------------------------------------------------------------------------------------------------
// Value lists (the database stores these ids; labels are UI copy)
// ---------------------------------------------------------------------------------------------------------------------

export const JAWAF_BUSINESS_TYPES = ["education", "clinic", "shop", "hotel", "real_estate", "other"] as const
export type JawafBusinessType = (typeof JAWAF_BUSINESS_TYPES)[number]

export const JAWAF_BUSINESS_TYPE_INFO: Record<JawafBusinessType, { label: string; example: string; suggested: string[] }> = {
    education: {
        label: "Education or consultancy",
        example: "Schools, colleges, IELTS and abroad-study consultancies",
        suggested: ["What courses do you offer?", "How much is the fee?", "Admission kahile khulcha?", "कक्षा कति बजे सुरु हुन्छ?"],
    },
    clinic: {
        label: "Clinic or hospital",
        example: "Clinics, hospitals, dental and eye care",
        suggested: ["Which doctors are available today?", "OPD ko time kati ho?", "Do you take appointments online?", "कुन कुन सेवा छन्?"],
    },
    shop: {
        label: "Shop",
        example: "Retail, electronics, clothing, online stores",
        suggested: ["Do you deliver outside Kathmandu?", "Esko price kati ho?", "What payment methods do you accept?", "पसल कति बजे खुल्छ?"],
    },
    hotel: {
        label: "Hotel or travel",
        example: "Hotels, homestays, trekking and travel agencies",
        suggested: ["What are your room rates?", "Airport pickup huncha?", "Do you arrange trekking permits?", "चेक-इन कति बजे हो?"],
    },
    real_estate: {
        label: "Real estate",
        example: "Housing, land, apartments, agents",
        suggested: ["What projects are available now?", "Bank loan milcha?", "Where is the site office?", "किस्तामा तिर्न मिल्छ?"],
    },
    other: { label: "Something else", example: "Any business with questions to answer", suggested: ["What do you do?", "Kaha cha office?", "How can I contact you?"] },
}

export const JAWAF_TONES = ["friendly", "professional", "casual", "formal"] as const
export type JawafTone = (typeof JAWAF_TONES)[number]
export const JAWAF_TONE_LABELS: Record<JawafTone, string> = { friendly: "Friendly", professional: "Professional", casual: "Casual", formal: "Formal" }

export const JAWAF_LENGTHS = ["short", "balanced", "detailed"] as const
export type JawafLength = (typeof JAWAF_LENGTHS)[number]
export const JAWAF_LENGTH_LABELS: Record<JawafLength, string> = { short: "Short", balanced: "Balanced", detailed: "Detailed" }

export const JAWAF_SCRIPTS = ["devanagari", "romanized", "english", "mixed"] as const
export type JawafScript = (typeof JAWAF_SCRIPTS)[number]
export const JAWAF_SCRIPT_LABELS: Record<JawafScript, string> = {
    devanagari: "Nepali (Devanagari)",
    romanized: "Romanized Nepali",
    english: "English",
    mixed: "Mixed",
}

export const JAWAF_CHANNELS = ["link", "qr", "widget", "api", "playground"] as const
export type JawafChannel = (typeof JAWAF_CHANNELS)[number]
export const JAWAF_CHANNEL_LABELS: Record<JawafChannel, string> = { link: "Link", qr: "QR code", widget: "Website widget", api: "API", playground: "Playground" }

export const JAWAF_BOT_STATUSES = ["draft", "live"] as const
export type JawafBotStatus = (typeof JAWAF_BOT_STATUSES)[number]

/** Setup steps in order (onboarding + checklist). `done` = the checklist is complete. */
export const JAWAF_SETUP_STEPS = ["business", "pages", "reading", "review", "try", "share", "done"] as const
export type JawafSetupStep = (typeof JAWAF_SETUP_STEPS)[number]

export const JAWAF_FACT_KEYS = ["about", "services", "prices", "hours", "location", "policies", "custom"] as const
export type JawafFactKey = (typeof JAWAF_FACT_KEYS)[number]
export const JAWAF_FACT_TITLES: Record<JawafFactKey, string> = {
    about: "About",
    services: "Services",
    prices: "Prices and fees",
    hours: "Hours",
    location: "Location and contact",
    policies: "Policies",
    custom: "More",
}

export const JAWAF_SOURCE_KINDS = ["site", "url", "file", "qa_csv"] as const
export type JawafSourceKind = (typeof JAWAF_SOURCE_KINDS)[number]
export const JAWAF_SOURCE_STATUSES = ["queued", "reading", "ready", "failed"] as const
export type JawafSourceStatus = (typeof JAWAF_SOURCE_STATUSES)[number]

export const JAWAF_PAGE_STATUSES = ["included", "excluded"] as const
export type JawafPageStatus = (typeof JAWAF_PAGE_STATUSES)[number]
export const JAWAF_PAGE_READ_STATUSES = ["pending", "read", "failed", "removed"] as const
export type JawafPageReadStatus = (typeof JAWAF_PAGE_READ_STATUSES)[number]
export const JAWAF_PAGE_CHANGES = ["new", "changed", "removed"] as const
export type JawafPageChange = (typeof JAWAF_PAGE_CHANGES)[number]

export const JAWAF_QA_SOURCES = ["owner", "fix", "import", "draft"] as const
export type JawafQaSource = (typeof JAWAF_QA_SOURCES)[number]

export const JAWAF_NOTE_KINDS = ["note", "table"] as const
export type JawafNoteKind = (typeof JAWAF_NOTE_KINDS)[number]

/** What a chunk came from (its citation kind). */
export const JAWAF_ORIGIN_KINDS = ["page", "file", "qa", "note", "fact"] as const
export type JawafOriginKind = (typeof JAWAF_ORIGIN_KINDS)[number]

export const JAWAF_JOB_KINDS = ["read", "file", "draft", "reindex"] as const
export type JawafJobKind = (typeof JAWAF_JOB_KINDS)[number]
export const JAWAF_JOB_STATUSES = ["queued", "running", "done", "failed", "cancelled"] as const
export type JawafJobStatus = (typeof JAWAF_JOB_STATUSES)[number]

export const JAWAF_CONTACT_STATUSES = ["new", "contacted", "converted", "not_interested"] as const
export type JawafContactStatus = (typeof JAWAF_CONTACT_STATUSES)[number]
export const JAWAF_CONTACT_STATUS_LABELS: Record<JawafContactStatus, string> = {
    new: "New",
    contacted: "Contacted",
    converted: "Converted",
    not_interested: "Not interested",
}
export const JAWAF_INTENTS = ["high", "medium", "low"] as const
export type JawafIntent = (typeof JAWAF_INTENTS)[number]

export const JAWAF_CUSTOM_FIELD_TYPES = ["text", "select", "number", "date"] as const
export type JawafCustomFieldType = (typeof JAWAF_CUSTOM_FIELD_TYPES)[number]
export const JAWAF_BUILTIN_FIELDS = ["name", "phone", "email", "interest", "preferredTime"] as const
export type JawafBuiltinField = (typeof JAWAF_BUILTIN_FIELDS)[number]

export const JAWAF_THEMES = ["light", "dark", "system"] as const
export type JawafTheme = (typeof JAWAF_THEMES)[number]
export const JAWAF_SECTION_TYPES = ["rich_text", "gallery", "links", "hours_map"] as const
export type JawafSectionType = (typeof JAWAF_SECTION_TYPES)[number]

/** Public page path: app.bolihq.com/j/<slug>. Lower-case letters, digits and single hyphens, 3-40 characters. */
export const JAWAF_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){2,39}$/
/** Slugs nobody may take (routes, brand words). */
export const JAWAF_RESERVED_SLUGS = [
    "admin", "api", "app", "boli", "bolihq", "jawaf", "kura", "help", "support", "login", "signin", "signup", "settings",
    "new", "demo", "test", "www", "static", "assets", "about", "contact", "terms", "privacy", "billing",
] as const

/** The fixed not-found replies, in the visitor's script (the UI adds the contact card under it). */
export const JAWAF_NOT_FOUND: Record<JawafScript, string> = {
    english: "I could not find that in our information. Leave your name and number and we will get back to you.",
    romanized: "Yo kura hamro jankari ma bhetina. Tapai ko naam ra number chodnuhos, hami samparka garchhau.",
    devanagari: "यो कुरा हाम्रो जानकारीमा भेटिएन। तपाईंको नाम र नम्बर छोड्नुहोस्, हामी सम्पर्क गर्छौं।",
    mixed: "Yo kura hamro jankari ma bhetina. Leave your name and number and we will get back to you.",
}
