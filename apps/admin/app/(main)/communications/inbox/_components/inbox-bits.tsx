"use client"

import { Star } from "lucide-react"
import { JAWAF_BUSINESS_TYPE_INFO } from "@repo/boli/jawaf"
import { cn } from "@repo/ui/lib/utils"
import type { InboxContactRow, InboxFilters } from "@/types/inbox"

/** Query keys; every handled toggle invalidates `["inbox"]`. */
export const INBOX_KEYS = {
    all: ["inbox"] as const,
    stats: ["inbox", "stats"] as const,
    messages: (page: number, f: InboxFilters) => ["inbox", "messages", page, f.search ?? "", f.topic ?? "", f.status ?? "", f.window ?? ""] as const,
    feedback: (page: number, f: InboxFilters) => ["inbox", "feedback", page, f.search ?? "", f.status ?? "", f.window ?? ""] as const,
}

/** A 1-5 rating as five stars; nothing rated says so in words. */
export function Stars({ rating, className }: { rating: number | null; className?: string }) {
    if (!rating) return <span className={cn("text-xs text-neutral-500 dark:text-neutral-400", className)}>Not rated</span>
    return (
        <span className={cn("inline-flex items-center gap-0.5", className)} role="img" aria-label={`${rating} of 5`}>
            {[1, 2, 3, 4, 5].map((n) => (
                <Star
                    key={n}
                    aria-hidden
                    className={cn("h-3.5 w-3.5", n <= rating ? "fill-amber-400 text-amber-400" : "fill-transparent text-neutral-300 dark:text-neutral-700")}
                />
            ))}
        </span>
    )
}

/** Handled or not, as a word with a dot - the dot is the only colour. */
export function HandledWord({ handledAt }: { handledAt: string | null }) {
    return (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-neutral-700 dark:text-neutral-300">
            <span aria-hidden className={cn("h-1.5 w-1.5 shrink-0 rounded-full", handledAt ? "bg-neutral-400" : "bg-sky-500")} />
            {handledAt ? "Handled" : "New"}
        </span>
    )
}

export function businessTypeLabel(row: InboxContactRow): string | null {
    return row.pilot ? JAWAF_BUSINESS_TYPE_INFO[row.pilot.businessType].label : null
}

/** A mailto link with a subject that says what we are replying to, and a greeting to start from. */
export function replyHref(row: { email: string; name: string; topic: string | null; pilot: InboxContactRow["pilot"] }): string {
    const subject = row.pilot ? `Your Jawaf demo for ${row.pilot.businessName}` : `Re: your message to Boli${row.topic ? ` (${row.topic})` : ""}`
    const first = row.name.trim().split(/\s+/)[0] ?? ""
    const body = `Namaste ${first},\n\n`
    return `mailto:${encodeURIComponent(row.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
