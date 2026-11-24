import type {
    JawafBotStatus, JawafBuiltinField, JawafBusinessType, JawafChannel, JawafContactStatus, JawafCustomFieldType, JawafFactKey, JawafIntent,
    JawafJobKind, JawafJobStatus, JawafLength, JawafNoteKind, JawafOriginKind, JawafPageChange, JawafPageReadStatus, JawafPageStatus,
    JawafQaSource, JawafScript, JawafSetupStep, JawafSourceKind, JawafSourceStatus, JawafTheme, JawafTone,
} from "@repo/boli/jawaf"

/**
 * Jawaf view types (plan/main/jawaf/jawaf-v1.md, tasks 4-7). Plain data: every date is an ISO string, every money
 * amount integer micro-credits. The jsonb shapes stored on jawaf_bot (contact fields, page look, limits) are defined
 * HERE and narrowed on every read (lib/jawaf/bots.ts), never trusted as-is.
 */

export type {
    JawafBotStatus, JawafBusinessType, JawafChannel, JawafContactStatus, JawafFactKey, JawafIntent, JawafJobKind, JawafJobStatus, JawafLength,
    JawafNoteKind, JawafOriginKind, JawafPageChange, JawafPageReadStatus, JawafPageStatus, JawafQaSource, JawafScript, JawafSetupStep,
    JawafSourceKind, JawafSourceStatus, JawafTheme, JawafTone,
}

// ---------------------------------------------------------------------------------------------------------------------
// jsonb shapes on jawaf_bot
// ---------------------------------------------------------------------------------------------------------------------

export interface JawafFieldToggle {
    enabled: boolean
    required: boolean
}

export interface JawafCustomField {
    id: string
    label: string
    type: JawafCustomFieldType
    /** For `select`. */
    options: string[]
    required: boolean
}

/** Which contact fields the bot asks for (name + phone on by default; interest is filled by the bot). */
export interface JawafContactFields {
    builtIn: Record<JawafBuiltinField, JawafFieldToggle>
    custom: JawafCustomField[]
}

export interface JawafHoursRow {
    /** 0 = Sunday ... 6 = Saturday. */
    day: number
    /** "HH:mm" or null when closed. */
    open: string | null
    close: string | null
    closed: boolean
}

export type JawafCustomSection =
    | { id: string; type: "rich_text"; title: string; html: string }
    | { id: string; type: "gallery"; title: string; imageKeys: string[] }
    | { id: string; type: "links"; title: string; links: { label: string; url: string }[] }
    | { id: string; type: "hours_map"; title: string; hours: JawafHoursRow[]; mapQuery: string | null }

/** The public page's look (published with the Publish button; the playground uses it as-is). */
export interface JawafPageLook {
    /** R2 keys, rendered through storageHref(). */
    coverKey: string | null
    logoKey: string | null
    /** "#RRGGBB" or null for the Boli sky. */
    accent: string | null
    theme: JawafTheme
    tagline: string | null
    sections: JawafCustomSection[]
}

export interface JawafLimits {
    pagesPerBot: number
    filesPerBot: number
    fileMaxBytes: number
}

// ---------------------------------------------------------------------------------------------------------------------
// Bots
// ---------------------------------------------------------------------------------------------------------------------

/** One bot in the switcher / list. */
export interface JawafBotSummary {
    id: string
    name: string
    slug: string
    businessType: JawafBusinessType
    status: JawafBotStatus
    setupStep: JawafSetupStep
    demo: boolean
    website: string | null
    createdAt: string
}

/** Everything the Settings / Share pages edit. */
export interface JawafBot extends JawafBotSummary {
    tone: JawafTone
    length: JawafLength
    instructions: string
    greeting: string
    suggestedQuestions: string[]
    contactFields: JawafContactFields
    look: JawafPageLook
    showSources: boolean
    brandingRemoved: boolean
    trainingOptIn: boolean
    /** Effective limits (defaults raised by admin overrides). */
    limits: JawafLimits
    /** Claim code expiry for a demo bot (the code itself is never returned). */
    claimExpiresAt: string | null
    updatedAt: string
}

/** Knowledge counts for Home / the setup checklist. */
export interface JawafBotCounts {
    pagesIncluded: number
    pagesRead: number
    files: number
    facts: number
    factsApproved: number
    factsDraft: number
    qa: number
    notes: number
    chunks: number
}

export interface JawafSlugCheck {
    slug: string
    available: boolean
    /** A free alternative when `slug` is taken or reserved. */
    suggestion: string | null
    /** Why it is not available ("taken", "reserved", "invalid"). */
    reason: "taken" | "reserved" | "invalid" | null
}

// ---------------------------------------------------------------------------------------------------------------------
// Sources, pages, files, jobs
// ---------------------------------------------------------------------------------------------------------------------

export interface JawafSourceView {
    id: string
    kind: JawafSourceKind
    url: string | null
    fileName: string | null
    fileSize: number | null
    mimeType: string | null
    status: JawafSourceStatus
    error: string | null
    pagesTotal: number
    pagesIncluded: number
    pagesRead: number
    /** Pages counted for a file (OCR pages, or text pages of 3,000 characters). */
    filePages: number | null
    lastReadAt: string | null
    nextReadAt: string | null
    createdAt: string
}

export interface JawafPageView {
    id: string
    sourceId: string
    url: string | null
    title: string | null
    status: JawafPageStatus
    readStatus: JawafPageReadStatus
    /** Change since the read before (new / changed / removed), null when unchanged or never compared. */
    change: JawafPageChange | null
    /** Length of the read text (0 when not read). */
    chars: number
    error: string | null
    lastReadAt: string | null
    /** Ranked as a useful page by the mapper (pre-ticked). */
    suggested: boolean
    /** A number on this page differs from the approved Prices and fees ("Website disagrees"). */
    disagreesWithFacts: boolean
}

export interface JawafMapResult {
    sourceId: string
    /** Every page found, useful ones first. */
    pages: JawafPageView[]
    /** How many were pre-ticked (up to the bot's page limit). */
    included: number
    /** URLs dropped: login, cart, tag, robots.txt-disallowed, duplicates. */
    dropped: number
}

export interface JawafJobProgress {
    done: number
    total: number
    /** One line for the UI: "Reading 12 of 40 pages", "Drafting your fact sheet". */
    label: string
}

export interface JawafJobView {
    id: string
    botId: string
    kind: JawafJobKind
    status: JawafJobStatus
    progress: JawafJobProgress
    error: string | null
    /** "credits" when it stopped because the workspace ran out of credits. */
    errorCode: "credits" | "limit" | "provider" | null
    createdAt: string
    startedAt: string | null
    finishedAt: string | null
}

export interface JawafUploadTicket {
    /** PUT the file bytes here (Content-Type = the file's type). Expires in 15 minutes. */
    uploadUrl: string
    key: string
}

// ---------------------------------------------------------------------------------------------------------------------
// Facts, Q&A, notes
// ---------------------------------------------------------------------------------------------------------------------

export interface JawafTable {
    columns: string[]
    rows: string[][]
}

export interface JawafFactSection {
    id: string
    key: JawafFactKey
    title: string
    /** Rich text (sanitize before rendering; render with `rte-output`). */
    html: string
    text: string
    /** Prices and fees (and any section that needs one). */
    table: JawafTable | null
    approved: boolean
    /** Drafted by Jawaf from the website, not yet reviewed. */
    drafted: boolean
    sort: number
    updatedAt: string
}

export interface JawafQa {
    id: string
    question: string
    /** Other ways people ask it (each is matched separately). */
    phrasings: string[]
    answer: string
    source: JawafQaSource
    /** False for a drafted FAQ waiting for Review (it is not used for answers until approved). */
    approved: boolean
    createdAt: string
    updatedAt: string
}

export interface JawafNote {
    id: string
    kind: JawafNoteKind
    title: string
    html: string
    text: string
    table: JawafTable | null
    updatedAt: string
}

export interface JawafCsvImportResult {
    added: number
    skipped: number
    /** First problems, one line each ("Row 4: no answer"). */
    problems: string[]
}

// ---------------------------------------------------------------------------------------------------------------------
// Answers (the engine's result, the playground stream)
// ---------------------------------------------------------------------------------------------------------------------

export interface JawafAnswerSource {
    /** The [n] number used in the answer text. */
    n: number
    kind: JawafOriginKind
    title: string
    url: string | null
    fileName: string | null
    /** A short excerpt of the matched text. */
    snippet: string
}

/**
 * `answered`: a grounded reply. `not_found`: nothing strong enough (the UI shows the contact card; this still counts as
 * an answer for metering). `credits`: the workspace cannot pay (visitors see the polite contact card, never the word
 * credits). `offline`: Boli's model or the embedding server did not answer. `error`: anything else.
 */
export type JawafAnswerStatus = "answered" | "not_found" | "credits" | "offline" | "error"

export interface JawafAnswer {
    status: JawafAnswerStatus
    text: string
    /** Only the sources the text actually cites (renumbered 1..n). */
    sources: JawafAnswerSource[]
    answered: boolean
    /** The visitor's script; the reply is written in it. */
    script: JawafScript
    latencyMs: number
    tokens: { input: number; output: number }
    /** Charged for this reply (0 for the playground and free answers). */
    costMicro: number
    conversationId: string | null
    messageId: string | null
}

/** Playground / public chat NDJSON frames (`POST /api/jawaf/ask`). Same line protocol as Kura (lib/ai/protocol.ts). */
export type JawafFrame =
    | { t: "meta"; conversationId: string; messageId: string; script: JawafScript }
    /** Streamed draft text. The `final` frame REPLACES it (guards may remove sentences or citations). */
    | { t: "text"; d: string }
    | { t: "final"; answer: JawafAnswer }
    | { t: "error"; code: "credits" | "offline" | "invalid" | "notfound" | "unknown"; message: string }
    | { t: "done" }

export interface JawafUnanswered {
    messageId: string
    conversationId: string
    question: string
    channel: JawafChannel
    askedAt: string
    /** Visitor thumbs-down (true) vs not found (false). */
    disliked: boolean
}

export interface JawafPlaygroundMessage {
    id: string
    role: "user" | "assistant"
    text: string
    sources: JawafAnswerSource[]
    answered: boolean | null
    createdAt: string
}

export interface JawafContact {
    id: string
    conversationId: string | null
    fields: Record<string, string>
    status: JawafContactStatus
    notes: string
    followUpAt: string | null
    summary: string | null
    intent: JawafIntent | null
    channel: JawafChannel
    createdAt: string
}

export interface JawafUsageMonth {
    /** "YYYY-MM", Nepal time. */
    month: string
    answers: number
    freeLeft: number
}

// ---------------------------------------------------------------------------------------------------------------------
// Dashboard (task 7)
// ---------------------------------------------------------------------------------------------------------------------

/** One bot in the sidebar switcher, plus which one is current (the cookie's, or the first). */
export interface JawafSwitcherData {
    bots: { id: string; name: string; status: JawafBotStatus }[]
    currentId: string | null
}

/**
 * The signed-in person's notification choices for one bot (stored in user_setting under `jawaf.notify.<botId>`, so it
 * needs no column). Sending reads these in Wave 4 (task 10).
 */
export interface JawafNotifyPrefs {
    /** Email at once when a visitor leaves their details. */
    contactEmail: boolean
    /** More addresses that get the same email. */
    extraEmails: string[]
    /** One summary email a day (Nepal time). */
    dailySummary: boolean
    /** The bell in the rail. */
    bell: boolean
    /** Browser push on this device. */
    push: boolean
}

/** The three ways "Try as visitor" can rewrite a question. */
export type JawafVisitorScript = "romanized" | "devanagari" | "english"
