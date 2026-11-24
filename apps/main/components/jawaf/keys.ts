import type { ActionResult } from "@repo/errors"
/**
 * TanStack Query keys for the Jawaf dashboard: `["jawaf", <name>, botId, ...]`. Every key carries the bot id, so
 * switching bot reads fresh data (and a page's server `initialData` seeds the new key). Mutations invalidate the list
 * they changed; `JAWAF_ROOT` drops everything (switching bot, deleting one).
 */
export const JAWAF_ROOT = ["jawaf"] as const

export const JAWAF_KEYS = {
    switcher: ["jawaf", "switcher"] as const,
    bot: (botId: string) => ["jawaf", "bot", botId] as const,
    counts: (botId: string) => ["jawaf", "counts", botId] as const,
    facts: (botId: string) => ["jawaf", "facts", botId] as const,
    qa: (botId: string) => ["jawaf", "qa", botId] as const,
    notes: (botId: string) => ["jawaf", "notes", botId] as const,
    pages: (botId: string) => ["jawaf", "pages", botId] as const,
    sources: (botId: string) => ["jawaf", "sources", botId] as const,
    files: (botId: string) => ["jawaf", "files", botId] as const,
    activeJob: (botId: string) => ["jawaf", "active-job", botId] as const,
    unanswered: (botId: string) => ["jawaf", "unanswered", botId] as const,
    notify: (botId: string) => ["jawaf", "notify", botId] as const,
}

/** Shared card chrome: neutral surface, hairline, whatever the state (AGENTS.md section 10). */
export const JAWAF_CARD = "min-w-0 rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"

/** Unwrap an ActionResult inside a queryFn / mutationFn (throw on failure, as TanStack expects). */
export function unwrap<T>(res: ActionResult<T>, fallback = "Something went wrong. Try again."): T {
    if (!res.success) throw new Error(res.error || fallback)
    return res.data
}
