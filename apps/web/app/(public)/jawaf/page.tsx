import type { Metadata } from "next"
import type { ReactNode } from "react"
import { ArrowRight } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { cn } from "@repo/ui/lib/utils"
import { PixelVignette, vignetteAspect } from "@repo/brand/art/vignettes/vignette"
import { HighlightedCodeTabs } from "@repo/brand/code-tabs-server"
import { PillButton } from "@repo/brand/pill-button"
import { SKY } from "@repo/brand/sky"
import { QuietBadge } from "@repo/brand/quiet-badge"
import { DISPLAY } from "@repo/brand/type"
import { JAWAF_LIMITS } from "@repo/boli/jawaf"
import { CtaBand } from "@/app/_landing/cta-band"
import { JsonLd } from "@/components/json-ld"
import { FaqSection } from "@/components/public/faq-section"
import { LanguageExchanges } from "@/components/public/language-exchanges"
import { PixelIcon, PixelIconTile } from "@/components/public/pixel-icon"
import type { PixelIconId } from "@/components/public/pixel-icon-sprites"
import { JAWAF_PRICE } from "@/components/public/pricing"
import { DhakaBand, ProductHero } from "@/components/public/product-hero"
import { Band, Kicker, Lead, revealStep, SectionTitle } from "@/components/public/section"
import { SKY_SOFT_BG, SKY_TEXT } from "@/components/public/tokens"
import { API_ORIGIN, APP_HOST } from "@/lib/app-links"
import { ROUTES } from "@/lib/routes"
import { breadcrumbSchema, faqSchema } from "@/lib/schema"
import { pageMeta } from "@/lib/seo"
import { EXAMPLE_ANSWERS, EXCHANGES, exampleMonth, FOR_WHOM, JAWAF_FAQ, JAWAF_MODEL_EXAMPLE, jawafSamples, PRICE_ROWS } from "./_content"
import { Ask, DashboardMock, HONEST_SCRIPTS, LinkPagePhone, NotFoundCard, QrPoster, Reply, WebsiteBubble } from "./_mocks"

/*
 * /jawaf (owner, 2026-11-25, round 2 "show, don't tell"): Jawaf's landing page, built like the site's landing - a
 * full-screen hero with the pasal street, then sections that are each a kicker, a heading, at most two short lines and
 * a VISUAL (message bubbles, a numbered pixel step strip, the sources flowing into an answer, the link page on a phone,
 * the QR poster, the website bubble, the not-found card in three scripts, the dashboard). Bands alternate white /
 * ground with Dhaka bands between the big movements. IN PILOT everywhere: nothing says it is live, has customers or
 * has reviews (there are none - "Be one of the first" is the pilot's own ask). No Service JSON-LD while it is a pilot;
 * BreadcrumbList + FAQPage only. Every price and limit is read from @repo/boli/jawaf through ./_content.ts.
 */

export const metadata: Metadata = pageMeta({
    title: "Jawaf - answers for your customers",
    description:
        "Jawaf answers your customers in Nepali, Romanized Nepali and English from your own website, files and prices - and takes a number when it does not know. In pilot.",
    path: ROUTES.jawaf,
})

const PROBLEMS: readonly { icon: PixelIconId; label: string; when: string; quote: string }[] = [
    { icon: "chat", label: "The same ten questions", when: "All day", quote: "price kati ho?" },
    { icon: "clock", label: "After you close", when: "11:40 PM", quote: "bholi khulla cha?" },
    { icon: "ask", label: "Typed the way people talk", when: "Mixed scripts", quote: "delivery huncha ki nai? urgent cha" },
]

const STEPS: readonly { icon: PixelIconId; title: string; line: string; chip: string }[] = [
    { icon: "web", title: "Paste your website", line: "Jawaf maps it. You pick the pages.", chip: `Up to ${JAWAF_LIMITS.pagesPerBot} pages` },
    { icon: "facts", title: "Approve the facts", line: "Prices, hours, policies - drafted for you.", chip: "Prices only from you" },
    { icon: "chat", title: "Test and fix", line: "Ask like a customer. Fix any answer at once.", chip: "Playground is free" },
    { icon: "qr", title: "Share it", line: "Link, QR poster, website or API.", chip: `${APP_HOST}/j/your-name` },
]

const SOURCES: readonly { icon: PixelIconId; title: string; meta: string }[] = [
    { icon: "web", title: "Your website", meta: `Up to ${JAWAF_LIMITS.pagesPerBot} pages, re-read weekly` },
    { icon: "file", title: "Your files", meta: `PDF, Word, photos - up to ${JAWAF_LIMITS.filesPerBot}` },
    { icon: "facts", title: "Your facts and prices", meta: "Always used. Wins over the website." },
    { icon: "ask", title: "Your questions", meta: "In your words, every way they ask" },
]

const HONEST_POINTS: readonly { icon: PixelIconId; label: string }[] = [
    { icon: "ask", label: "Never guesses a price" },
    { icon: "phone", label: "Takes a number - you get an email" },
    { icon: "source", label: "Shows where every answer came from" },
]

const WHO_ICON: Record<(typeof FOR_WHOM)[number]["id"], PixelIconId> = {
    education: "cap",
    clinic: "clinic",
    shop: "bag",
    hotel: "bed",
    real_estate: "home",
}

const PILOT: readonly string[] = ["We set it up with you", "Free for the whole pilot", "Your feedback decides what is next"]

export default function JawafPage() {
    const samples = jawafSamples(API_ORIGIN)
    return (
        <>
            <JsonLd
                data={[
                    breadcrumbSchema([
                        { name: "Products", path: ROUTES.products },
                        { name: "Jawaf", path: ROUTES.jawaf },
                    ]),
                    faqSchema(JAWAF_FAQ),
                ]}
            />
            <ProductHero
                id="jawaf-hero"
                badge={
                    <>
                        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-boli-sky" />
                        <span className="truncate">Jawaf - for your business - in pilot</span>
                    </>
                }
                title={
                    <>
                        Your customers ask. <span className={SKY_TEXT}>Jawaf answers.</span>
                    </>
                }
                line="From your website, files and prices - in Nepali, Romanized Nepali or English, day and night."
                actions={
                    <>
                        <PillButton asChild size="lg">
                            <AppLink href={ROUTES.jawafPilot}>
                                Join the pilot <ArrowRight aria-hidden strokeWidth={1.75} />
                            </AppLink>
                        </PillButton>
                        <PillButton asChild size="lg" variant="secondary" className="border-transparent">
                            {/* An in-page jump, not a navigation: a plain anchor. */}
                            <a href="#how">See how it works</a>
                        </PillButton>
                    </>
                }
                note="Free during the pilot. We set it up with you."
                art={<PixelVignette id="jawafBanner" preserve="xMidYMax slice" />}
                artAspect={vignetteAspect("jawafBanner")}
                phoneArt={<PixelVignette id="jawafCounter" preserve="xMidYMax slice" />}
                phoneAspect={vignetteAspect("jawafCounter")}
            />

            {/* The problem: three messages, as they arrive. */}
            <Band id="problem" tone="white" labelledBy="problem-title">
                <Kicker>The problem</Kicker>
                <SectionTitle>
                    <span id="problem-title">Your phone never stops asking</span>
                </SectionTitle>
                <ul className="mt-12 grid gap-3 sm:mt-14 md:grid-cols-3">
                    {PROBLEMS.map((p, i) => (
                        <li key={p.label} data-reveal={revealStep(i)} className="flex min-w-0 flex-col gap-6 rounded-3xl border border-boli-line bg-boli-ground p-5 sm:p-6">
                            <div className="flex items-center justify-between gap-3">
                                <PixelIconTile id={p.icon} />
                                <span className="truncate font-mono text-xs text-boli-muted">{p.when}</span>
                            </div>
                            <p className="w-fit max-w-full break-words rounded-3xl rounded-bl-md bg-white px-4 py-2.5 text-[22px] leading-snug text-boli-ink shadow-[0_1px_2px_rgba(20,20,20,0.05)]" style={DISPLAY.card}>
                                {p.quote}
                            </p>
                            <p className="mt-auto text-sm text-boli-text">{p.label}</p>
                        </li>
                    ))}
                </ul>
            </Band>

            <DhakaBand />

            {/* How it works: four numbered pixel steps on one line. */}
            <Band id="how" labelledBy="how-title" className="border-t-0">
                <Kicker>How it works</Kicker>
                <SectionTitle>
                    <span id="how-title">Your website to answers, in four steps</span>
                </SectionTitle>
                <Lead>No code. During the pilot we do these with you.</Lead>
                <ol className="relative mt-12 grid gap-3 sm:mt-14 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
                    <span aria-hidden className="absolute left-[12%] right-[12%] top-[3.25rem] hidden border-t-2 border-dashed border-boli-sky/40 lg:block" />
                    {STEPS.map((s, i) => (
                        <li key={s.title} data-reveal={revealStep(i)} className="relative flex min-w-0 flex-col items-center gap-3 rounded-3xl border border-boli-line bg-white px-5 pb-6 pt-5 text-center">
                            <span className={cn("font-mono text-xs", SKY_TEXT)}>{String(i + 1).padStart(2, "0")}</span>
                            <span className={cn("inline-flex size-16 items-center justify-center rounded-2xl ring-1 ring-boli-line", SKY_SOFT_BG)}>
                                <PixelIcon id={s.icon} className="size-9" />
                            </span>
                            <h3 className="text-[22px] leading-tight text-boli-ink" style={DISPLAY.card}>
                                {s.title}
                            </h3>
                            <p className="text-sm leading-6 text-boli-text">{s.line}</p>
                            <span className="mt-auto inline-flex h-7 max-w-full items-center truncate rounded-full bg-boli-ground px-3 text-xs text-boli-ink">{s.chip}</span>
                        </li>
                    ))}
                </ol>
            </Band>

            {/* What it knows: four sources flow into one answer with its source. */}
            <Band id="knows" tone="white" labelledBy="knows-title">
                <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
                    <div className="min-w-0">
                        <Kicker>What it knows</Kicker>
                        <SectionTitle>
                            <span id="knows-title">Only what you give it</span>
                        </SectionTitle>
                        <Lead>No internet, no general knowledge. Your facts win when your website disagrees.</Lead>
                    </div>
                    <div data-reveal="2" className="grid min-w-0 items-center gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,0.9fr)]">
                        <ul className="grid min-w-0 gap-2">
                            {SOURCES.map((s) => (
                                <li key={s.title} className="flex min-w-0 items-center gap-3 rounded-2xl border border-boli-line bg-boli-ground px-3 py-2.5">
                                    <PixelIcon id={s.icon} className="size-7" />
                                    <div className="min-w-0">
                                        <p className="truncate text-sm text-boli-ink">{s.title}</p>
                                        <p className="truncate text-xs text-boli-muted">{s.meta}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                        <ArrowRight aria-hidden strokeWidth={1.75} className={cn("mx-auto size-5 rotate-90 sm:rotate-0", SKY_TEXT)} />
                        <div className="grid min-w-0 gap-2.5 rounded-3xl border border-boli-line bg-white p-4 font-sans shadow-[0_18px_40px_-24px_rgba(20,20,20,0.3)]">
                            <Ask>IELTS class ko fee kati ho?</Ask>
                            <Reply chip="From: Your facts - Prices">IELTS class ko fee Rs 12,000 ho, 2 mahina ko.</Reply>
                        </div>
                    </div>
                </div>
            </Band>

            {/* Ways in: the link page, the poster, the website bubble - then the API. */}
            <Band id="ways" labelledBy="ways-title">
                <Kicker>Ways in</Kicker>
                <SectionTitle>
                    <span id="ways-title">Three ways in, one set of answers</span>
                </SectionTitle>
                <Lead>No app and no login for your customers.</Lead>
                <ul className="mt-12 grid gap-3 sm:mt-14 md:grid-cols-3">
                    <WayCard i={0} title="A link page" detail={`${APP_HOST}/j/your-name`}>
                        <LinkPagePhone />
                    </WayCard>
                    <WayCard i={1} title="A QR poster for the counter" detail="Print it A5 - type or hold to speak">
                        <QrPoster />
                    </WayCard>
                    <WayCard i={2} title="A bubble on your website" detail="One <script> tag - your domains only">
                        <WebsiteBubble />
                    </WayCard>
                </ul>
                <div data-reveal="2" className="mt-3 grid gap-6 rounded-3xl border border-boli-line bg-white p-5 sm:p-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:items-center lg:gap-10">
                    <div className="min-w-0">
                        <PixelIconTile id="code" />
                        <h3 className="mt-4 text-[28px] leading-tight text-boli-ink" style={DISPLAY.h3}>
                            Or call it from your code
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-boli-text">
                            Same keys, same OpenAI SDKs. Set the model to{" "}
                            <span className="rounded bg-boli-ground px-1.5 py-0.5 font-mono text-[13px] text-boli-ink ring-1 ring-boli-line">{JAWAF_MODEL_EXAMPLE}</span>.
                        </p>
                        <AppLink
                            href={ROUTES.doc("quickstart")}
                            className="mt-4 inline-flex cursor-pointer items-center gap-1.5 text-sm font-[450] text-boli-ink underline decoration-boli-sky-ink/50 decoration-1 underline-offset-4"
                        >
                            API quickstart <ArrowRight aria-hidden strokeWidth={1.75} className="size-3.5" />
                        </AppLink>
                    </div>
                    <div className="min-w-0">
                        <HighlightedCodeTabs samples={samples} className="min-w-0" bodyViewportClassName="h-[17rem] sm:h-[19rem]" />
                    </div>
                </div>
            </Band>

            <DhakaBand />

            {/* Honesty: what a customer sees when the answer is not there, in three scripts. */}
            <Band id="honesty" tone="white" labelledBy="honesty-title" className="border-t-0">
                <Kicker>Honest by design</Kicker>
                <SectionTitle>
                    <span id="honesty-title">If it does not know, it says so</span>
                </SectionTitle>
                <Lead>A wrong fee costs more than no answer. So Jawaf stops and takes a number.</Lead>
                <ul className="mt-12 grid gap-3 sm:mt-14 md:grid-cols-3">
                    {HONEST_SCRIPTS.map((s, i) => (
                        <li key={s} data-reveal={revealStep(i)} className="flex min-w-0">
                            <NotFoundCard script={s} />
                        </li>
                    ))}
                </ul>
                <ul data-reveal="3" className="mt-6 flex flex-wrap gap-2">
                    {HONEST_POINTS.map((p) => (
                        <li key={p.label} className="inline-flex h-10 max-w-full items-center gap-2 rounded-full border border-boli-line bg-boli-ground pl-2 pr-4 text-sm text-boli-ink">
                            <PixelIcon id={p.icon} className="size-6" />
                            <span className="truncate">{p.label}</span>
                        </li>
                    ))}
                </ul>
            </Band>

            {/* Languages: the animated exchanges. */}
            <Band id="languages" labelledBy="languages-title">
                <Kicker>Languages</Kicker>
                <SectionTitle>
                    <span id="languages-title">It answers in the script they wrote in</span>
                </SectionTitle>
                <Lead>Devanagari, Romanized, English or the mix. Example answers, shortened.</Lead>
                <LanguageExchanges items={EXCHANGES} className="mt-12 sm:mt-14" />
            </Band>

            {/* Who it is for: pixel chips with the question each one hears. */}
            <Band id="who" tone="white" labelledBy="who-title">
                <Kicker>Who it is for</Kicker>
                <SectionTitle>
                    <span id="who-title">Businesses that hear the same questions</span>
                </SectionTitle>
                <ul className="mt-12 grid gap-3 sm:mt-14 sm:grid-cols-2 lg:grid-cols-5">
                    {FOR_WHOM.map((w, i) => (
                        <li key={w.id} data-reveal={revealStep(i)} className="flex min-w-0 flex-col gap-3 rounded-3xl border border-boli-line bg-boli-ground p-5">
                            <PixelIconTile id={WHO_ICON[w.id]} />
                            <h3 className="text-[19px] leading-tight text-boli-ink" style={DISPLAY.card}>
                                {w.label}
                            </h3>
                            <p className="text-xs text-boli-muted">{w.line}</p>
                            <p className="mt-auto w-fit max-w-full break-words rounded-2xl rounded-br-md bg-white px-3 py-1.5 text-[13px] text-boli-ink">{w.ask}</p>
                        </li>
                    ))}
                </ul>
            </Band>

            {/* The dashboard, coming with the pilot: one illustration. */}
            <Band id="dashboard" labelledBy="dashboard-title">
                <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,6fr)] lg:gap-14">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                            <Kicker>Your dashboard</Kicker>
                            <QuietBadge tone="outline">Coming with the pilot</QuietBadge>
                        </div>
                        <SectionTitle>
                            <span id="dashboard-title">Every question, every number left</span>
                        </SectionTitle>
                        <Lead>Conversations, contacts and what people ask most - built with the first pilot businesses.</Lead>
                    </div>
                    <div data-reveal="2" className="min-w-0">
                        <DashboardMock />
                    </div>
                </div>
            </Band>

            <DhakaBand />

            {/* Pricing: one card. */}
            <Band id="pricing" tone="white" labelledBy="pricing-title" className="border-t-0">
                <div className="flex flex-wrap items-center gap-3">
                    <Kicker>Pricing</Kicker>
                    <QuietBadge tone="outline">Planned price</QuietBadge>
                </div>
                <SectionTitle>
                    <span id="pricing-title">Pay per answer, in rupees</span>
                </SectionTitle>
                <Lead>Free during the pilot. From the same credits as the rest of Boli; 1 credit = Rs 1.</Lead>
                <div data-reveal="2" className="mt-12 grid overflow-hidden rounded-3xl border border-boli-line sm:mt-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                    <div className="flex min-w-0 flex-col justify-between gap-8 p-6 sm:p-8" style={{ background: `linear-gradient(140deg, ${SKY.soft}, ${SKY.wash})` }}>
                        <div>
                            <p className="text-sm text-boli-text">{JAWAF_PRICE.freeAnswers} free answers a month, then</p>
                            <p className="mt-2 text-[56px] leading-none text-boli-ink sm:text-[72px]" style={DISPLAY.display}>
                                {JAWAF_PRICE.perAnswer}
                            </p>
                            <p className="mt-2 text-sm text-boli-text">an answer</p>
                        </div>
                        <p className="text-sm leading-6 text-boli-ink">
                            {EXAMPLE_ANSWERS.toLocaleString("en-US")} answers in a month = {exampleMonth(EXAMPLE_ANSWERS)}. No subscription; credits never expire.
                        </p>
                    </div>
                    <dl className="grid min-w-0 gap-px bg-boli-line [&>div]:bg-white">
                        {PRICE_ROWS.map((r) => (
                            <div key={r.what} className="grid min-w-0 gap-1 px-5 py-4 sm:px-6">
                                <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                                    <dt className="text-sm text-boli-muted">{r.what}</dt>
                                    <dd className="text-lg leading-snug text-boli-ink" style={DISPLAY.card}>
                                        {r.price}
                                    </dd>
                                </div>
                                <dd className="text-xs leading-5 text-boli-muted">{r.note}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </Band>

            <Band id="faq" labelledBy="faq-title">
                <FaqSection
                    items={[...JAWAF_FAQ]}
                    title="Questions about Jawaf"
                    line="What businesses ask before they let it answer their customers."
                    contact={{ label: "Ask us about the pilot", href: ROUTES.jawafPilot }}
                />
            </Band>

            {/* The pilot: the closing ask. No reviews exist yet, so none are shown. */}
            <CtaBand
                id="pilot"
                tone="white"
                title="Be one of the first"
                line="Jawaf is new. No reviews to show you yet - that is what the pilot is for."
                primary={{ label: "Join the pilot", href: ROUTES.jawafPilot }}
                secondary={{ label: "See all products", href: ROUTES.products }}
            >
                <ol className="mt-6 flex flex-wrap gap-2">
                    {PILOT.map((p, i) => (
                        <li key={p} className="inline-flex h-9 max-w-full items-center gap-2 rounded-full bg-white/80 pl-1.5 pr-4 text-sm text-boli-ink">
                            <span className={cn("inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-white font-mono text-xs", SKY_TEXT)}>{i + 1}</span>
                            <span className="truncate">{p}</span>
                        </li>
                    ))}
                </ol>
            </CtaBand>
        </>
    )
}

function WayCard({ i, title, detail, children }: { i: number; title: string; detail: string; children: ReactNode }) {
    return (
        <li data-reveal={revealStep(i)} className="flex min-w-0 flex-col overflow-hidden rounded-3xl border border-boli-line bg-white">
            <div className="flex flex-1 items-center justify-center px-5 py-8" style={{ background: `linear-gradient(180deg, ${SKY.soft} 0%, #ffffff 100%)` }}>
                {children}
            </div>
            <div className="grid gap-1 border-t border-boli-line p-5">
                <h3 className="text-[22px] leading-tight text-boli-ink" style={DISPLAY.card}>
                    {title}
                </h3>
                <p className="break-words font-mono text-xs leading-5 text-boli-muted">{detail}</p>
            </div>
        </li>
    )
}
