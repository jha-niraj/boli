"use client"

import type { ReactNode } from "react"
import { ArrowUp } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import { ArtRoot } from "@repo/brand/art/art-root"
import { PixelVignette } from "@repo/brand/art/vignettes/vignette"
import { DashDhaka } from "@/components/platform/dhaka-band"
import { JAWAF_BUSINESS_TYPE_INFO, type JawafBusinessType, type JawafLength, type JawafTone } from "@repo/boli/jawaf"
import { jawafPublicLabel } from "./public-link"

/** A made-up sample answer per business type (preview only - never sent anywhere). */
const SAMPLE_ANSWER: Record<JawafBusinessType, { short: string; more: string }> = {
    education: { short: "Admission for the new batch is open until the 15th.", more: "You can apply at the office or online, and the counsellor is free from 10 to 4 for questions." },
    clinic: { short: "The OPD runs from 8 in the morning to 5 in the evening.", more: "You can book a doctor by phone, and emergency care is open all day and night." },
    shop: { short: "Yes, we deliver across the Kathmandu valley in a day.", more: "Outside the valley it takes 3 to 5 days, and you can pay on delivery." },
    hotel: { short: "Airport pickup is available for every booking.", more: "Tell us your flight number when you book and the driver will wait at arrivals." },
    real_estate: { short: "Two projects are open now, in Budhanilkantha and Lalitpur.", more: "A site visit takes about an hour, and our team can help with the bank loan papers." },
    other: { short: "We are open Sunday to Friday, 10 to 6.", more: "Call or message us any time and we will get back to you the same day." },
}

const OPENER: Record<JawafTone, string> = { friendly: "Sure! ", professional: "", casual: "Hey! ", formal: "Certainly. " }

export function greetingFor(businessName: string, botName: string): string {
    const biz = businessName.trim() || "our business"
    const bot = botName.trim()
    return bot ? `Namaste! I am ${bot}. Ask me anything about ${biz}.` : `Namaste! Ask me anything about ${biz}.`
}

/**
 * The live preview beside the setup form: the visitor's view of the chat as the owner types - cover (pixel scene on a
 * sky gradient, Dhaka hem), the bot's name and link, the greeting, one sample question and answer in the chosen tone
 * and length, the suggested questions and a composer. Illustrative only.
 */
export function WidgetPreview({ businessType, businessName, botName, slug, tone, length, className }: {
    businessType: JawafBusinessType
    businessName: string
    botName: string
    slug: string
    tone: JawafTone
    length: JawafLength
    className?: string
}) {
    const info = JAWAF_BUSINESS_TYPE_INFO[businessType]
    const sample = SAMPLE_ANSWER[businessType]
    const answer = `${OPENER[tone]}${length === "short" ? sample.short : `${sample.short} ${sample.more}`}${length === "detailed" ? " Anything else I can help you with?" : ""}`
    const title = businessName.trim() || "Your business"
    const initial = title.charAt(0).toUpperCase()
    return (
        <div className={cn("flex min-w-0 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_8px_30px_-12px_rgb(0_0_0/0.18)] dark:border-neutral-800 dark:bg-neutral-900", className)} aria-label="Preview of your chat page">
            <div className="relative h-28 overflow-hidden bg-gradient-to-b from-boli-sky-soft to-white dark:from-boli-sky-soft/30 dark:to-neutral-900">
                <ArtRoot className="absolute inset-x-0 bottom-0 opacity-90">
                    <div className="dark:hidden"><PixelVignette id="jawafCounter" variant="day" className="block aspect-[96/60] w-full" preserve="xMidYMax slice" /></div>
                    <div className="hidden dark:block"><PixelVignette id="jawafCounter" variant="gold" className="block aspect-[96/60] w-full" preserve="xMidYMax slice" /></div>
                </ArtRoot>
            </div>
            <DashDhaka height={7} />
            <div className="flex min-w-0 items-center gap-3 px-4 pt-3">
                <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-sm font-semibold text-white dark:bg-white dark:text-neutral-900">{initial}</span>
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">{title}</p>
                    <p className="truncate text-xs text-neutral-600 dark:text-neutral-400">{slug ? jawafPublicLabel(slug) : info.label}</p>
                </div>
            </div>
            <div className="flex min-w-0 flex-col gap-2.5 px-4 py-4 text-sm">
                <Bubble side="bot">{greetingFor(businessName, botName)}</Bubble>
                <Bubble side="me">{info.suggested[0]}</Bubble>
                <Bubble side="bot">
                    {answer} <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-boli-sky-soft px-1 align-middle text-xs text-boli-sky-ink">1</span>
                </Bubble>
                <div className="flex min-w-0 flex-wrap gap-1.5 pt-1">
                    {info.suggested.slice(1, 4).map((q) => (
                        <span key={q} className="max-w-full truncate rounded-full px-2.5 py-1 text-xs text-neutral-700 ring-1 ring-inset ring-neutral-200 dark:text-neutral-300 dark:ring-neutral-700">{q}</span>
                    ))}
                </div>
            </div>
            <div className="mx-4 mb-4 flex items-center gap-2 rounded-full border border-neutral-200 py-1.5 pl-4 pr-1.5 dark:border-neutral-800">
                <span className="min-w-0 flex-1 truncate text-xs text-neutral-500 dark:text-neutral-400">Ask in Nepali or English</span>
                <span aria-hidden className="flex size-7 items-center justify-center rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"><ArrowUp className="h-3.5 w-3.5" /></span>
            </div>
        </div>
    )
}

function Bubble({ side, children }: { side: "bot" | "me"; children: ReactNode }) {
    return (
        <div className={cn("flex min-w-0", side === "me" ? "justify-end" : "justify-start")}>
            <div className={cn(
                "max-w-[85%] min-w-0 break-words rounded-2xl px-3 py-2 text-sm leading-relaxed",
                side === "me" ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100",
            )}>
                {children}
            </div>
        </div>
    )
}
