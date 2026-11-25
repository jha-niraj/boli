import type { Metadata } from "next"
import { ArrowRight, Brain } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { cn } from "@repo/ui/lib/utils"
import { KuraScene } from "@repo/brand/art/kura/kura-scene"
import { KURA_BANNER_W, KURA_H, KURA_W } from "@repo/brand/art/kura/scene"
import { BoliLogo } from "@repo/brand/boli-logo"
import { HighlightedCodeTabs } from "@repo/brand/code-tabs-server"
import { PillButton } from "@repo/brand/pill-button"
import { SKY } from "@repo/brand/sky"
import { DISPLAY } from "@repo/brand/type"
import { BOLI_CHAT, KURA, KURA_DEFAULTS, KURA_LIMITS, RATE_LIMIT_PER_MIN, WELCOME_CREDITS } from "@repo/boli"
import { buildSamples } from "@repo/boli/code-samples"
import { CtaBand } from "@/app/_landing/cta-band"
import { JsonLd } from "@/components/json-ld"
import { FaqSection } from "@/components/public/faq-section"
import { LanguageExchanges, type Exchange } from "@/components/public/language-exchanges"
import { PixelIcon } from "@/components/public/pixel-icon"
import { exampleTurn } from "@/components/public/pricing"
import { PricingPacks } from "@/components/public/pricing-packs"
import { DhakaBand, ProductHero } from "@/components/public/product-hero"
import { Band, Kicker, Lead, SectionTitle } from "@/components/public/section"
import { SKY_DECORATION, SKY_SOFT_BG, SKY_TEXT } from "@/components/public/tokens"
import { API_ORIGIN, KEYS_URL, KURA_URL, SIGNUP_URL } from "@/lib/app-links"
import { ROUTES } from "@/lib/routes"
import { breadcrumbSchema, faqSchema, kuraServiceSchema } from "@/lib/schema"
import { pageMeta } from "@/lib/seo"

/*
 * /kura (owner, 2026-11-25, round 2 "show, don't tell"): Kura's landing page - the /jawaf treatment, shorter. A
 * full-screen hero with the elder and the student talking by the stupa, then: the exchanges per script, Think mode as a
 * mock reply, settings as a mock panel beside the code tabs (the two end at the same bottom), how it is built (the open
 * model and what we add, as a model card - owner 2026-11-25: replaces the "your chats" mock, which read too light),
 * pricing as one card plus the packs, FAQ and the ask. Kura is LIVE: Service JSON-LD (kuraServiceSchema) + BreadcrumbList + FAQPage. Prices from
 * @repo/boli only.
 */

export const metadata: Metadata = pageMeta({
    title: `${KURA.name} - chat in Nepali, English or both`,
    description: `${KURA.subtitle}. Romanized Nepali, Devanagari, English or the mix, on Boli's open model. ${WELCOME_CREDITS} free credits, then pay per use in rupees.`,
    path: ROUTES.kura,
})

const P = BOLI_CHAT.pricePerMillion
const TURN = exampleTurn()

const EXCHANGES: readonly Exchange[] = [
    {
        label: "Romanized Nepali",
        q: "mero exam sakiyo, aba k garne?",
        a: "Badhai cha! Aaja ek din aaram gara. Result aauna aghi naya kura sikna suru garna sakchau - coding, driving, ki guitar?",
    },
    {
        label: "Nepali (Devanagari)",
        q: "नेपालको सबैभन्दा लामो नदी कुन हो?",
        a: "कर्णाली नदी नेपालको सबैभन्दा लामो नदी हो।",
    },
    {
        label: "English",
        q: "Explain what an API key is in two sentences.",
        a: "An API key is a secret string that tells a service who is calling it. You send it with each request, and the service uses it to check access and count your usage.",
    },
    {
        label: "The mix",
        q: "Tomorrow ko meeting cancel bhayo, team lai inform garne message lekhdeu.",
        a: "Hi team, bholi ko meeting cancel bhayo. Naya time pachi share garchhu. Thank you!",
    },
]

/** Where a default sits in its range, as a percentage of the slider. */
function at(value: number, range: { min: number; max: number }): number {
    return Math.round(((value - range.min) / (range.max - range.min)) * 100)
}

const SLIDERS: readonly { name: string; value: string; pct: number; low: string; high: string }[] = [
    { name: "Temperature", value: String(KURA_DEFAULTS.temperature), pct: at(KURA_DEFAULTS.temperature, KURA_LIMITS.temperature), low: "Steady", high: "Varied" },
    { name: "Max tokens", value: KURA_DEFAULTS.maxTokens.toLocaleString("en-US"), pct: at(KURA_DEFAULTS.maxTokens, KURA_LIMITS.maxTokens), low: "Short", high: "Long, thinking included" },
    { name: "Top-p", value: String(KURA_DEFAULTS.topP), pct: at(KURA_DEFAULTS.topP, KURA_LIMITS.topP), low: "Narrow", high: "Wide" },
    { name: "Top-k", value: String(KURA_DEFAULTS.topK), pct: at(KURA_DEFAULTS.topK, KURA_LIMITS.topK), low: "Few words", high: "Many" },
]

/** The model card in "How it is built": facts only, every value from @repo/boli. */
const MODEL_ROWS: readonly { k: string; v: string; mono?: boolean }[] = [
    { k: "Base", v: "Gemma 4 E4B, instruction-tuned" },
    { k: "Weights", v: `Open, ${BOLI_CHAT.licence}` },
    { k: "Precision", v: "4-bit, quantized" },
    { k: "Context", v: `${BOLI_CHAT.contextTokens.toLocaleString("en-US")} tokens` },
    { k: "Languages", v: BOLI_CHAT.languages.join(", ") },
    { k: "Interface", v: "OpenAI-compatible /v1" },
]

/** What Boli adds on top of the open weights - each one true of Kura today. */
const BUILD_POINTS: readonly { title: string; line: string }[] = [
    { title: "Open weights, nothing closed", line: "Every Kura reply comes from an open model. No closed AI company sits behind it." },
    { title: "Hosted by us", line: "We serve the model ourselves, so your chats stay between you and Boli." },
    { title: "Tuned for how Nepal types", line: "Instructions tested on Romanized Nepali keep replies in the script you wrote in." },
]

const KURA_FAQ: readonly { q: string; a: string }[] = [
    {
        q: `What is ${KURA.name}?`,
        a: `${KURA.name} is Boli's chat. ${KURA.subtitle}: Romanized Nepali, Devanagari, English or a mix of them in one line. ${KURA.meaning}.`,
    },
    {
        q: "Which model answers?",
        a: `${BOLI_CHAT.id}, our open model - ${BOLI_CHAT.label}, open weights under ${BOLI_CHAT.licence}. Boli runs only open models; nothing closed sits behind ${KURA.name}.`,
    },
    {
        q: "Does it reply in Romanized Nepali?",
        a: "Yes. It tries to reply in the same language and script you wrote in, so a Romanized question gets a Romanized answer, not Devanagari. It is a small model and still makes mistakes, so check anything important.",
    },
    {
        q: "What does it cost?",
        a: `You get ${WELCOME_CREDITS} free credits when you verify your email (1 credit = Rs 1). After that each reply costs its tokens: Rs ${P.input} per million in, Rs ${P.output} per million out. A typical short turn costs about ${TURN.rupees}, so the free credits cover about ${TURN.perWelcome.toLocaleString("en-US")} of them.`,
    },
    {
        q: "What is Think mode?",
        a: `With Think on, the model works the question through before it answers and you can open the steps above the reply. It helps with sums and plans, takes longer, and the thinking counts as output tokens. It is ${KURA_DEFAULTS.think ? "on" : "off"} by default.`,
    },
    {
        q: "What do the settings do?",
        a: `The instructions (the system prompt) say who ${KURA.name} should be; Boli's default keeps replies short and in your script. Temperature (${KURA_LIMITS.temperature.min} to ${KURA_LIMITS.temperature.max}) makes replies steadier or more varied, max tokens caps the reply with its thinking, and top-p and top-k set how widely the model picks its next word. They apply to the next message.`,
    },
    {
        q: "Can I use the same chat from my code?",
        a: "Yes. The Code tab beside the chat shows the conversation and your settings as an API call in cURL, Python, TypeScript, JavaScript or Go. Create a key, paste it, and it runs against the same model.",
    },
    {
        q: "Are my chats private?",
        a: `Your ${KURA.name} chats are saved to your account so you can come back to them, and you can delete any of them at any time.`,
    },
    {
        q: "Is there a limit?",
        a: `${RATE_LIMIT_PER_MIN} messages a minute per account, shared with your API keys. When your credits reach zero, add more from Billing with eSewa or Khalti.`,
    },
]

const CARD_SHADOW = "shadow-[0_1px_2px_rgba(20,20,20,0.05),0_18px_40px_-24px_rgba(20,20,20,0.3)]"

export default function KuraPage() {
    const samples = buildSamples({ baseUrl: API_ORIGIN })
    return (
        <>
            <JsonLd
                data={[
                    kuraServiceSchema(),
                    breadcrumbSchema([
                        { name: "Products", path: ROUTES.products },
                        { name: KURA.name, path: ROUTES.kura },
                    ]),
                    faqSchema(KURA_FAQ),
                ]}
            />
            <ProductHero
                id="kura-hero"
                badge={
                    <>
                        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-emerald-600" />
                        <span className="truncate">{KURA.name} - कुरा, conversation - live</span>
                    </>
                }
                title={
                    <>
                        Ask in the words <span className={SKY_TEXT}>you already use</span>
                    </>
                }
                line={`${KURA.subtitle}. It answers in the script you wrote in, on Boli's own open model.`}
                actions={
                    <>
                        <PillButton asChild size="lg">
                            <a href={SIGNUP_URL}>
                                Sign up free <ArrowRight aria-hidden strokeWidth={1.75} />
                            </a>
                        </PillButton>
                        <PillButton asChild size="lg" variant="secondary" className="border-transparent">
                            <a href={KURA_URL}>Open {KURA.name}</a>
                        </PillButton>
                    </>
                }
                note={`${WELCOME_CREDITS} free credits when you verify your email. No card.`}
                art={<KuraScene wide preserve="xMidYMax slice" />}
                artAspect={`${KURA_BANNER_W} / ${KURA_H}`}
                phoneArt={<KuraScene preserve="xMidYMax slice" />}
                phoneAspect={`${KURA_W} / ${KURA_H}`}
            />

            <Band id="what" tone="white" labelledBy="what-title">
                <Kicker>What it is</Kicker>
                <SectionTitle>
                    <span id="what-title">A chat that reads the way Nepal types</span>
                </SectionTitle>
                <Lead>Latin letters, Devanagari, English - or switch halfway through. Example replies, shortened.</Lead>
                <LanguageExchanges items={EXCHANGES} avatar className="mt-12 sm:mt-14" />
            </Band>

            <DhakaBand />

            <Band id="think" labelledBy="think-title" className="border-t-0">
                <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
                    <div className="min-w-0">
                        <Kicker>Think mode</Kicker>
                        <SectionTitle>
                            <span id="think-title">Let it think before it answers</span>
                        </SectionTitle>
                        <Lead>For sums, plans and anything with steps. The steps show above the reply.</Lead>
                        <ul data-reveal="3" className="mt-6 flex flex-wrap gap-2">
                            {[`${KURA_DEFAULTS.think ? "On" : "Off"} by default`, "Takes longer", "Thinking counts as output"].map((t) => (
                                <li key={t} className="inline-flex h-8 items-center rounded-full border border-boli-line bg-white px-3 text-xs text-boli-ink">
                                    {t}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div data-reveal="1" className={cn("min-w-0 rounded-3xl border border-boli-line bg-white p-5 font-sans sm:p-6", CARD_SHADOW)}>
                        <div className="flex justify-end">
                            <p className="max-w-[85%] rounded-2xl rounded-br-md bg-boli-ground px-3.5 py-2 text-sm leading-6 text-boli-ink">2 kg chamal ko Rs 180, 5 kg ko kati?</p>
                        </div>
                        <div className={cn("mt-4 rounded-2xl px-4 py-3", SKY_SOFT_BG)}>
                            <p className={cn("flex items-center gap-1.5 text-xs", SKY_TEXT)}>
                                <Brain aria-hidden strokeWidth={1.75} className="size-3.5" /> Thought in 3 steps
                            </p>
                            <ol className="mt-2 grid gap-1 text-[13px] leading-5 text-boli-text">
                                <li>1. 2 kg = Rs 180, so 1 kg = Rs 90.</li>
                                <li>2. 5 kg = 5 x 90.</li>
                                <li>3. 5 x 90 = 450.</li>
                            </ol>
                        </div>
                        <div className="mt-4 flex items-start gap-2">
                            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-boli-line">
                                <BoliLogo wordmark={false} size={11} />
                            </span>
                            <p className="min-w-0 text-sm leading-6 text-boli-ink">5 kg chamal ko Rs 450 parcha.</p>
                        </div>
                    </div>
                </div>
            </Band>

            <Band id="code" tone="white" labelledBy="code-title">
                <Kicker>Settings and code</Kicker>
                <SectionTitle>
                    <span id="code-title">Tune it, then take it into your code</span>
                </SectionTitle>
                <Lead>Settings apply to the next message. The Code tab turns your chat into an API call.</Lead>
                {/* The settings card sets the row's height; the code fills it and scrolls inside, so both end at the same bottom. */}
                <div className="mt-12 grid gap-4 sm:mt-14 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:items-stretch lg:gap-6">
                    <div data-reveal="1" className={cn("min-w-0 rounded-3xl border border-boli-line bg-white p-5 font-sans sm:p-6", CARD_SHADOW)}>
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-[450] text-boli-ink">Settings</p>
                            <span className="text-xs text-boli-muted">Defaults</span>
                        </div>
                        <div className="mt-4 grid gap-1.5">
                            <p className="text-xs text-boli-muted">Instructions</p>
                            <p className="truncate rounded-2xl bg-boli-ground px-3 py-2 text-xs text-boli-ink">Boli&apos;s default - short replies, in your script</p>
                        </div>
                        <div className="mt-4 grid gap-3.5">
                            {SLIDERS.map((s) => (
                                <div key={s.name} className="grid gap-1.5">
                                    <div className="flex items-baseline justify-between gap-2">
                                        <p className="text-xs text-boli-ink">{s.name}</p>
                                        <p className="font-mono text-xs text-boli-muted">{s.value}</p>
                                    </div>
                                    <span aria-hidden className="relative block h-1.5 rounded-full bg-boli-ground ring-1 ring-boli-line">
                                        <span className="absolute inset-y-0 left-0 rounded-full bg-boli-sky" style={{ width: `${s.pct}%` }} />
                                        <span
                                            className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-boli-sky bg-white"
                                            style={{ left: `${s.pct}%` }}
                                        />
                                    </span>
                                    <div className="flex justify-between gap-2 text-xs text-boli-muted">
                                        <span>{s.low}</span>
                                        <span className="truncate">{s.high}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-5 flex flex-wrap gap-2">
                            <PillButton asChild size="sm">
                                <a href={KEYS_URL}>
                                    Get an API key <ArrowRight aria-hidden />
                                </a>
                            </PillButton>
                            <PillButton asChild size="sm" variant="secondary">
                                <AppLink href={ROUTES.doc("quickstart")}>Quickstart</AppLink>
                            </PillButton>
                        </div>
                    </div>
                    {/* lg: the code is absolute inside its cell, so only the settings card sizes the row. */}
                    <div data-reveal="2" className="min-w-0 lg:relative">
                        <HighlightedCodeTabs samples={samples} fill className={cn("h-[19rem] min-w-0 rounded-3xl sm:h-[22rem] lg:absolute lg:inset-0 lg:h-auto", CARD_SHADOW)} />
                    </div>
                </div>
            </Band>

            <Band id="built" labelledBy="built-title">
                <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
                    <div className="min-w-0">
                        <Kicker>How it is built</Kicker>
                        <SectionTitle>
                            <span id="built-title">An open model, run by us</span>
                        </SectionTitle>
                        <Lead>Open weights anyone can inspect, served from our own servers, shaped for Nepali.</Lead>
                        <ol data-reveal="2" className="mt-8 grid gap-5">
                            {BUILD_POINTS.map((p, i) => (
                                <li key={p.title} className="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)] gap-x-3">
                                    <span className={cn("pt-0.5 font-mono text-xs", SKY_TEXT)}>{String(i + 1).padStart(2, "0")}</span>
                                    <div className="min-w-0">
                                        <p className="text-[15px] font-[450] text-boli-ink">{p.title}</p>
                                        <p className="mt-1 text-sm leading-6 text-boli-text">{p.line}</p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </div>
                    <div data-reveal="1" className={cn("min-w-0 overflow-hidden rounded-3xl border border-boli-line bg-white font-sans", CARD_SHADOW)}>
                        <div className="flex min-w-0 items-center justify-between gap-3 border-b border-boli-line px-5 py-4 sm:px-6" style={{ background: `linear-gradient(140deg, ${SKY.soft}, ${SKY.wash})` }}>
                            <div className="flex min-w-0 items-center gap-3">
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-boli-line">
                                    <BoliLogo wordmark={false} size={15} />
                                </span>
                                <div className="min-w-0">
                                    <p className="truncate font-mono text-sm text-boli-ink">{BOLI_CHAT.id}</p>
                                    <p className="truncate text-xs text-boli-text">The model behind {KURA.name} and the API</p>
                                </div>
                            </div>
                            <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-white px-2.5 text-xs text-boli-ink ring-1 ring-boli-line">
                                <span aria-hidden className="size-1.5 rounded-full bg-emerald-600" /> Open weights
                            </span>
                        </div>
                        <dl className="divide-y divide-boli-line">
                            {MODEL_ROWS.map((r) => (
                                <div key={r.k} className="grid min-w-0 grid-cols-[6.5rem_minmax(0,1fr)] gap-3 px-5 py-3 text-sm sm:px-6">
                                    <dt className="text-boli-muted">{r.k}</dt>
                                    <dd className={cn("min-w-0 text-boli-ink", r.mono && "font-mono text-[13px]")}>{r.v}</dd>
                                </div>
                            ))}
                        </dl>
                        <div className="border-t border-boli-line px-5 py-4 sm:px-6">
                            <AppLink
                                href={ROUTES.model(BOLI_CHAT.id)}
                                className={cn("inline-flex cursor-pointer items-center gap-1.5 text-sm font-[450] text-boli-ink underline decoration-1 underline-offset-4", SKY_DECORATION)}
                            >
                                Read the model card <ArrowRight aria-hidden strokeWidth={1.75} className="size-3.5" />
                            </AppLink>
                        </div>
                    </div>
                </div>
            </Band>

            <DhakaBand />

            <Band id="pricing" tone="white" labelledBy="pricing-title" className="border-t-0">
                <Kicker>Pricing</Kicker>
                <SectionTitle>
                    <span id="pricing-title">{WELCOME_CREDITS} free credits, then pay per use</span>
                </SectionTitle>
                <Lead>1 credit = Rs 1. Credits never expire. No subscription. Same credits as the API.</Lead>
                <div data-reveal="2" className="mt-12 grid overflow-hidden rounded-3xl border border-boli-line sm:mt-14 md:grid-cols-3">
                    <div className="flex min-w-0 flex-col justify-between gap-6 p-6 sm:p-8" style={{ background: `linear-gradient(140deg, ${SKY.soft}, ${SKY.wash})` }}>
                        <p className="text-sm text-boli-text">A short turn costs about</p>
                        <p className="text-[48px] leading-none text-boli-ink sm:text-[56px]" style={DISPLAY.display}>
                            {TURN.rupees}
                        </p>
                        <p className="text-sm text-boli-text">
                            {TURN.input} tokens in, {TURN.output} out
                        </p>
                    </div>
                    <div className="flex min-w-0 flex-col justify-between gap-6 border-t border-boli-line bg-white p-6 sm:p-8 md:border-l md:border-t-0">
                        <PixelIcon id="chat" className="size-8" />
                        <p className="text-[34px] leading-none text-boli-ink" style={DISPLAY.h2}>
                            ~{TURN.perWelcome.toLocaleString("en-US")}
                        </p>
                        <p className="text-sm text-boli-text">turns from the free credits</p>
                    </div>
                    <div className="flex min-w-0 flex-col justify-between gap-6 border-t border-boli-line bg-white p-6 sm:p-8 md:border-l md:border-t-0">
                        <PixelIcon id="code" className="size-8" />
                        <div className="grid gap-1 text-sm text-boli-ink">
                            <p>
                                Rs {P.input} <span className="text-boli-muted">per 1M in</span>
                            </p>
                            <p>
                                Rs {P.output} <span className="text-boli-muted">per 1M out</span>
                            </p>
                        </div>
                        <p className="font-mono text-xs text-boli-muted">{BOLI_CHAT.id}</p>
                    </div>
                </div>
                <div className="mt-12 sm:mt-14">
                    <PricingPacks />
                </div>
                <p className="mt-6 text-sm text-boli-muted">
                    <AppLink href={ROUTES.doc("models")} className={cn("cursor-pointer text-boli-ink underline decoration-1 underline-offset-4", SKY_DECORATION)}>
                        How credits and limits work
                    </AppLink>
                </p>
            </Band>

            <Band id="faq" labelledBy="faq-title">
                <FaqSection items={[...KURA_FAQ]} title={`Questions about ${KURA.name}`} line="What people ask before their first chat." />
            </Band>

            <CtaBand
                tone="white"
                title={`Start chatting with ${WELCOME_CREDITS} free credits`}
                line="No card. Verify your email and ask your first question in a minute."
                primary={{ label: "Sign up free", href: SIGNUP_URL }}
                secondary={{ label: `Open ${KURA.name}`, href: KURA_URL }}
            />
        </>
    )
}
