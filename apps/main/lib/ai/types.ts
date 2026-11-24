// Types shared by Kura's server code and its client components. Pure - no imports that pull in server code.
import type { KuraSettings } from '@repo/boli'
import type { KuraPart } from './protocol'

export interface ChatViewMessage {
    id: string
    role: 'user' | 'assistant'
    /** User rows: the bubble text. Assistant rows: unused (the text lives in `parts`). */
    text: string
    parts: KuraPart[]
    /** Still streaming. */
    pending?: boolean
    /** A thinking block is streaming right now. */
    thinking?: boolean
    /** Assistant rows: the person's rating (1 helpful, -1 not helpful) and the optional reason for a -1. */
    rating?: KuraRating | null
    ratingReason?: KuraDislikeReason | null
}

/** Why a reply was not helpful - the choices in the thumbs-down popover. */
export const KURA_DISLIKE_REASONS = [
    { key: 'wrong-script', label: 'Wrong script or language' },
    { key: 'wrong-facts', label: 'Not true' },
    { key: 'not-helpful', label: 'Did not answer' },
    { key: 'too-long', label: 'Too long' },
    { key: 'other', label: 'Something else' },
] as const
export type KuraDislikeReason = typeof KURA_DISLIKE_REASONS[number]['key']
export type KuraRating = 1 | -1

export interface ConversationView {
    id: string
    title: string
    messages: ChatViewMessage[]
    settings: KuraSettings
}

export interface ConversationRow {
    id: string
    title: string
    /** ISO instant. */
    updatedAt: string
}

export type NeedsYouGroup = 'now' | 'today' | 'later'

export interface NeedsYouItem {
    id: string
    group: NeedsYouGroup
    title: string
    detail: string
    /** A page (a route constant). */
    href?: string
    /** The button label for `href`. */
    action?: string
}

export interface NeedsYouList {
    items: NeedsYouItem[]
    /** Sources that could not be read - shown as a line with Try again, never as "You're clear". */
    failed: string[]
}

export interface ChatRequestBody {
    conversationId?: string | null
    message: string
    /** The settings this turn runs with (the page's current ones); stored on the conversation. */
    settings: KuraSettings
}
