import { ArrowUpRight } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { cn } from "@repo/ui/lib/utils"
import { DhakaStrip } from "@/components/brand/dhaka-strip"
import { QuietBadge } from "@/components/brand/quiet-badge"
import { DISPLAY } from "@/components/brand/type"
import { BOLI_CHAT, KURA } from "@/lib/boli"
import { ROUTES } from "@/lib/navigation"
import { ApiSlice, DocSlice, KuraSlice, ModelSlice, SpeechSlice } from "./product-slices"
import { SKY_SOFT_BG } from "./tokens"

/*
 * PC3 (owner pick, 2026-11-24) - a hybrid bento: a Dhaka edge, a big Fraunces title, a real product slice. Three rows
 * (round 4): Kura (wide) + API, Models + Document intelligence (wide, "Next"), Speech (full width, "Later" - it comes
 * after document intelligence). What is not live yet is drawn quieter and has no link. Nothing truncates.
 */

type ProductId = "kura" | "api" | "models" | "docs" | "speech"
type Stage = "next" | "later"

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
        cta: { label: "Open Kura", href: ROUTES.kura },
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
        id: "models",
        title: "Models",
        gloss: "Open weights only",
        line: `${BOLI_CHAT.id} runs ${BOLI_CHAT.label}. Only open models, priced per million tokens.`,
        cta: { label: "See the models", href: ROUTES.doc("models") },
    },
    {
        id: "docs",
        title: "Document intelligence",
        gloss: "Images and PDFs to text and JSON",
        line: "Read scanned bills, forms and PDFs in Nepali, English or both, and get the text back - or the fields as JSON.",
        stage: "next",
        span: 2,
    },
    {
        id: "speech",
        title: "Speech",
        gloss: "Speech to text and text to speech",
        line: "Talk in Nepali, get Romanized text back - and hear answers read aloud. It comes after document intelligence.",
        stage: "later",
        span: 3,
    },
]

function Slice({ id, compact }: { id: ProductId; compact?: boolean }) {
    if (id === "kura") return <KuraSlice compact={compact} />
    if (id === "api") return <ApiSlice />
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
                    <DhakaStrip tone={p.stage ? "tonal" : "sky"} scale={1.5} />
                    <div className={cn("grid flex-1 gap-5 p-5 sm:p-6", p.span && "md:grid-cols-[1fr_1.15fr] md:items-center", p.span === 3 && "lg:grid-cols-[1fr_1.6fr]")}>
                        <div className="flex min-w-0 flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <h3 className="text-[32px] leading-[1.02] text-boli-ink sm:text-[36px]" style={DISPLAY.h2}>
                                    {p.title}
                                </h3>
                                {p.stage ? <QuietBadge tone="outline">{p.stage === "next" ? "Next" : "Later"}</QuietBadge> : null}
                            </div>
                            <p className="font-sans text-xs text-boli-muted">{p.gloss}</p>
                            <p className="mt-1 font-sans text-sm leading-6 text-boli-text">{p.line}</p>
                            {p.cta ? (
                                <div className="pt-2">
                                    {/* The link covers the whole card (after:inset-0), so the card is one target. */}
                                    <AppLink
                                        href={p.cta.href}
                                        className="inline-flex cursor-pointer items-center gap-1 font-sans text-sm font-[450] text-boli-ink after:absolute after:inset-0 after:content-[''] group-hover/pc:underline group-hover/pc:underline-offset-4"
                                    >
                                        {p.cta.label}
                                        <ArrowUpRight
                                            aria-hidden
                                            strokeWidth={1.75}
                                            className="size-3.5 transition-transform group-hover/pc:-translate-y-0.5 group-hover/pc:translate-x-0.5 motion-reduce:transition-none"
                                        />
                                    </AppLink>
                                </div>
                            ) : (
                                <p className="pt-2 font-sans text-sm text-boli-muted">{p.stage === "next" ? "In the works - next on the roadmap" : "On the roadmap"}</p>
                            )}
                        </div>
                        <div className={cn("min-w-0 rounded-2xl p-4", p.stage ? "bg-boli-sand" : SKY_SOFT_BG)}>
                            <div className={cn(p.stage === "next" && "opacity-90 saturate-75", p.stage === "later" && "opacity-80 saturate-50")}>
                                <Slice id={p.id} compact={!p.span} />
                            </div>
                        </div>
                    </div>
                </article>
            ))}
        </div>
    )
}
