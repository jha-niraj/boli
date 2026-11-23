import { Banknote, Code2, Gift, Lock, MessagesSquare, Mountain } from "lucide-react"
import { BOLI_CHAT, KURA, WELCOME_CREDITS } from "@/lib/boli"
import { SectionHeading } from "./section-heading"

const FEATURES = [
    {
        icon: Mountain,
        title: "An open model",
        body: `${BOLI_CHAT.label}, ${BOLI_CHAT.licence}. No closed model behind it, ever. ${BOLI_CHAT.blurb}`,
    },
    {
        icon: Code2,
        title: "OpenAI-compatible API",
        body: "Point the OpenAI SDK at Boli's base URL and keep your code. Python, JavaScript or plain cURL.",
    },
    {
        icon: MessagesSquare,
        title: KURA.name,
        body: `${KURA.subtitle}. ${KURA.meaning}. Your chats are saved so you can pick them up later.`,
    },
    {
        icon: Gift,
        title: `${WELCOME_CREDITS} free credits`,
        body: `Verify your email and get ${WELCOME_CREDITS} credits to try Kura and the API. No card needed.`,
    },
    {
        icon: Banknote,
        title: "Priced in rupees",
        body: "1 credit = Rs 1. You pay per token, in NPR, with eSewa or Khalti. Credits never expire.",
    },
    {
        icon: Lock,
        title: "Your API data stays yours",
        body: "For API calls we keep only metadata - tokens, cost, timing. Never your prompts or the answers.",
    },
] as const

export function Features() {
    return (
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
            <SectionHeading eyebrow="What Boli does" title="One open model. Two ways to use it.">
                <p>Talk to it in Kura, or build on it with an API that already speaks the OpenAI format. Same model, same price, both ways.</p>
            </SectionHeading>
            <ul className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-boli-line bg-boli-line sm:grid-cols-2 lg:grid-cols-3">
                {FEATURES.map(({ icon: Icon, title, body }) => (
                    <li key={title} className="bg-white p-6 sm:p-8">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-boli-ground text-boli-ink ring-1 ring-boli-line">
                            <Icon className="h-5 w-5" aria-hidden />
                        </span>
                        <h3 className="mt-5 text-base font-semibold text-boli-ink">{title}</h3>
                        <p className="mt-2 text-sm leading-6 text-boli-text">{body}</p>
                    </li>
                ))}
            </ul>
        </section>
    )
}
