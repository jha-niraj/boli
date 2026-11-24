"use client"

import { useState, type ReactNode } from "react"
import { cn } from "@repo/ui/lib/utils"
import { KuraScene } from "@/components/art/kura/kura-scene"
import { PixelReveal } from "@/components/art/story/reveal"
import { STORY_SCENES } from "@/components/art/story/scenes"
import { VALLEY_DAY } from "@/components/art/valley/palette"
import { ValleyHero } from "@/components/art/valley/valley"
import { DISPLAY } from "@/components/brand/type"
import { ADD_CREDITS_MIN, API_KEY_PREFIX, API_PATHS, CREDIT_PACKS, MAX_API_KEYS, maskKey, WELCOME_CREDITS } from "@/lib/boli"
import { SKY_TEXT } from "./tokens"

/*
 * PS2 (approved 2026-11-24): numbered expanding panels - hover, focus or tap a number and its panel widens. On the
 * landing it tells a DIFFERENT story from PS1: how Boli works for a developer, from sign-up to paying in rupees. Each
 * panel frames a pixel scene with one real product moment (a credit line, a key, a request, a payment).
 */

const PACK = CREDIT_PACKS.find((p) => p.credits > p.rupees) ?? CREDIT_PACKS[0]

type Step = { n: string; title: string; text: string; moment: ReactNode; art: (open: boolean) => ReactNode }

const ART = "block aspect-[96/60] w-full"

const STEPS: readonly Step[] = [
    {
        n: "01",
        title: `Sign up, get ${WELCOME_CREDITS} credits`,
        text: `Make an account with your email. Verify it and ${WELCOME_CREDITS} free credits land - no card, no call with sales.`,
        moment: (
            <>
                <span className={SKY_TEXT}>+{WELCOME_CREDITS}.00</span> credits - welcome
            </>
        ),
        art: (open) => (STORY_SCENES[3] ? <PixelReveal scene={STORY_SCENES[3]} palette={VALLEY_DAY} on={open} className={ART} /> : null),
    },
    {
        n: "02",
        title: "Create a key",
        text: `Name a key and copy it once - we keep only its hash. Up to ${MAX_API_KEYS} keys, each one revoked on its own.`,
        moment: <span className="font-mono">{maskKey(`${API_KEY_PREFIX}7f3k`)}</span>,
        art: (open) => (STORY_SCENES[2] ? <PixelReveal scene={STORY_SCENES[2]} palette={VALLEY_DAY} on={open} className={ART} /> : null),
    },
    {
        n: "03",
        title: "Call the API in any language",
        text: "cURL, Python, TypeScript, JavaScript or Go with the OpenAI SDK. Change the base URL, keep your code - ask in Nepali, English or both.",
        moment: (
            <span className="font-mono">
                <span className={SKY_TEXT}>POST</span> {API_PATHS.chatCompletions} - 200
            </span>
        ),
        art: () => <KuraScene className={ART} />,
    },
    {
        n: "04",
        title: "Pay in rupees",
        text: `Top up from Rs ${ADD_CREDITS_MIN.toLocaleString("en-US")} with eSewa or Khalti. Every call shows its tokens and its cost, to a millionth of a credit.`,
        moment: PACK ? (
            <>
                Rs {PACK.rupees.toLocaleString("en-US")} <span className="text-boli-muted">-&gt;</span> <span className={SKY_TEXT}>{PACK.credits.toLocaleString("en-US")} credits</span>
            </>
        ) : (
            "Paid with eSewa"
        ),
        art: () => <ValleyHero variant="day" crop="portrait" preserve="xMidYMax slice" className={ART} />,
    },
]

export function StepsPanels({ className }: { className?: string }) {
    const [active, setActive] = useState(0)
    return (
        <div className={cn("flex flex-col gap-px overflow-hidden rounded-3xl border border-boli-line bg-boli-line lg:h-[36rem] lg:flex-row", className)}>
            {STEPS.map((step, i) => {
                const open = i === active
                return (
                    <div
                        key={step.n}
                        role="button"
                        tabIndex={0}
                        aria-expanded={open}
                        onMouseEnter={() => setActive(i)}
                        onFocus={() => setActive(i)}
                        onClick={() => setActive(i)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault()
                                setActive(i)
                            }
                        }}
                        className={cn(
                            "relative flex min-w-0 cursor-pointer flex-col overflow-hidden bg-white p-5 outline-none transition-[flex-grow,background-color] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-boli-ink/30 motion-reduce:transition-none sm:p-6",
                            open ? "lg:grow-[4]" : "hover:bg-boli-ground lg:grow",
                        )}
                        style={{ flexBasis: 0 }}
                    >
                        <p className="font-mono text-xs text-boli-muted">{step.n}</p>
                        <h3 className={cn("mt-3 leading-tight text-boli-ink", open ? "text-[26px] sm:text-[30px]" : "text-xl")} style={DISPLAY.h3}>
                            {step.title}
                        </h3>
                        <div className={cn("flex min-h-0 flex-1 flex-col justify-end gap-4 pt-4", open ? "flex" : "hidden")}>
                            <div className="relative mx-auto w-full max-w-xl overflow-hidden rounded-xl border border-boli-line">
                                {step.art(open)}
                                <p className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] truncate rounded-full bg-white/90 px-3 py-1 font-sans text-xs text-boli-ink shadow-[0_1px_2px_rgba(20,20,20,0.08)] backdrop-blur">
                                    {step.moment}
                                </p>
                            </div>
                            <p className="max-w-md font-sans text-sm leading-6 text-boli-text">{step.text}</p>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
