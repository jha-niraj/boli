import { ArrowRight, Check } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { exampleTurn, millionsFor } from "@/components/public/pricing"
import { ADD_CREDITS_MIN, BOLI_CHAT, RATE_LIMIT_PER_MIN, WELCOME_CREDITS } from "@/lib/boli"
import { ROUTES } from "@/lib/navigation"
import { SectionHeading } from "./section-heading"

export function Pricing() {
    const p = BOLI_CHAT.pricePerMillion
    const turn = exampleTurn()
    return (
        <section id="pricing" className="scroll-mt-20 border-y border-boli-line bg-white">
            <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
                <SectionHeading eyebrow="Pricing" title="Pay for tokens, in rupees" center>
                    <p>One credit is one rupee. Start free, top up when you need to, and see the cost of every call.</p>
                </SectionHeading>

                <div className="mt-14 grid gap-4 lg:grid-cols-3">
                    <div className="flex flex-col rounded-2xl border border-boli-line bg-boli-ground p-6 sm:p-8">
                        <h3 className="text-sm font-semibold text-boli-ink">Start free</h3>
                        <p className="mt-4 font-serif text-5xl text-boli-ink">
                            {WELCOME_CREDITS} <span className="text-2xl text-boli-muted">credits</span>
                        </p>
                        <p className="mt-2 text-sm text-boli-text">Worth Rs {WELCOME_CREDITS}, added when you verify your email. No card.</p>
                        <Button asChild className="mt-auto h-11 gap-2 bg-boli-crimson text-white hover:bg-boli-crimson-ink">
                            <AppLink href={ROUTES.signUp}>
                                Claim your credits <ArrowRight className="h-4 w-4" aria-hidden />
                            </AppLink>
                        </Button>
                    </div>

                    <div className="rounded-2xl border border-boli-line bg-white p-6 sm:p-8">
                        <div className="flex items-center justify-between gap-2">
                            <h3 className="font-mono text-sm text-boli-ink">{BOLI_CHAT.id}</h3>
                            <span className="text-xs text-boli-muted">{BOLI_CHAT.label}</span>
                        </div>
                        <dl className="mt-6 divide-y divide-boli-line">
                            <div className="flex items-baseline justify-between py-3">
                                <dt className="text-sm text-boli-text">Input, per 1M tokens</dt>
                                <dd className="font-serif text-3xl text-boli-ink">Rs {p.input}</dd>
                            </div>
                            <div className="flex items-baseline justify-between py-3">
                                <dt className="text-sm text-boli-text">Output, per 1M tokens</dt>
                                <dd className="font-serif text-3xl text-boli-ink">Rs {p.output}</dd>
                            </div>
                        </dl>
                        <p className="mt-3 text-xs leading-5 text-boli-muted">Thinking tokens count as output. Kura and the API cost the same.</p>
                    </div>

                    <div className="rounded-2xl border border-boli-line bg-white p-6 sm:p-8">
                        <h3 className="text-sm font-semibold text-boli-ink">What Rs {WELCOME_CREDITS} buys</h3>
                        <ul className="mt-5 space-y-4">
                            <li>
                                <p className="font-serif text-3xl text-boli-ink">{millionsFor(WELCOME_CREDITS, p.input)}M</p>
                                <p className="text-xs text-boli-muted">input tokens, or</p>
                            </li>
                            <li>
                                <p className="font-serif text-3xl text-boli-ink">about {millionsFor(WELCOME_CREDITS, p.output)}M</p>
                                <p className="text-xs text-boli-muted">output tokens, or</p>
                            </li>
                            <li>
                                <p className="font-serif text-3xl text-boli-ink">{turn.perWelcome.toLocaleString("en-US")}</p>
                                <p className="text-xs text-boli-muted">
                                    chat turns of {turn.input} tokens in and {turn.output} out, at {turn.rupees} each
                                </p>
                            </li>
                        </ul>
                    </div>
                </div>

                <ul className="mx-auto mt-10 grid max-w-4xl gap-3 text-sm text-boli-text sm:grid-cols-2">
                    {[
                        `Add credits any time, from Rs ${ADD_CREDITS_MIN}, with eSewa or Khalti`,
                        "Credits never expire",
                        `${RATE_LIMIT_PER_MIN} requests per minute per account, shared by your keys and Kura`,
                        "No subscription, no minimum spend",
                    ].map((line) => (
                        <li key={line} className="flex items-start gap-2.5">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-boli-blue" aria-hidden />
                            {line}
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    )
}
