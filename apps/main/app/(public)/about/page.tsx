import type { Metadata } from "next"
import type { ReactNode } from "react"
import { cn } from "@repo/ui/lib/utils"
import { TeamSection } from "@/components/art/team/team"
import { DISPLAY } from "@/components/brand/type"
import { Band, Kicker, Lead, SectionTitle } from "@/components/public/section"
import { StoryPanels } from "@/components/public/story-panels"
import { SKY_SOFT_BG, SKY_TEXT } from "@/components/public/tokens"
import { ArtRoot } from "@/components/art/art-root"
import { BOLI_CHAT, BRAND, KURA, RATE_LIMIT_PER_MIN, WELCOME_CREDITS } from "@/lib/boli"
import { ContactForm } from "./_components/contact-form"

export const metadata: Metadata = {
    title: "About",
    description: "Why Boli exists: no Nepal-based company offered a self-serve AI platform, so we built one on open models, priced in rupees, for the way Nepal types.",
    alternates: { canonical: "/about" },
}

/** The team section shows placeholder people ("Your name here") for now. Set to false to hide it until real names exist. */
const SHOW_TEAM = true

const ROADMAP: readonly { stage: string; title: string; line: string; now?: boolean }[] = [
    { stage: "Now", title: "Chat", line: `${KURA.name} and the chat completions API on ${BOLI_CHAT.id}, an open model that reads Romanized Nepali.`, now: true },
    { stage: "Next", title: "Document intelligence", line: "Read scanned forms, receipts and PDFs in Nepali and English, and answer questions about them." },
    { stage: "Later", title: "Speech to text, text to speech", line: "Talk in Nepali and get text back; hear answers read aloud in a Nepali voice." },
    { stage: "Later", title: "Fine-tuning and hosting", line: "Your data, an open model tuned on it, and Boli running it for you - nobody runs a business on a laptop model." },
]

const PRINCIPLES: readonly { title: string; line: string }[] = [
    { title: "Open models only", line: "No closed model behind Boli, ever. If we say open, it is open weights you could run yourself." },
    { title: "Priced in rupees", line: `Per-token prices in NPR, on the page. ${WELCOME_CREDITS} free credits, eSewa and Khalti, credits that never expire.` },
    { title: "The API stores no prompts", line: "API calls keep metadata only - model, tokens, cost, time. Never your prompts or the answers." },
    { title: "Built in Nepal", line: `For the way people here type - Romanized, Devanagari or mixed - with limits stated up front: ${RATE_LIMIT_PER_MIN} requests a minute.` },
]

export default function AboutPage() {
    return (
        <>
            <header className="border-b border-boli-line">
                <div className="mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-24 lg:px-10">
                    <Kicker>About {BRAND.name}</Kicker>
                    <h1 className="mt-4 max-w-4xl text-[48px] leading-[1.0] text-boli-ink sm:text-[72px] sm:leading-[0.98]" style={DISPLAY.display}>
                        AI that speaks the way <span className={SKY_TEXT}>Nepal types</span>
                    </h1>
                    <Lead className="text-base leading-7 sm:text-lg sm:leading-8">
                        Boli has one narrow aim: give people and developers in Nepal an open AI model they can use today, in their own words, paid for in
                        rupees.
                    </Lead>
                </div>
            </header>

            <Band id="story" labelledBy="story-title" className="border-t-0">
                <Kicker>The story</Kicker>
                <SectionTitle>
                    <span id="story-title">Why Boli exists</span>
                </SectionTitle>
                <Lead>
                    In November 2026 we checked nineteen Nepal-based AI companies against fourteen things a developer needs: an instant key, free credits,
                    public prices in rupees, a playground, docs. The best scored 5 of 14. None offered self-serve keys, free credits, public prices and docs
                    together. So we built one.
                </Lead>
                <ArtRoot>
                    <StoryPanels className="mt-12 sm:mt-14" />
                </ArtRoot>
            </Band>

            <Band id="roadmap" tone="white" labelledBy="roadmap-title">
                <Kicker>Roadmap</Kicker>
                <SectionTitle>
                    <span id="roadmap-title">Chat first, then the rest of how Nepal talks</span>
                </SectionTitle>
                <ol className="mt-12 grid gap-0 sm:mt-14 lg:grid-cols-4">
                    {ROADMAP.map((r, i) => (
                        <li key={r.title} className="relative grid content-start gap-3 border-l border-boli-line pb-10 pl-6 lg:border-l-0 lg:border-t lg:pb-0 lg:pl-0 lg:pr-8 lg:pt-8">
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
                    {PRINCIPLES.map((p) => (
                        <article key={p.title} className="flex min-w-0 flex-col gap-2 rounded-3xl border border-boli-line bg-white p-6">
                            <h3 className="text-[22px] leading-tight text-boli-ink" style={DISPLAY.card}>
                                {p.title}
                            </h3>
                            <p className="font-sans text-sm leading-6 text-boli-text">{p.line}</p>
                        </article>
                    ))}
                </div>
                <Today />
            </Band>

            {SHOW_TEAM ? (
                <Band id="team" tone="white">
                    <TeamSection />
                </Band>
            ) : null}

            <Band id="contact" tone={SHOW_TEAM ? "ground" : "white"} labelledBy="contact-title" innerClassName="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
                <div className="self-start lg:sticky lg:top-28">
                    <Kicker>Contact</Kicker>
                    <SectionTitle>
                        <span id="contact-title">Write to us</span>
                    </SectionTitle>
                    <Lead>Questions about the API, Enterprise volumes, a partnership, a privacy request, or just an idea. We read every message.</Lead>
                </div>
                <ContactForm />
            </Band>
        </>
    )
}

/** Where we are today - said plainly, under the principles. */
function Today() {
    return (
        <Note>
            Boli is new. There is one model, {KURA.name} for chatting with it, and an OpenAI-compatible API for building with it. The model is small and makes
            mistakes: Hindi words slip in, grammar wobbles, and it can state things that are not true. We would rather say that up front than make a big claim.
        </Note>
    )
}

function Note({ children }: { children: ReactNode }) {
    return (
        <div className={cn("mt-6 rounded-3xl px-6 py-5 font-sans text-[15px] leading-7 text-boli-ink", SKY_SOFT_BG)}>
            <p className={cn("mb-1 text-xs", SKY_TEXT)}>Where we are today</p>
            {children}
        </div>
    )
}
