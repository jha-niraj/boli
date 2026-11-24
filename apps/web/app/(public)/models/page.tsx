import type { Metadata } from "next"
import { ArrowRight } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { cn } from "@repo/ui/lib/utils"
import { ArtRoot } from "@repo/brand/art/art-root"
import { PixelCover, type CoverId } from "@repo/brand/art/covers/cover"
import { QuietBadge } from "@repo/brand/quiet-badge"
import { DISPLAY } from "@repo/brand/type"
import { BOLI_CHAT, KURA } from "@repo/boli"
import { Band, Kicker, Lead, SectionTitle, revealStep } from "@/components/public/section"
import { JsonLd } from "@/components/json-ld"
import { ROUTES } from "@/lib/routes"
import { breadcrumbSchema } from "@/lib/schema"
import { pageMeta } from "@/lib/seo"

export const metadata: Metadata = pageMeta({
    title: "Models",
    description: `Boli's open models: ${BOLI_CHAT.id} (${BOLI_CHAT.label}) for chat in Nepali, Romanized Nepali and English today; document reading next; speech later.`,
    path: ROUTES.models,
})

type Card = { name: string; stage: "Live" | "Next" | "Later"; line: string; facts: string[]; href?: string; art: CoverId }

const CARDS: readonly Card[] = [
    {
        name: BOLI_CHAT.id,
        stage: "Live",
        line: BOLI_CHAT.blurb,
        facts: [BOLI_CHAT.label, `${BOLI_CHAT.licence}, open weights`, `${BOLI_CHAT.contextTokens.toLocaleString("en-US")} tokens of context`, `Rs ${BOLI_CHAT.pricePerMillion.input} in / Rs ${BOLI_CHAT.pricePerMillion.output} out per 1M tokens`],
        href: ROUTES.model(BOLI_CHAT.id),
        art: "aboutBench",
    },
    {
        name: "Document intelligence",
        stage: "Next",
        line: "Read images and PDFs in Nepali, English or both - a scanned bill or a notice becomes text, or fields as JSON.",
        facts: ["Being tested on 39 public government notices", "Printed, scanned and photographed pages", "Open models only"],
        art: "bill",
    },
    {
        name: "Speech",
        stage: "Later",
        line: "Talk in Nepali and get text back; hear answers read aloud in a Nepali voice.",
        facts: ["Speech to text", "Text to speech", "Open models only"],
        art: "keyboard",
    },
]

const ROADMAP: readonly { stage: string; title: string; line: string; now?: boolean }[] = [
    { stage: "Now", title: "Chat", line: `${KURA.name} and the chat completions API on ${BOLI_CHAT.id}, an open model that reads Romanized Nepali.`, now: true },
    { stage: "Next", title: "Document intelligence", line: "Read images and PDFs in Nepali, English or both - a scanned bill becomes text, or fields as JSON." },
    { stage: "Later", title: "Speech", line: "Talk in Nepali and get text back; hear answers read aloud in a Nepali voice." },
    { stage: "Later", title: "Fine-tuning and hosting", line: "Your data, an open model tuned on it, and Boli running it for you." },
]

/** Models: what runs today (boli-chat), what comes next, and the roadmap (#roadmap, linked from the nav). */
export default function ModelsPage() {
    return (
        <>
            <JsonLd data={breadcrumbSchema([{ name: "Models", path: ROUTES.models }])} />
            <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 font-sans sm:px-6 sm:pt-14 lg:px-10">
                <header className="max-w-3xl">
                    <Kicker reveal={false}>Models</Kicker>
                    <h1 className="mt-3 text-[42px] leading-[1.02] text-boli-ink sm:text-[56px]" style={DISPLAY.display}>
                        Open models, one at a time
                    </h1>
                    <p className="mt-4 max-w-2xl text-base leading-7 text-boli-text sm:text-lg sm:leading-8">
                        Every model Boli runs is open weights you could run yourself. We add one only when it works on how people in Nepal actually write.
                    </p>
                </header>

                <ul className="mt-12 grid gap-4 lg:grid-cols-3">
                    {CARDS.map((c) => {
                        const body = (
                            <>
                                <ArtRoot className="relative overflow-hidden border-b border-boli-line bg-white">
                                    <div className={cn("relative w-full", c.stage !== "Live" && "opacity-80 saturate-[0.85]")} style={{ aspectRatio: "96 / 60" }} aria-hidden>
                                        <div className="absolute inset-0 [&>svg]:block [&>svg]:h-full [&>svg]:w-full">
                                            <PixelCover id={c.art} />
                                        </div>
                                    </div>
                                </ArtRoot>
                                <div className="flex flex-1 flex-col p-6">
                                    <div className="flex items-center justify-between gap-3">
                                        <h2 className={cn("min-w-0 truncate text-[26px] leading-tight text-boli-ink", c.stage === "Live" && "font-mono text-[22px]")} style={c.stage === "Live" ? undefined : DISPLAY.card}>
                                            {c.name}
                                        </h2>
                                        <QuietBadge tone={c.stage === "Live" ? "live" : c.stage === "Next" ? "outline" : "neutral"}>{c.stage}</QuietBadge>
                                    </div>
                                    <p className="mt-3 text-sm leading-6 text-boli-text">{c.line}</p>
                                    <ul className="mt-5 space-y-1.5 border-t border-boli-line pt-4 text-sm text-boli-muted">
                                        {c.facts.map((f) => (
                                            <li key={f}>{f}</li>
                                        ))}
                                    </ul>
                                    {c.href ? (
                                        <span className="mt-6 inline-flex items-center gap-2 text-sm font-[450] text-boli-ink">
                                            See the model <ArrowRight className="h-4 w-4" aria-hidden />
                                        </span>
                                    ) : null}
                                </div>
                            </>
                        )
                        return (
                            <li key={c.name} className="min-w-0">
                                {c.href ? (
                                    <AppLink href={c.href} className="flex h-full cursor-pointer flex-col overflow-hidden rounded-3xl border border-boli-line bg-white transition-colors hover:border-boli-ink/20">
                                        {body}
                                    </AppLink>
                                ) : (
                                    <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-boli-line bg-white">{body}</div>
                                )}
                            </li>
                        )
                    })}
                </ul>
            </div>

            <Band id="roadmap" tone="white" labelledBy="roadmap-title">
                <Kicker>Roadmap</Kicker>
                <SectionTitle>
                    <span id="roadmap-title">Chat first, then the rest of how Nepal talks</span>
                </SectionTitle>
                <Lead>No dates until a model passes our own tests on real Nepali input. What is next is already being measured.</Lead>
                <ol className="mt-12 grid gap-0 sm:mt-14 lg:grid-cols-4">
                    {ROADMAP.map((r, i) => (
                        <li
                            key={r.title}
                            data-reveal={revealStep(i)}
                            className="relative grid content-start gap-3 border-l border-boli-line pb-10 pl-6 lg:border-l-0 lg:border-t lg:pb-0 lg:pl-0 lg:pr-8 lg:pt-8"
                        >
                            <span
                                aria-hidden
                                className={cn("absolute -left-[5px] top-1 size-2.5 rounded-full ring-4 ring-white lg:-top-[5px] lg:left-0", r.now ? "bg-boli-ink" : "border border-boli-line bg-white")}
                            />
                            <p className={cn("font-sans text-xs", r.now ? "text-boli-sky-ink" : "text-boli-muted")}>
                                {String(i + 1).padStart(2, "0")} - {r.stage}
                            </p>
                            <h3 className="text-2xl leading-tight text-boli-ink" style={DISPLAY.card}>
                                {r.title}
                            </h3>
                            <p className="max-w-xs font-sans text-sm leading-6 text-boli-text">{r.line}</p>
                        </li>
                    ))}
                </ol>
                <p className="mt-6 text-sm text-boli-muted">
                    How we test document reading:{" "}
                    <AppLink href={ROUTES.blog} className="cursor-pointer text-boli-sky-ink underline underline-offset-4">
                        read the research notes on the blog
                    </AppLink>
                    .
                </p>
            </Band>
        </>
    )
}
