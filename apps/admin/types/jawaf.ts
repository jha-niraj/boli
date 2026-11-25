/**
 * Jawaf in admin (plan/admin/jawaf/admin-v1.md task 2): demos (prospects), all bots, claims, demo conversations.
 * Value lists and view types only - not in a 'use server' file (it may export only async functions).
 */
import type { JawafBusinessType, JawafChannel, JawafJobStatus } from "@repo/boli/jawaf"

export const PROSPECT_STAGES = ["sent", "met", "pilot", "paying", "lost"] as const
export type ProspectStage = (typeof PROSPECT_STAGES)[number]
export const PROSPECT_STAGE_LABELS: Record<ProspectStage, string> = { sent: "Sent", met: "Met", pilot: "Pilot", paying: "Paying", lost: "Lost" }

export type ClaimStatus = "open" | "expired" | "claimed" | "revoked"
export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = { open: "Open", expired: "Expired", claimed: "Claimed", revoked: "Replaced or revoked" }

/** How long a claim link works. */
export const CLAIM_DAYS = 30

/** A bot's live numbers (visitor channels only - never the playground). */
export interface BotNumbers {
    /** Visitor questions in the window. */
    questions: number
    /** Answered / (answered + not found), 0-100; null when nothing was asked. */
    answerRate: number | null
    lastVisitAt: string | null
}

export interface BotBrief {
    id: string
    name: string
    slug: string
    status: "draft" | "live"
    paused: boolean
    demo: boolean
    workspaceId: string
}

export interface ProspectRow {
    id: string
    business: string
    website: string | null
    businessType: JawafBusinessType
    sector: string | null
    city: string | null
    contactName: string | null
    phone: string | null
    email: string | null
    stage: ProspectStage
    nextStepAt: string | null
    notes: string
    ownerUserId: string | null
    ownerName: string | null
    sourceContactMessageId: string | null
    bot: BotBrief | null
    /** All time on the demo link. */
    numbers: BotNumbers
    /** The newest claim link's state, when there is one. */
    claim: ClaimStatus | null
    createdAt: string
}

/** The New demo form's starting values, read on the server from a contact message (?new=1&from=<id>). */
export interface DemoPrefill {
    sourceContactMessageId: string
    business: string
    website: string
    businessType: string
    city: string
    sector: string
    phone: string
    contactName: string
    email: string
}

export interface DemosData {
    houseWorkspaceId: string | null
    rows: ProspectRow[]
    /** Admins who can own a prospect (the owner select). */
    owners: { userId: string; name: string; email: string }[]
}

export interface ClaimView {
    id: string
    botId: string
    botName: string
    prospectId: string | null
    prospectBusiness: string | null
    createdAt: string
    createdByName: string | null
    sentAt: string | null
    sentToEmail: string | null
    linkOpenedAt: string | null
    claimedAt: string | null
    claimedWorkspaceName: string | null
    expiresAt: string
    revokedAt: string | null
    status: ClaimStatus
}

export interface ConversationBrief {
    id: string
    channel: JawafChannel
    firstQuestion: string | null
    messageCount: number
    contactCaptured: boolean
    startedAt: string
    lastAt: string
}

export interface DemoDetail {
    prospect: ProspectRow
    claims: ClaimView[]
    conversations: ConversationBrief[]
}

export interface BotRow {
    id: string
    name: string
    slug: string
    status: "draft" | "live"
    paused: boolean
    pausedReason: string | null
    demo: boolean
    /** In the Boli Demos workspace, or a demo: everything may be shown. Customer bots: numbers only. */
    house: boolean
    workspaceId: string
    workspaceName: string
    pages: number
    files: number
    /** This Nepal-time month, visitor channels. */
    answers: number
    answerRate: number | null
    creditsUsedMicro: number
    lastActiveAt: string | null
    limits: { pagesPerBot: number; filesPerBot: number }
    limitOverrides: { pagesPerBot: number | null; filesPerBot: number | null }
    prospectId: string | null
    createdAt: string
}

export interface BotsData {
    houseWorkspaceId: string | null
    month: string
    rows: BotRow[]
}

export interface JobBrief {
    id: string
    kind: string
    status: JawafJobStatus
    label: string
    done: number
    total: number
    error: string | null
    updatedAt: string
}

export interface BotHealth {
    lastReadAt: string | null
    pagesIncluded: number
    pagesRead: number
    failedPages: { id: string; url: string | null; error: string | null }[]
    failedCount: number
    activeJob: JobBrief | null
    stuckJobs: JobBrief[]
    /** Last 7 days, visitor channels. */
    week: BotNumbers
    /** Demo bots only (customer bots: null - never their text). */
    topUnanswered: { question: string; askedAt: string; conversationId: string }[] | null
    workspaceBalanceMicro: number
}

export interface EmbedHealth {
    reachable: boolean | null
    ms: number | null
    note: string | null
}

export interface EvalQuestion {
    id: string
    q: string
    script: "english" | "romanized" | "devanagari" | "mixed"
    expect?: string[]
    mustRefuse?: boolean
}

export interface EvalRowResult {
    id: string
    question: string
    status: string
    mustRefuse: boolean
    ok: boolean
    scriptOk: boolean
    invented: string[]
    inventedMoney: string[]
    latencyMs: number
    reply: string
}

export interface TranscriptMessage {
    id: string
    role: "user" | "assistant"
    text: string
    status: string | null
    script: string | null
    rating: number | null
    ratingReason: string | null
    latencyMs: number | null
    sources: { n: number; kind: string; title: string; url: string | null; snippet: string }[]
    createdAt: string
}

export interface TranscriptContact {
    fields: { label: string; value: string }[]
    status: string
    notes: string
    createdAt: string
}

export interface ConversationTranscript {
    id: string
    bot: { id: string; name: string; slug: string }
    prospectId: string | null
    prospectBusiness: string | null
    channel: JawafChannel
    pageUrl: string | null
    script: string | null
    startedAt: string
    lastAt: string
    messages: TranscriptMessage[]
    contacts: TranscriptContact[]
}
