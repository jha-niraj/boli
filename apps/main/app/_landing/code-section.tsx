import { ArrowRight, BarChart3, Braces, KeyRound, MessagesSquare } from "lucide-react"
import { SITE } from "@repo/core/site"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { CodeTabs } from "@/components/brand/code-tabs"
import { KURA, RATE_LIMIT_PER_MIN } from "@/lib/boli"
import { buildSamples } from "@/lib/code-samples"
import { ROUTES } from "@/lib/navigation"
import { SectionHeading } from "./section-heading"

const CARDS = [
    { icon: MessagesSquare, title: KURA.name, body: "Try the model in the browser before you write a line of code.", href: ROUTES.kura },
    { icon: KeyRound, title: "API keys", body: "Create up to ten keys, name them, revoke one without touching the rest.", href: ROUTES.doc("authentication") },
    { icon: BarChart3, title: "Usage", body: `Every call with its tokens, cost and time. ${RATE_LIMIT_PER_MIN} requests a minute per account.`, href: ROUTES.doc("models") },
    { icon: Braces, title: "OpenAI-compatible", body: "Same request and response shape. Change the base URL and the key.", href: ROUTES.doc("chatcompletions") },
] as const

export function CodeSection() {
    const samples = buildSamples({ baseUrl: SITE.url })
    return (
        <section id="api" className="scroll-mt-20 border-y border-boli-line bg-white">
            <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1.25fr_1fr]">
                <div className="min-w-0">
                    <SectionHeading eyebrow="For developers" title="Your first call takes a minute">
                        <p>Create a key, set it as BOLI_API_KEY, and send a message. The sample asks a question in Romanized Nepali.</p>
                    </SectionHeading>
                    <CodeTabs samples={samples} className="mt-8" />
                    <Button asChild className="mt-6 h-11 gap-2 bg-boli-ink px-6 text-white hover:bg-boli-ink/90">
                        <AppLink href={ROUTES.signUp}>
                            Get your API key <ArrowRight className="h-4 w-4" aria-hidden />
                        </AppLink>
                    </Button>
                </div>
                <ul className="grid content-start gap-4 sm:grid-cols-2 lg:grid-cols-1 lg:pt-16">
                    {CARDS.map(({ icon: Icon, title, body, href }) => (
                        <li key={title}>
                            <AppLink href={href} className="group flex h-full cursor-pointer gap-4 rounded-2xl border border-boli-line bg-boli-ground/50 p-5 transition-colors hover:border-boli-ink/20 hover:bg-boli-ground">
                                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-boli-blue" aria-hidden />
                                <span>
                                    <span className="flex items-center gap-1.5 text-sm font-semibold text-boli-ink">
                                        {title}
                                        <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                                    </span>
                                    <span className="mt-1 block text-sm leading-6 text-boli-text">{body}</span>
                                </span>
                            </AppLink>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    )
}
