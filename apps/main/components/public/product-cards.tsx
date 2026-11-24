import { ArrowUpRight } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { cn } from "@repo/ui/lib/utils"
import { DhakaStrip } from "@/components/brand/dhaka-strip"
import { QuietBadge } from "@/components/brand/quiet-badge"
import { DISPLAY } from "@/components/brand/type"
import { BOLI_CHAT, KURA } from "@/lib/boli"
import { ROUTES } from "@/lib/navigation"
import { ApiSlice, KuraSlice, ModelSlice, SpeechSlice } from "./product-slices"
import { SKY_SOFT_BG } from "./tokens"

/*
 * PC3 (owner pick, 2026-11-24) - a hybrid bento: a Dhaka edge, a big Fraunces title, a real product slice. Kura and
 * Speech go wide. Speech is marked "Next", drawn quieter, and has no link (nothing to open yet).
 */

type ProductId = "kura" | "api" | "models" | "speech"

const PRODUCTS: readonly { id: ProductId; title: string; gloss: string; line: string; cta?: { label: string; href: string }; next?: boolean; wide?: boolean }[] = [
    {
        id: "kura",
        title: KURA.name,
        gloss: "कुरा - conversation",
        line: `${KURA.subtitle} - the way you already type.`,
        cta: { label: "Open Kura", href: ROUTES.kura },
        wide: true,
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
        id: "speech",
        title: "Speech",
        gloss: "Speech to text and text to speech",
        line: "Talk in Nepali, get Romanized text back - and hear answers read aloud. Coming after document reading.",
        next: true,
        wide: true,
    },
]

function Slice({ id, compact }: { id: ProductId; compact?: boolean }) {
    if (id === "kura") return <KuraSlice compact={compact} />
    if (id === "api") return <ApiSlice />
    if (id === "models") return <ModelSlice />
    return <SpeechSlice />
}

export function ProductCards({ className }: { className?: string }) {
    return (
        <div className={cn("grid gap-3 lg:grid-cols-3", className)}>
            {PRODUCTS.map((p) => (
                <article key={p.id} className={cn("group/pc relative flex min-w-0 flex-col overflow-hidden rounded-3xl border border-boli-line bg-white", p.wide && "lg:col-span-2")}>
                    <DhakaStrip tone={p.next ? "tonal" : "sky"} scale={1.5} />
                    <div className={cn("grid flex-1 gap-5 p-5 sm:p-6", p.wide && "md:grid-cols-[1fr_1.15fr] md:items-center")}>
                        <div className="flex min-w-0 flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <h3 className="text-[32px] leading-none text-boli-ink sm:text-[36px]" style={DISPLAY.h2}>
                                    {p.title}
                                </h3>
                                {p.next ? <QuietBadge tone="outline">Next</QuietBadge> : null}
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
                                <p className="pt-2 font-sans text-sm text-boli-muted">In the works</p>
                            )}
                        </div>
                        <div className={cn("min-w-0 rounded-2xl p-4", p.next ? "bg-boli-sand" : SKY_SOFT_BG)}>
                            <div className={cn(p.next && "opacity-80 saturate-50")}>
                                <Slice id={p.id} compact={!p.wide} />
                            </div>
                        </div>
                    </div>
                </article>
            ))}
        </div>
    )
}
