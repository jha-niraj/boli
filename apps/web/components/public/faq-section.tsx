import { ArrowRight } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { cn } from "@repo/ui/lib/utils"
import { EditorialFaq, type FaqItem } from "@repo/brand/editorial-faq"
import { DISPLAY } from "@repo/brand/type"
import { ADD_CREDITS_MIN, API_PATHS, BOLI_CHAT, KURA, MICRO_PER_CREDIT, RATE_LIMIT_PER_MIN, WELCOME_CREDITS } from "@repo/boli"
import { ROUTES } from "@/lib/routes"
import { Kicker } from "./section"
import { SKY_DECORATION } from "./tokens"
import { JAWAF_PRICE_LINE } from "./pricing"

/** FAQ2 (approved 2026-11-24): the landing questions plus credits expiry, eSewa/Khalti, rate limits and data. */
export const FAQ: FaqItem[] = [
    {
        q: "What is Boli?",
        a: `Boli runs open AI models for Nepal. You can chat in ${KURA.name} or call the same model from your own code through an OpenAI-compatible API. You pay per token, in rupees. Jawaf, which answers a business's customers, is in pilot.`,
    },
    {
        q: "What is Jawaf?",
        a: `Jawaf answers a business's customers from its own website, files, facts and common questions, in Nepali, Romanized Nepali or English. Customers reach it through a link and QR poster, a chat bubble on the website, or the API. If it does not know, it says so and asks for a phone number instead of guessing. It is in pilot with a small group of businesses; the planned price is ${JAWAF_PRICE_LINE}, from the same credits.`,
    },
    {
        q: "Which model does it run?",
        a: `${BOLI_CHAT.id} is ${BOLI_CHAT.label}: ${BOLI_CHAT.base}. It reads ${BOLI_CHAT.languages.join(", ")}, with a context of ${BOLI_CHAT.contextTokens.toLocaleString("en-US")} tokens. We only run open models.`,
    },
    {
        q: "Does it understand Romanized Nepali?",
        a: "Yes. That is the reason Boli exists. The model reads Nepali in Latin letters, Devanagari, English and mixes of them, and tries to reply in the script you wrote in. It is a small model and still makes mistakes, so check anything important.",
    },
    {
        q: "How do credits work?",
        a: `1 credit = Rs 1. You get ${WELCOME_CREDITS} free credits when you verify your email. Each call costs its input and output tokens at the per-million price, worked out to a millionth of a credit (1 credit = ${MICRO_PER_CREDIT.toLocaleString("en-US")} micro-credits). At zero, the API returns 402 until you add more.`,
    },
    {
        q: "Do credits expire?",
        a: `No. Credits you buy and the ${WELCOME_CREDITS} welcome credits stay on your account until you use them. There is no subscription and nothing renews.`,
    },
    {
        q: "Can I pay with eSewa or Khalti?",
        a: `Yes, both. Pick a pack or type any amount from Rs ${ADD_CREDITS_MIN.toLocaleString("en-US")} on the Billing page, then pay in NPR with eSewa or Khalti. The credits land as soon as the payment is confirmed.`,
    },
    {
        q: "Can I use the OpenAI SDK?",
        a: `Yes. Set the base URL to Boli's /v1 and use your Boli key. The chat endpoint is ${API_PATHS.chatCompletions} and the model list is ${API_PATHS.models}.`,
    },
    {
        q: "What are the rate limits?",
        a: `${RATE_LIMIT_PER_MIN} requests a minute per account, shared by every key and ${KURA.name}. Past that the API answers 429 rate_limit_exceeded; wait a few seconds and retry. Need more? Talk to us.`,
    },
    {
        q: "What happens to my data?",
        a: `API calls keep metadata only - model, token counts, cost, time and status - never your prompts or the answers. ${KURA.name} chats are saved to your account so you can come back to them, and you can delete them at any time.`,
    },
]

/**
 * The left column (title, one line, a contact link) stays pinned below the 64px nav while the questions scroll on the
 * right. Below lg it stacks and nothing is sticky. The landing passes nothing; a product page passes its own questions,
 * line and contact link (the same list feeds its FAQPage JSON-LD).
 */
export function FaqSection({
    className,
    items = FAQ,
    title = "Questions, answered",
    line = "What people ask before their first call - credits, payments, limits and what we keep.",
    contact = { label: "Still stuck? Write to us", href: ROUTES.contact },
}: {
    className?: string
    items?: FaqItem[]
    title?: string
    line?: string
    contact?: { label: string; href: string }
}) {
    return (
        <div className={cn("grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,8fr)] lg:gap-16", className)}>
            <div className="self-start lg:sticky lg:top-28">
                <Kicker>FAQ</Kicker>
                <h2 id="faq-title" className="mt-3 text-[40px] leading-[1.04] text-boli-ink sm:text-[48px] sm:leading-[1.02]" style={DISPLAY.h2}>
                    {title}
                </h2>
                <p className="mt-4 max-w-sm font-sans text-[15px] leading-7 text-boli-text">{line}</p>
                <AppLink
                    href={contact.href}
                    className={cn("mt-6 inline-flex cursor-pointer items-center gap-1.5 font-sans text-sm font-[450] text-boli-ink underline decoration-1 underline-offset-4", SKY_DECORATION)}
                >
                    {contact.label} <ArrowRight aria-hidden strokeWidth={1.75} className="size-3.5" />
                </AppLink>
            </div>
            <EditorialFaq items={items} defaultOpen="01" questionStyle={DISPLAY.h3} className="font-sans" />
        </div>
    )
}
