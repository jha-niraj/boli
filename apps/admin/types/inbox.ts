/**
 * Inbox types and value lists (Communications > Inbox): the site's contact messages and the app's feedback. Not in the
 * 'use server' action file - a server-action module may export only async functions.
 */
import type { JawafBusinessType } from "@repo/boli/jawaf"

/** The site's contact topics (apps/web/schemas/contact.ts). Stored as plain text, so an old row may hold another label. */
export const INBOX_TOPICS = ["Jawaf", "API", "Billing", "Enterprise", "Partnership", "Press", "Other"] as const
/** The topic the site's Jawaf pilot form writes. */
export const JAWAF_PILOT_TOPIC = "Jawaf"

export const INBOX_TOPIC_LABELS: Record<string, string> = {
    Jawaf: "Jawaf pilot",
    API: "API",
    Billing: "Billing",
    Enterprise: "Enterprise",
    Partnership: "Partnership",
    Press: "Press",
    Other: "Other",
}

export const INBOX_STATUSES = ["open", "handled"] as const
export type InboxStatus = (typeof INBOX_STATUSES)[number]
export const INBOX_STATUS_LABELS: Record<InboxStatus, string> = { open: "Not handled", handled: "Handled" }

/** Date windows for the filter (named, never open-ended). */
export const INBOX_WINDOWS = ["today", "7d", "30d"] as const
export type InboxWindow = (typeof INBOX_WINDOWS)[number]
export const INBOX_WINDOW_LABELS: Record<InboxWindow, string> = { today: "Today", "7d": "Last 7 days", "30d": "Last 30 days" }

export type InboxTab = "messages" | "feedback"

export interface InboxFilters {
    search?: string
    topic?: string
    status?: InboxStatus
    window?: InboxWindow
}

/** Both lists open on what still needs someone (the server's first page and the client's first query agree). */
export const DEFAULT_INBOX_FILTERS: InboxFilters = { status: "open" }

/** A Jawaf pilot request's extra fields, narrowed from `contact_message.details`. */
export interface JawafPilotDetails {
    kind: "jawaf_pilot"
    businessName: string
    businessWebsite: string | null
    businessType: JawafBusinessType
    city: string
    sector: string | null
    phone: string | null
}

export interface InboxContactRow {
    id: string
    name: string
    email: string
    topic: string | null
    message: string
    /** Null when the topic carries no extra fields or the stored value is not one we know. */
    pilot: JawafPilotDetails | null
    createdAt: string
    handledAt: string | null
    handledByName: string | null
}

export interface InboxFeedbackRow {
    id: string
    message: string
    rating: number | null
    page: string | null
    userId: string | null
    userName: string | null
    userEmail: string | null
    createdAt: string
    handledAt: string | null
    handledByName: string | null
}

export interface InboxPage<T> {
    items: T[]
    total: number
    page: number
    pages: number
}

/** The band at the top of the Inbox. */
export interface InboxStats {
    openMessages: number
    openPilots: number
    openFeedback: number
    /** Average rating of feedback in the last 30 days (only rated rows); null when nobody rated. */
    avgRating30d: number | null
    rated30d: number
}

/** The admin Home's "Needs attention" counts. */
export interface InboxAttention {
    /** Jawaf pilot requests not yet handled. */
    pilotRequests: number
    /** App feedback not yet handled. */
    feedback: number
}
