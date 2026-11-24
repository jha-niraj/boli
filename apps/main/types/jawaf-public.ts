import type { JawafBuiltinField, JawafBusinessType, JawafCustomFieldType, JawafScript, JawafTheme } from "@repo/boli/jawaf"
import type { JawafAnswerSource, JawafHoursRow } from "./jawaf"

/**
 * The PUBLIC face of a Jawaf bot (the /j/<slug> page, the poster, later the widget). Only what a visitor may see: never
 * a workspace id, the owner's instructions, limits, claim data or retrieval numbers. Built by lib/jawaf/public.ts.
 */

export interface JawafPublicContactField {
    /** A built-in field name, or the owner's custom field id. */
    id: JawafBuiltinField | string
    label: string
    type: "name" | "phone" | "email" | "interest" | "preferredTime" | JawafCustomFieldType
    required: boolean
    options: string[]
}

/** The business card on the right (from APPROVED fact sections only). */
export interface JawafPublicCard {
    /** Sanitised HTML of the approved About section. */
    aboutHtml: string | null
    /** Sanitised HTML of the approved Hours section. */
    hoursHtml: string | null
    /** Address lines from the approved Location and contact section (no phones, emails or links). */
    address: string | null
    /** What the OpenStreetMap embed looks up (the address, else the business name), geocoded when the map renders. */
    mapQuery: string | null
    phones: string[]
    /** A Nepali mobile in international digits (97798...) for wa.me, when one is listed. */
    whatsapp: string | null
    emails: string[]
    website: string | null
    socials: { label: string; url: string }[]
}

/** A custom section as the visitor sees it (rich text sanitised, image keys resolved to hrefs, maps geocoded). */
export type JawafPublicSection =
    | { id: string; type: "rich_text"; title: string; html: string }
    | { id: string; type: "gallery"; title: string; images: string[] }
    | { id: string; type: "links"; title: string; links: { label: string; url: string }[] }
    | { id: string; type: "hours_map"; title: string; hours: JawafHoursRow[]; mapQuery: string | null }

export interface JawafPublicBot {
    slug: string
    name: string
    businessType: JawafBusinessType
    demo: boolean
    tagline: string | null
    coverHref: string | null
    logoHref: string | null
    /** "#RRGGBB" for the visitor's bubbles and buttons. */
    accent: string
    /** Text colour that reads on the accent. */
    accentInk: string
    theme: JawafTheme
    greeting: string
    suggested: string[]
    showSources: boolean
    brandingRemoved: boolean
    contactFields: JawafPublicContactField[]
    card: JawafPublicCard
    sections: JawafPublicSection[]
}

export type JawafPublicMessageKind = "answered" | "not_found" | "credits" | "offline" | "error"

export interface JawafPublicMessage {
    id: string
    role: "user" | "assistant"
    text: string
    /** Empty when the owner hides sources. */
    sources: JawafAnswerSource[]
    kind: JawafPublicMessageKind | null
    script: JawafScript | null
    rating: 1 | -1 | null
    createdAt: string
}

export interface JawafPublicRestore {
    conversationId: string | null
    messages: JawafPublicMessage[]
    /** A contact was left in this conversation (the card shows as sent). */
    contactSaved: boolean
}

/**
 * The public ask stream (`POST /j/<slug>/api/ask`), NDJSON. Drafts are NOT streamed to visitors: the guards may still
 * remove a sentence with an invented number, and a visitor must never see one flash by. `final` carries the stored,
 * guarded reply; `cost`, tokens and retrieval numbers never leave the server.
 */
export type JawafPublicFrame =
    | { t: "meta"; conversationId: string; messageId: string }
    | { t: "final"; conversationId: string; message: JawafPublicMessage }
    | { t: "error"; code: "ratelimit" | "invalid" | "unknown"; message: string }
    | { t: "done" }
