import { ArrowUpRight } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import { DhakaStrip } from "@repo/brand/dhaka-strip"
import { QuietBadge } from "@repo/brand/quiet-badge"
import { DISPLAY } from "@repo/brand/type"
import { BOLI_CHAT, KURA } from "@repo/boli"
import { ROUTES } from "@/lib/routes"
import { ApiSlice, DocSlice, JawafSlice, KuraSlice, ModelSlice, SpeechSlice } from "./product-slices"
import { SKY_SOFT_BG } from "./tokens"
import { SiteLink } from "@/components/site-link"

/*
 * PC3 (owner pick, 2026-11-24) - a hybrid bento: a Dhaka edge, a big Fraunces title, a real product slice. Three rows
 * (product order from plan/main/jawaf/jawaf-v1.md, 2026-11-25): Kura (wide) + API, Jawaf (wide, "Pilot") + Models,
 * Kagaj (wide, "Later") + Swar ("Later"). Kura and Jawaf link to their product pages (/kura, /jawaf);
 * what is only on the roadmap is drawn quieter and has no link. Nothing truncates.
 */

type ProductId = "kura" | "api" | "jawaf" | "models" | "docs" | "speech"
type Stage = "pilot" | "soon"

const STAGE_LABEL: Record<Stage, string> = { pilot: "Pilot", soon: "Later" }

const PRODUCTS: readonly {
    id: ProductId
    title: string
    gloss: string
    line: string
    cta?: { label: string; href: string }
    stage?: Stage
    span?: 2 | 3
}[] = [
    {
        id: "kura",
        title: KURA.name,
        gloss: "कुरा - conversation",
        line: `${KURA.subtitle} - the way you already type.`,
        cta: { label: "Meet Kura", href: ROUTES.kura },
        span: 2,
    },
    {
        id: "api",
        title: "API",
        gloss: "OpenAI-compatible",
        line: "Point the OpenAI SDK at Boli's /v1, stream tokens, pay per token in rupees.",
        cta: { label: "Read the quickstart", href: ROUTES.doc("quickstart") },
    },
    {
        id: "jawaf",
        title: "Jawaf",
        gloss: "जवाफ - answer, for your business",
        line: "Answers your customers from your own website, files and facts - in Nepali, Romanized Nepali or English. If it does not know, it says so and takes a number.",
        cta: { label: "See how Jawaf works", href: ROUTES.jawaf },
        stage: "pilot",
        span: 2,
    },
    {
        id: "models",
        title: "Models",
        gloss: "Open weights only",
        line: `${BOLI_CHAT.id} runs ${BOLI_CHAT.label}. Only open models, priced per million tokens.`,
        cta: { label: "See the models", href: ROUTES.doc("models") },
    },
    {
        id: "docs",
        title: "Kagaj",
        gloss: "Images and PDFs to text and JSON",
        line: "Read scanned bills, forms and PDFs in Nepali, English or both, and get the text back - or the fields as JSON.",
        stage: "soon",
        span: 2,
    },
    {
        id: "speech",
        title: "Swar",
        gloss: "Speech to text and text to speech",
        line: "Talk in Nepali, get Romanized text back - and hear answers read aloud.",
        stage: "soon",
    },
]

function Slice({ id, compact }: { id: ProductId; compact?: boolean }) {
    if (id === "kura") return <KuraSlice compact={compact} />
    if (id === "api") return <ApiSlice />
    if (id === "jawaf") return <JawafSlice compact={compact} />
    if (id === "models") return <ModelSlice />
    if (id === "docs") return <DocSlice />
    return <SpeechSlice />
}

export function ProductCards({ className }: { className?: string }) {
    return (
        <div className={cn("grid gap-3 lg:grid-cols-3", className)}>
            {PRODUCTS.map((p, i) => (
                <article
                    key={p.id}
                    data-reveal={String(i % 3)}
                    className={cn(
                        "group/pc relative flex min-w-0 flex-col overflow-hidden rounded-3xl border border-boli-line bg-white",
                        p.span === 2 && "lg:col-span-2",
                        p.span === 3 && "lg:col-span-3",
                    )}
                >
                    <DhakaStrip tone={p.stage === "soon" ? "tonal" : "sky"} scale={1.5} />
                    <div className={cn("grid flex-1 gap-5 p-5 sm:p-6", p.span && "md:grid-cols-[1fr_1.15fr] md:items-center", p.span === 3 && "lg:grid-cols-[1fr_1.6fr]")}>
                        <div className="flex min-w-0 flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <h3 className="text-[32px] leading-[1.02] text-boli-ink sm:text-[36px]" style={DISPLAY.h2}>
                                    {p.title}
                                </h3>
                                {p.stage ? <QuietBadge tone={p.stage === "pilot" ? "outline" : "neutral"}>{STAGE_LABEL[p.stage]}</QuietBadge> : null}
                            </div>
                            <p className="font-sans text-xs text-boli-muted">{p.gloss}</p>
                            <p className="mt-1 font-sans text-sm leading-6 text-boli-text">{p.line}</p>
                            {p.cta ? (
                                <div className="pt-2">
                                    {/* The link covers the whole card (after:inset-0), so the card is one target. */}
                                    <SiteLink
                                        href={p.cta.href}
                                        className="inline-flex cursor-pointer items-center gap-1 font-sans text-sm font-[450] text-boli-ink after:absolute after:inset-0 after:content-[''] group-hover/pc:underline group-hover/pc:underline-offset-4"
                                    >
                                        {p.cta.label}
                                        <ArrowUpRight
                                            aria-hidden
                                            strokeWidth={1.75}
                                            className="size-3.5 transition-transform group-hover/pc:-translate-y-0.5 group-hover/pc:translate-x-0.5 motion-reduce:transition-none"
                                        />
                                    </SiteLink>
                                </div>
                            ) : (
                                <p className="pt-2 font-sans text-sm text-boli-muted">On the roadmap</p>
                            )}
                        </div>
                        <div className={cn("min-w-0 rounded-2xl p-4", p.stage === "soon" ? "bg-boli-sand" : SKY_SOFT_BG)}>
                            <div className={cn(p.stage === "soon" && "opacity-85 saturate-[0.6]")}>
                                <Slice id={p.id} compact={!p.span} />
                            </div>
                        </div>
                    </div>
                </article>
            ))}
        </div>
    )
}
