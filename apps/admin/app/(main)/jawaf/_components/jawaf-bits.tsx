"use client"

import { cn } from "@repo/ui/lib/utils"
import { toast } from "@repo/ui/components/ui/toast"
import { CLAIM_STATUS_LABELS, PROSPECT_STAGE_LABELS, type ClaimStatus, type ProspectStage } from "@/types/jawaf"

/** Query keys for Jawaf in admin; every mutation invalidates `["jawaf"]`. */
export const JAWAF_KEYS = {
    all: ["jawaf"] as const,
    demos: ["jawaf", "demos"] as const,
    demo: (id: string) => ["jawaf", "demo", id] as const,
    bots: ["jawaf", "bots"] as const,
    health: (id: string) => ["jawaf", "health", id] as const,
    embed: ["jawaf", "embed"] as const,
    claims: ["jawaf", "claims"] as const,
}

const TZ = "Asia/Kathmandu"

/** A fixed locale AND time zone, so the server's and the browser's text agree (no hydration error). */
export function fmtDate(value: string | null | undefined, withTime = false): string {
    if (!value) return "-"
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return "-"
    return new Intl.DateTimeFormat("en-GB", withTime
        ? { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: TZ }
        : { day: "numeric", month: "short", year: "numeric", timeZone: TZ }).format(d)
}

/** "YYYY-MM-DD" of an instant in Kathmandu (for the DatePicker). */
export function dayKey(value: string | null | undefined): string {
    if (!value) return ""
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? "" : new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d)
}

export function isDue(value: string | null | undefined): boolean {
    return !!value && dayKey(value) <= dayKey(new Date().toISOString())
}

export const fmtInt = (n: number) => n.toLocaleString("en-US")
export const fmtRate = (r: number | null) => (r === null ? "Not asked yet" : `${r}%`)

/** The stage as a neutral chip; the word carries the state (Lost reads muted). */
export function StageChip({ stage, className }: { stage: ProspectStage; className?: string }) {
    return (
        <span className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            stage === "lost" ? "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400" : "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200",
            stage === "paying" && "bg-boli-sky-soft text-boli-sky-ink",
            className,
        )}>{PROSPECT_STAGE_LABELS[stage]}</span>
    )
}

/** A status word with a small dot - the dot is the only colour. */
export function Dot({ tone, children }: { tone: "live" | "draft" | "paused" | "warn"; children: React.ReactNode }) {
    const dot = tone === "live" ? "bg-emerald-500" : tone === "paused" ? "bg-amber-500" : tone === "warn" ? "bg-rose-500" : "bg-neutral-400"
    return (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-neutral-700 dark:text-neutral-300">
            <span aria-hidden className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dot)} />
            {children}
        </span>
    )
}

export function BotState({ bot }: { bot: { status: "draft" | "live"; paused: boolean } | null }) {
    if (!bot) return <span className="text-sm text-neutral-500 dark:text-neutral-400">No bot</span>
    if (bot.paused) return <Dot tone="paused">Paused</Dot>
    return bot.status === "live" ? <Dot tone="live">Live</Dot> : <Dot tone="draft">Draft</Dot>
}

export function ClaimChip({ status }: { status: ClaimStatus | null }) {
    if (!status) return <span className="text-sm text-neutral-500 dark:text-neutral-400">No link</span>
    return <Dot tone={status === "claimed" ? "live" : status === "open" ? "draft" : "warn"}>{CLAIM_STATUS_LABELS[status]}</Dot>
}

/** Copy to the clipboard with a toast. */
export async function copyText(text: string, done = "Copied"): Promise<void> {
    try {
        await navigator.clipboard.writeText(text)
        toast.success(done)
    } catch {
        toast.error("Copy failed - select the text and copy it yourself.")
    }
}

/** A label / value row inside a sheet section (divider rows). */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex min-w-0 items-start justify-between gap-4 py-2">
            <dt className="shrink-0 text-sm text-neutral-600 dark:text-neutral-400">{label}</dt>
            <dd className="min-w-0 break-words text-right text-sm text-neutral-900 dark:text-white">{children}</dd>
        </div>
    )
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
    return (
        <div className="flex min-w-0 items-center justify-between gap-2">
            <h3 className="truncate text-base font-semibold text-neutral-900 dark:text-white">{children}</h3>
            {action}
        </div>
    )
}

/** The demo message the admin sends on WhatsApp / Viber (Nepali + English), with the bot and, when made, the claim link. */
export function demoMessage(o: { business: string; contactName: string | null; botUrl: string; claimUrl: string | null }): string {
    const hi = o.contactName?.trim() || o.business
    const claimNe = o.claimUrl ? `\nमन परे आफ्नो खातामा लिनुहोस् (३० दिन, एक पटक): ${o.claimUrl}` : ""
    const claimEn = o.claimUrl ? `\nIf you like it, claim it into your own account (works 30 days, once): ${o.claimUrl}` : ""
    return [
        `नमस्ते ${hi}! हामीले ${o.business} को वेबसाइटबाट एउटा Jawaf बनाएका छौं - ग्राहकका प्रश्नको जवाफ नेपाली र अंग्रेजीमा तुरुन्तै दिन्छ।`,
        `प्रयोग गर्नुहोस्: ${o.botUrl}${claimNe}`,
        "",
        `Hi ${hi}! We built a Jawaf answer assistant for ${o.business} from your website - it answers customers' questions at once, in Nepali and English.`,
        `Try it: ${o.botUrl}${claimEn}`,
        "",
        "- Boli (bolihq.com)",
    ].join("\n")
}
