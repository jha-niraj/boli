"use client"

import { ArrowRight } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import { RATE_LIMIT_PER_MIN, WELCOME_CREDITS } from "@repo/boli"
import { DESIGN_FAQ } from "../_components/content"
import { EditorialFaq, type FaqItem } from "../_components/editorial-faq"
import { R2Head } from "./r2-head"
import { useSky } from "./sky"
import { sans, serif } from "./t1"

/** The landing FAQ (minus "How do I pay?", answered better below) plus four the owner asked for. */
export const FAQ_V2: FaqItem[] = [
    ...DESIGN_FAQ.filter((f) => f.q !== "How do I pay?"),
    {
        q: "Do credits expire?",
        a: `No. Credits you buy and the ${WELCOME_CREDITS} welcome credits stay on your account until you use them. There is no subscription and nothing renews.`,
    },
    {
        q: "Can I pay with eSewa or Khalti?",
        a: "Yes, both. Pick a pack or type any amount from Rs 100 on the Billing page, then pay in NPR with eSewa or Khalti. The credits land as soon as the payment is confirmed.",
    },
    {
        q: "What are the rate limits?",
        a: `${RATE_LIMIT_PER_MIN} requests a minute per account, shared by every key and Kura. Past that the API answers 429 rate_limit_exceeded; wait a few seconds and retry. Need more? Talk to us.`,
    },
    {
        q: "What happens to my data?",
        a: "API calls keep metadata only - model, token counts, cost, time and status - never your prompts or the answers. Kura chats are saved to your account so you can come back to them, and you can delete them at any time.",
    },
]

/**
 * FAQ v2: the left column (title, one line, a contact link) stays pinned while the questions scroll on the right.
 * Below lg it stacks and nothing is sticky. `stickyTop` clears whatever header sits above.
 */
export function FaqList({ stickyTop = 120, className }: { stickyTop?: number; className?: string }) {
    const sky = useSky()
    return (
        <div className={cn("grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,8fr)] lg:gap-16", className)}>
            <div className="self-start lg:sticky" style={{ top: stickyTop }}>
                <p className="text-sm" style={{ ...sans(450), color: sky.text }}>
                    FAQ
                </p>
                <h3 className="mt-3 text-[48px] leading-[1.02] text-boli-ink" style={serif(360, 144, "-0.035em")}>
                    Questions, answered
                </h3>
                <p className="mt-4 max-w-sm text-[15px] leading-7 text-boli-text">What people ask before their first call - credits, payments, limits and what we keep.</p>
                <a href="#r2-faq" className="mt-6 inline-flex cursor-pointer items-center gap-1.5 text-sm text-boli-ink underline decoration-1 underline-offset-4 transition-colors" style={{ ...sans(450), textDecorationColor: `${sky.text}80` }}>
                    Still stuck? Write to us <ArrowRight aria-hidden strokeWidth={1.75} className="size-3.5" />
                </a>
            </div>
            <EditorialFaq items={FAQ_V2} defaultOpen="01" questionStyle={serif(400, 48, "-0.018em")} />
        </div>
    )
}

export function FaqV2({ n = "07" }: { n?: string }) {
    return (
        <section id="r2-faq" className="grid scroll-mt-28 gap-8">
            <R2Head n={n} title="FAQ v2" line="Editorial list. The left column stays pinned while the questions scroll - scroll this section to feel it." codes="FAQ2" />
            <div className="rounded-3xl border border-boli-line bg-boli-ground p-5 sm:p-10">
                <FaqList stickyTop={180} />
            </div>
        </section>
    )
}
