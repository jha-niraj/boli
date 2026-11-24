"use client"

import { ArrowUpRight } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@repo/ui/lib/utils"
import { BOLI_CHAT, KURA } from "@/lib/boli"
import { DhakaStrip } from "./dhaka-strip"
import { R2Head } from "./r2-head"
import { useSky, type Sky } from "./sky"
import { ApiSlice, KuraSlice, ModelSlice, SpeechSlice } from "./slices"
import { sans, serif } from "./t1"

export type ProductId = "kura" | "api" | "models" | "speech"

export const PRODUCTS: { id: ProductId; title: string; gloss: string; line: string; cta: string; next?: boolean }[] = [
    { id: "kura", title: KURA.name, gloss: "कुरा - conversation", line: "Chat with Boli's model in Nepali, English or both - the way you already type.", cta: "Open Kura" },
    { id: "api", title: "API", gloss: "OpenAI-compatible", line: "Point the OpenAI SDK at Boli's /v1, stream tokens, pay per token in rupees.", cta: "Read the quickstart" },
    { id: "models", title: "Models", gloss: "Open weights only", line: `${BOLI_CHAT.id} runs ${BOLI_CHAT.label}. Only open models, priced per million tokens.`, cta: "See the models" },
    { id: "speech", title: "Speech", gloss: "Speech to text, next", line: "Talk in Nepali, get Romanized text back. Coming after document reading.", cta: "Get notified", next: true },
]

export function Slice({ id, sky, compact }: { id: ProductId; sky: Sky; compact?: boolean }) {
    if (id === "kura") return <KuraSlice sky={sky} compact={compact} />
    if (id === "api") return <ApiSlice sky={sky} />
    if (id === "models") return <ModelSlice sky={sky} />
    return <SpeechSlice sky={sky} />
}

function NextBadge() {
    return (
        <span className="inline-flex h-6 items-center rounded-full border border-boli-line bg-white px-2.5 text-xs text-boli-text" style={sans(450)}>
            Next
        </span>
    )
}

function CardLink({ children, muted }: { children: ReactNode; muted?: boolean }) {
    return (
        <span className={cn("inline-flex cursor-pointer items-center gap-1 text-sm transition-colors", muted ? "text-boli-muted" : "text-boli-ink group-hover/pc:underline group-hover/pc:underline-offset-4")} style={sans(450)}>
            {children}
            <ArrowUpRight aria-hidden strokeWidth={1.75} className="size-3.5 transition-transform group-hover/pc:-translate-y-0.5 group-hover/pc:translate-x-0.5 motion-reduce:transition-none" />
        </span>
    )
}

/** PC3 (owner pick) - hybrid bento: a Dhaka edge, a big Fraunces title, a real product slice. Kura and Speech go wide. */
export function ProductBento({ className }: { className?: string }) {
    const sky = useSky()
    const wide: Record<ProductId, boolean> = { kura: true, api: false, models: false, speech: true }
    return (
        <div className={cn("grid gap-3 lg:grid-cols-3", className)}>
            {PRODUCTS.map((p) => (
                <article
                    key={p.id}
                    className={cn("group/pc flex min-w-0 flex-col overflow-hidden rounded-3xl border border-boli-line bg-white", wide[p.id] && "lg:col-span-2")}
                >
                    <DhakaStrip sky={sky} tone={p.next ? "tonal" : "sky"} scale={1.5} />
                    <div className={cn("grid flex-1 gap-5 p-5", wide[p.id] && "md:grid-cols-[1fr_1.15fr] md:items-center")}>
                        <div className="flex min-w-0 flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <h3 className="text-[36px] leading-none text-boli-ink" style={serif(380, 96, "-0.028em")}>
                                    {p.title}
                                </h3>
                                {p.next ? <NextBadge /> : null}
                            </div>
                            <p className="text-xs text-boli-muted">{p.gloss}</p>
                            <p className="mt-1 text-sm leading-6 text-boli-text">{p.line}</p>
                            <div className="pt-2">
                                <CardLink muted={p.next}>{p.cta}</CardLink>
                            </div>
                        </div>
                        <div className="min-w-0 rounded-2xl p-4" style={{ background: p.next ? "#f1eeea" : sky.soft }}>
                            <div className={cn(p.next && "opacity-80 saturate-50")}>
                                <Slice id={p.id} sky={sky} compact={!wide[p.id]} />
                            </div>
                        </div>
                    </div>
                </article>
            ))}
        </div>
    )
}

export function ProductCards({ n = "05" }: { n?: string }) {
    return (
        <section id="final-products" className="grid scroll-mt-28 gap-8">
            <R2Head n={n} title="Product cards - PC3" line="Each card shows the product doing its job: a Dhaka edge, a big Fraunces title, a real slice. Speech is marked Next and drawn quieter." codes="PC3" />
            <ProductBento />
        </section>
    )
}
