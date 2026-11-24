"use client"

import { motion, useInView, useReducedMotion } from "framer-motion"
import { useRef } from "react"
import { cn } from "@repo/ui/lib/utils"
import { BoliLogo } from "@repo/brand/boli-logo"
import { SKY_SOFT_BG, SKY_TEXT } from "./tokens"

/*
 * Small example exchanges, one card per way of writing (the product pages: Kura and Jawaf). The question is there at
 * once; the reply waits behind three typing dots and fades in when the card scrolls into view, the cards one after the
 * other. Under prefers-reduced-motion the replies are simply there. Examples, not transcripts: the page says so.
 */

export type Exchange = {
    /** "Romanized Nepali", "English", ... */
    label: string
    q: string
    a: string
    /** A chip under the reply: where the answer came from, or the call-back ask when it did not know. */
    chip?: { label: string; tone: "source" | "action" }
}

export function LanguageExchanges({ items, avatar = false, className }: { items: readonly Exchange[]; avatar?: boolean; className?: string }) {
    const ref = useRef<HTMLUListElement>(null)
    const seen = useInView(ref, { once: true, margin: "-60px" })
    const reduce = useReducedMotion()
    const show = Boolean(reduce) || seen
    return (
        <ul ref={ref} className={cn("grid gap-3 sm:grid-cols-2", className)}>
            {items.map((x, i) => {
                const delay = 0.7 + i * 0.45
                return (
                    <li key={x.label + x.q} className="flex min-w-0 flex-col gap-3 rounded-3xl border border-boli-line bg-white p-5 font-sans">
                        <p className={cn("text-xs", SKY_TEXT)}>{x.label}</p>
                        <div className="flex justify-end">
                            <p className="max-w-[85%] rounded-2xl rounded-br-md bg-boli-ground px-3.5 py-2 text-sm leading-6 text-boli-ink">{x.q}</p>
                        </div>
                        <div className="grid [&>*]:col-start-1 [&>*]:row-start-1">
                            <motion.div
                                aria-hidden
                                className="flex h-8 items-center gap-1 pl-1"
                                initial={reduce ? false : { opacity: 1 }}
                                animate={show ? { opacity: 0 } : undefined}
                                transition={{ delay, duration: 0.2 }}
                            >
                                {[0, 1, 2].map((d) => (
                                    <span
                                        key={d}
                                        className="size-1.5 animate-pulse rounded-full bg-boli-muted motion-reduce:animate-none"
                                        style={{ animationDelay: `${d * 0.2}s` }}
                                    />
                                ))}
                            </motion.div>
                            <motion.div
                                className="flex min-w-0 items-start gap-2"
                                initial={reduce ? false : { opacity: 0, y: 6 }}
                                animate={show ? { opacity: 1, y: 0 } : undefined}
                                transition={{ delay: delay + 0.15, duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
                            >
                                {avatar ? (
                                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-boli-line">
                                        <BoliLogo wordmark={false} size={11} />
                                    </span>
                                ) : null}
                                <div className="grid min-w-0 gap-2">
                                    <p className="text-sm leading-6 text-boli-ink">{x.a}</p>
                                    {x.chip ? (
                                        <span
                                            className={cn(
                                                "inline-flex h-7 w-fit items-center rounded-full px-3 text-xs",
                                                x.chip.tone === "action" ? cn(SKY_SOFT_BG, SKY_TEXT) : "border border-boli-line bg-white text-boli-muted",
                                            )}
                                        >
                                            {x.chip.label}
                                        </span>
                                    ) : null}
                                </div>
                            </motion.div>
                        </div>
                    </li>
                )
            })}
        </ul>
    )
}
