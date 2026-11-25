import type { JawafJobKind, JawafJobStatus, JawafOriginKind } from "@repo/boli/jawaf"

/**
 * The view types the engine and the job runner return. apps/main/types/jawaf.ts re-exports them, so the UI keeps
 * importing from `@/types/jawaf`.
 */

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
