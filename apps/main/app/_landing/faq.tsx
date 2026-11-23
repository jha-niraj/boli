import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@repo/ui/components/ui/accordion"
import { API_PATHS, BOLI_CHAT, KURA, MICRO_PER_CREDIT, RATE_LIMIT_PER_MIN, WELCOME_CREDITS } from "@/lib/boli"
import { SectionHeading } from "./section-heading"

const FAQ = [
    {
        q: "What is Boli?",
        a: `Boli runs open AI models for Nepal. You can chat in ${KURA.name} or call the same model from your own code through an OpenAI-compatible API. You pay per token, in rupees.`,
    },
    {
        q: "Which model does it run?",
        a: `${BOLI_CHAT.id} is ${BOLI_CHAT.label}: ${BOLI_CHAT.base}. It reads ${BOLI_CHAT.languages.join(", ")}, with a context of ${BOLI_CHAT.contextTokens.toLocaleString("en-US")} tokens. We only run open models.`,
    },
    {
        q: "Is my data stored?",
        a: "For API calls we store metadata only: the model, token counts, cost, time and status. Never your prompts or the answers. Kura conversations are saved to your account so you can come back to them, and you can delete them.",
    },
    {
        q: "Does it understand Romanized Nepali?",
        a: "Yes. That is the reason Boli exists. The model reads Nepali in Latin letters, Devanagari, English and mixes of them, and tries to reply in the script you wrote in. It is a small model and still makes mistakes, so check anything important.",
    },
    {
        q: "How do credits work?",
        a: `1 credit = Rs 1. You get ${WELCOME_CREDITS} free credits when you verify your email. Each call costs its input and output tokens at the per-million price, worked out to a millionth of a credit (1 credit = ${MICRO_PER_CREDIT.toLocaleString("en-US")} micro-credits). Credits never expire. At zero, the API returns 402 until you add more.`,
    },
    {
        q: "How do I pay?",
        a: "Add credits from the Billing page and pay with eSewa or Khalti, in NPR. There is no subscription.",
    },
    {
        q: "Can I use the OpenAI SDK?",
        a: `Yes. Set the base URL to Boli's /v1 and use your Boli key. The chat endpoint is ${API_PATHS.chatCompletions} and the model list is ${API_PATHS.models}. Requests are limited to ${RATE_LIMIT_PER_MIN} a minute per account.`,
    },
] as const

export function Faq() {
    return (
        <section className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1fr_1.5fr]">
            <SectionHeading eyebrow="FAQ" title="Questions, answered" />
            <Accordion type="single" collapsible className="space-y-2">
                {FAQ.map((item, i) => (
                    <AccordionItem key={item.q} value={`q${i}`} className="rounded-2xl border border-boli-line bg-white px-5 dark:bg-white">
                        <AccordionTrigger className="cursor-pointer py-4 text-left text-base font-medium text-boli-ink dark:text-boli-ink">{item.q}</AccordionTrigger>
                        <AccordionContent className="text-sm leading-6 text-boli-text dark:text-boli-text">{item.a}</AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </section>
    )
}
