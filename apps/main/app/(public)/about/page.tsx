import type { Metadata } from "next"
import type { ReactNode } from "react"
import { ArrowRight } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { cn } from "@repo/ui/lib/utils"
import { ArtRoot } from "@/components/art/art-root"
import { TeamSection } from "@/components/art/team/team"
import { ValleyHero } from "@/components/art/valley/valley"
import { PixelVignette } from "@/components/art/vignettes/vignette"
import { PillButton } from "@/components/brand/pill-button"
import { DISPLAY } from "@/components/brand/type"
import { PageHero } from "@/components/public/page-hero"
import { Band, Kicker, Lead, revealStep, SectionTitle } from "@/components/public/section"
import { StoryScene } from "@/components/public/story-scene"
import { SKY_SOFT_BG, SKY_TEXT } from "@/components/public/tokens"
import { BOLI_CHAT, BRAND, KURA, RATE_LIMIT_PER_MIN, WELCOME_CREDITS } from "@/lib/boli"
import { ROUTES } from "@/lib/navigation"

/*
 * About (round 4, owner 2026-11-24): an editorial "we" story with real findings and no company or person names. The
 * hero, then chapters - the problem, the pain points, what we found, how we decided, where we are today - each beside
 * its own pixel scene; then the roadmap, the principles and the team. Contact has its own page (/contact).
 */

export const metadata: Metadata = {
    title: "About",
    description:
        "Why Boli exists: people in Nepal type Romanized Nepali, English and both, and no platform let you simply call an open model for it in rupees. So we built one.",
    alternates: { canonical: "/about" },
}

/** The team section shows placeholder people ("Your name here") for now. Set to false to hide it until real names exist. */
const SHOW_TEAM = true

const TYPED = [
    { how: "Romanized", line: "mero exam sakiyo, aba k garne?" },
    { how: "English", line: "My exam is over, what should I do now?" },
    { how: "Both at once", line: "exam sakiyo, now what? kei idea cha?" },
] as const

const PAINS = [
    {
        title: "No open model you could simply call",
        line: "Open weights that read Nepali exist. A hosted one, with a key you get in a minute and a price on the page, did not.",
    },
    {
        title: "Local models need hardware and upkeep",
        line: "A GPU, enough memory, updates and someone to keep it running. A laptop runs out of memory long before it runs a product.",
    },
    {
        title: "Businesses do not want to run models",
        line: "A shop or a startup wants an answer from an API, not a server to look after.",
    },
    {
        title: "Foreign APIs are priced in dollars",
        line: "A dollar card, an exchange rate and a bill you cannot plan in rupees - before you know if the model reads Romanized Nepali at all.",
    },
] as const

type Mark = "today" | "next" | "later" | "no"

/** The fourteen checks (from our survey, November 2026) and where Boli stands on each today. */
const CHECKS: readonly { name: string; boli: Mark }[] = [
    { name: "Instant self-serve API key", boli: "today" },
    { name: "Free credits to start", boli: "today" },
    { name: "Public prices in local currency", boli: "today" },
    { name: "A playground to try the model", boli: "today" },
    { name: "Public docs", boli: "today" },
    { name: "SDKs, or an OpenAI-compatible API", boli: "today" },
    { name: "A model that reads Nepali", boli: "today" },
    { name: "Published rate limits", boli: "today" },
    { name: "Document reading (OCR)", boli: "next" },
    { name: "Speech to text with streaming", boli: "later" },
    { name: "Text to speech with voices", boli: "later" },
    { name: "Translation and transliteration", boli: "no" },
    { name: "Higher-level products (agents, dubbing)", boli: "no" },
    { name: "A startup programme", boli: "no" },
]

const MARK_LABEL: Record<Mark, string> = { today: "Boli today", next: "Next", later: "Later", no: "Not yet" }

const DECISIONS = [
    {
        title: "Open models only",
        line: "Nothing closed behind Boli. If we say open, it is open weights you could run yourself - we just run them for you.",
    },
    {
        title: "Tested on the way people type",
        line: `We put a short list of open models, small enough to serve cheaply, through the same English, Romanized and mixed prompts. ${BOLI_CHAT.label} gave the best answers for what it costs to run, so it became ${BOLI_CHAT.id}.`,
    },
    {
        title: "OpenAI-compatible",
        line: "The SDKs people already use work with a new base URL and a Boli key. No new client to learn, nothing to rewrite.",
    },
    {
        title: "Rupees, eSewa and Khalti",
        line: `Prices per million tokens in NPR, on the page. ${WELCOME_CREDITS} free credits to start, top-ups with eSewa or Khalti, credits that never expire.`,
    },
    {
        title: "The API stores no prompts",
        line: "API calls keep metadata only - model, tokens, cost, time and status. Never your prompts or the answers.",
    },
] as const

const ROADMAP: readonly { stage: string; title: string; line: string; now?: boolean }[] = [
    { stage: "Now", title: "Chat", line: `${KURA.name} and the chat completions API on ${BOLI_CHAT.id}, an open model that reads Romanized Nepali.`, now: true },
    { stage: "Next", title: "Document intelligence", line: "Read images and PDFs in Nepali, English or both - a scanned bill becomes text, or fields as JSON." },
    { stage: "Later", title: "Speech", line: "Talk in Nepali and get text back; hear answers read aloud in a Nepali voice." },
    { stage: "Later", title: "Fine-tuning and hosting", line: "Your data, an open model tuned on it, and Boli running it for you." },
]

const PRINCIPLES: readonly { title: string; line: string }[] = [
    { title: "Open models only", line: "No closed model behind Boli, ever. If we say open, it is open weights you could run yourself." },
    { title: "Priced in rupees", line: `Per-token prices in NPR, on the page. ${WELCOME_CREDITS} free credits, eSewa and Khalti, credits that never expire.` },
    { title: "The API stores no prompts", line: "API calls keep metadata only - model, tokens, cost, time. Never your prompts or the answers." },
    { title: "Said plainly", line: `Limits stated up front - ${RATE_LIMIT_PER_MIN} requests a minute - and the model's weak spots named, not hidden.` },
]

export default function AboutPage() {
    const p = BOLI_CHAT.pricePerMillion
    return (
        <>
            <PageHero
                kicker={`About ${BRAND.name}`}
                title={
                    <>
                        We are building AI that speaks the way <span className={SKY_TEXT}>Nepal types</span>
                    </>
                }
                line="An open model you can use today, in your own words, paid for in rupees. This is how we got here, what we found on the way, and what comes next."
                artAspect="160 / 84"
                art={<ValleyHero variant="gold" crop="wide" preserve="xMidYMax slice" />}
            >
                <div className="flex flex-wrap gap-3">
                    <PillButton asChild>
                        {/* An in-page jump, not a navigation: a plain anchor. */}
                        <a href="#problem">
                            Read the story <ArrowRight aria-hidden />
                        </a>
                    </PillButton>
                    <PillButton asChild variant="secondary">
                        <AppLink href={ROUTES.contact}>Write to us</AppLink>
                    </PillButton>
                </div>
            </PageHero>

            <Chapter
                id="problem"
                n="01"
                kicker="The problem"
                title="Nepal types in three ways at once"
                art={<StoryScene index={0} />}
                body={
                    <>
                        <p>
                            People here write Romanized Nepali, English, Devanagari - and very often all of them in one line. That is how a customer messages a
                            shop and how a student asks a question.
                        </p>
                        <p>Most models answer that in Devanagari, switch to English, or miss the meaning. The way people actually type was the gap.</p>
                        <ul className="grid gap-2 pt-1">
                            {TYPED.map((t, i) => (
                                <li key={t.how} data-reveal={revealStep(i + 2)} className="flex min-w-0 flex-col gap-0.5 rounded-2xl border border-boli-line bg-white px-4 py-2.5">
                                    <span className={cn("text-xs", SKY_TEXT)}>{t.how}</span>
                                    <span className="font-mono text-[13px] text-boli-ink">{t.line}</span>
                                </li>
                            ))}
                        </ul>
                    </>
                }
            />

            <Chapter
                id="pains"
                n="02"
                kicker="The pain points"
                title="Why nobody could simply build on it"
                tone="white"
                flip
                art={<StoryScene index={1} />}
                body={
                    <ol className="grid gap-4">
                        {PAINS.map((pain, i) => (
                            <li key={pain.title} data-reveal={revealStep(i + 1)} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
                                <span className="pt-0.5 font-mono text-xs text-boli-muted">{String(i + 1).padStart(2, "0")}</span>
                                <div className="min-w-0">
                                    <p className="text-[19px] leading-snug text-boli-ink" style={DISPLAY.card}>
                                        {pain.title}
                                    </p>
                                    <p className="mt-1 text-sm leading-6 text-boli-text">{pain.line}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                }
            />

            <Band id="found" labelledBy="found-title">
                <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-14">
                    <div className="min-w-0">
                        <Kicker>03 - What we found</Kicker>
                        <SectionTitle>
                            <span id="found-title">The best platform we found scored 5 of 14</span>
                        </SectionTitle>
                        <Lead>
                            In November 2026 we checked every Nepal-based AI platform we could find - nineteen of them - against fourteen things a developer
                            needs to start on their own. The best scored 5 of 14. The next ones scored 2 or 2.5, each covering a different slice. None offered a
                            self-serve key, free credits, public prices in rupees and docs together.
                        </Lead>
                        <p data-reveal="3" className="mt-4 max-w-2xl text-sm leading-6 text-boli-muted">
                            We read public pages only, with no sign-ups, so a few scores may be generous. We name no one: the point is the gap, not the
                            companies.
                        </p>
                    </div>
                    <Frame>
                        <PixelVignette id="aboutScorecard" className="block aspect-[96/60] h-auto w-full" />
                    </Frame>
                </div>
                <div className="mt-12 sm:mt-14">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="text-2xl leading-tight text-boli-ink" style={DISPLAY.h3}>
                            The fourteen checks
                        </h3>
                        <p className="text-xs text-boli-muted">And where Boli stands on each today</p>
                    </div>
                    <ol className="mt-5 grid overflow-hidden rounded-3xl border border-boli-line bg-boli-line sm:grid-cols-2 [&>li]:bg-white gap-px">
                        {CHECKS.map((c, i) => (
                            <li key={c.name} className="flex min-w-0 items-center justify-between gap-3 px-4 py-3">
                                <span className="flex min-w-0 items-baseline gap-3">
                                    <span className="font-mono text-xs text-boli-muted">{String(i + 1).padStart(2, "0")}</span>
                                    <span className="min-w-0 text-sm text-boli-ink">{c.name}</span>
                                </span>
                                <MarkPill mark={c.boli} />
                            </li>
                        ))}
                    </ol>
                </div>
            </Band>

            <Chapter
                id="decided"
                n="04"
                kicker="How we decided"
                title="Five decisions, made early"
                tone="white"
                flip
                art={<PixelVignette id="aboutBench" className="block aspect-[96/60] h-auto w-full" />}
                body={
                    <ol className="grid gap-4">
                        {DECISIONS.map((d, i) => (
                            <li key={d.title} data-reveal={revealStep(i + 1)} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
                                <span className="pt-0.5 font-mono text-xs text-boli-muted">{String(i + 1).padStart(2, "0")}</span>
                                <div className="min-w-0">
                                    <p className="text-[19px] leading-snug text-boli-ink" style={DISPLAY.card}>
                                        {d.title}
                                    </p>
                                    <p className="mt-1 text-sm leading-6 text-boli-text">{d.line}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                }
            />

            <Chapter
                id="today"
                n="05"
                kicker="Where we are today"
                title="One model, a chat and an API"
                art={<StoryScene index={2} />}
                body={
                    <>
                        <p>
                            Boli is new. There is one model, {KURA.name} for chatting with it, and an OpenAI-compatible API for building with it. We run the
                            model, keep it up and price it in rupees.
                        </p>
                        <p>
                            The model is small and makes mistakes: Hindi words slip in, grammar wobbles, and it can state things that are not true. We would
                            rather say that up front than make a big claim.
                        </p>
                        <dl data-reveal="3" className={cn("grid grid-cols-2 gap-px overflow-hidden rounded-2xl", SKY_SOFT_BG)}>
                            {(
                                [
                                    ["Model", `${BOLI_CHAT.id} - ${BOLI_CHAT.label}`],
                                    ["Price per 1M tokens", `Rs ${p.input} in, Rs ${p.output} out`],
                                    ["To start", `${WELCOME_CREDITS} free credits`],
                                    ["Rate limit", `${RATE_LIMIT_PER_MIN} requests a minute`],
                                ] as const
                            ).map(([k, v]) => (
                                <div key={k} className="min-w-0 px-4 py-3">
                                    <dt className={cn("text-xs", SKY_TEXT)}>{k}</dt>
                                    <dd className="mt-0.5 text-sm text-boli-ink">{v}</dd>
                                </div>
                            ))}
                        </dl>
                    </>
                }
            />

            <Band id="roadmap" tone="white" labelledBy="roadmap-title">
                <Kicker>Roadmap</Kicker>
                <SectionTitle>
                    <span id="roadmap-title">Chat first, then the rest of how Nepal talks</span>
                </SectionTitle>
                <ol className="mt-12 grid gap-0 sm:mt-14 lg:grid-cols-4">
                    {ROADMAP.map((r, i) => (
                        <li
                            key={r.title}
                            data-reveal={revealStep(i)}
                            className="relative grid content-start gap-3 border-l border-boli-line pb-10 pl-6 lg:border-l-0 lg:border-t lg:pb-0 lg:pl-0 lg:pr-8 lg:pt-8"
                        >
                            <span
                                aria-hidden
                                className={cn(
                                    "absolute -left-[5px] top-1 size-2.5 rounded-full ring-4 ring-white lg:-top-[5px] lg:left-0",
                                    r.now ? "bg-boli-ink" : "border border-boli-line bg-white",
                                )}
                            />
                            <p className={cn("font-sans text-xs", r.now ? SKY_TEXT : "text-boli-muted")}>
                                {String(i + 1).padStart(2, "0")} - {r.stage}
                            </p>
                            <h3 className="text-2xl leading-tight text-boli-ink" style={DISPLAY.card}>
                                {r.title}
                            </h3>
                            <p className="max-w-xs font-sans text-sm leading-6 text-boli-text">{r.line}</p>
                        </li>
                    ))}
                </ol>
            </Band>

            <Band id="principles" labelledBy="principles-title">
                <Kicker>Principles</Kicker>
                <SectionTitle>
                    <span id="principles-title">Four things we will not trade</span>
                </SectionTitle>
                <div className="mt-12 grid gap-3 sm:mt-14 sm:grid-cols-2 lg:grid-cols-4">
                    {PRINCIPLES.map((pr, i) => (
                        <article key={pr.title} data-reveal={revealStep(i)} className="flex min-w-0 flex-col gap-2 rounded-3xl border border-boli-line bg-white p-6">
                            <h3 className="text-[22px] leading-tight text-boli-ink" style={DISPLAY.card}>
                                {pr.title}
                            </h3>
                            <p className="font-sans text-sm leading-6 text-boli-text">{pr.line}</p>
                        </article>
                    ))}
                </div>
            </Band>

            {SHOW_TEAM ? (
                <Band id="team" tone="white">
                    <TeamSection />
                </Band>
            ) : null}

            <Band id="write" tone={SHOW_TEAM ? "ground" : "white"} labelledBy="write-title" innerClassName="py-16 sm:py-20 lg:py-24">
                <div data-reveal="0" className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-boli-line bg-white p-6 sm:p-10 lg:flex-row lg:items-center">
                    <div className="min-w-0">
                        <h2 id="write-title" className="text-[32px] leading-[1.05] text-boli-ink sm:text-[40px]" style={DISPLAY.h2}>
                            Building something in Nepal?
                        </h2>
                        <p className="mt-2 max-w-xl text-[15px] leading-7 text-boli-text">Tell us what you need - the API, Enterprise volumes, a partnership or an idea. We read every message.</p>
                    </div>
                    <PillButton asChild size="lg" className="shrink-0">
                        <AppLink href={ROUTES.contact}>
                            Write to us <ArrowRight aria-hidden />
                        </AppLink>
                    </PillButton>
                </div>
            </Band>
        </>
    )
}

/** A chapter: kicker with its number, title, body beside its pixel scene. `flip` puts the scene on the left from lg up. */
function Chapter({
    id,
    n,
    kicker,
    title,
    body,
    art,
    flip,
    tone = "ground",
}: {
    id: string
    n: string
    kicker: string
    title: string
    body: ReactNode
    art: ReactNode
    flip?: boolean
    tone?: "ground" | "white"
}) {
    return (
        <Band id={id} tone={tone} labelledBy={`${id}-title`}>
            <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-14">
                <div className={cn("min-w-0", flip && "lg:order-2")}>
                    <Kicker>
                        {n} - {kicker}
                    </Kicker>
                    <SectionTitle className="sm:text-[48px]">
                        <span id={`${id}-title`}>{title}</span>
                    </SectionTitle>
                    <div data-reveal="2" className="mt-6 grid max-w-xl gap-4 font-sans text-[15px] leading-7 text-boli-text">
                        {body}
                    </div>
                </div>
                <Frame>{art}</Frame>
            </div>
        </Band>
    )
}

function Frame({ children }: { children: ReactNode }) {
    return (
        <ArtRoot className="min-w-0 overflow-hidden rounded-3xl border border-boli-line bg-white">
            <div data-reveal="1">{children}</div>
        </ArtRoot>
    )
}

function MarkPill({ mark }: { mark: Mark }) {
    return (
        <span
            className={cn(
                "inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-xs",
                mark === "today" && cn(SKY_SOFT_BG, SKY_TEXT),
                mark === "next" && "border border-boli-line bg-white text-boli-ink",
                mark === "later" && "bg-boli-sand text-boli-text",
                mark === "no" && "text-boli-muted",
            )}
        >
            {MARK_LABEL[mark]}
        </span>
    )
}
