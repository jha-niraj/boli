"use client"

import { useState, useSyncExternalStore, type ReactNode } from "react"
import { cn } from "@repo/ui/lib/utils"
import { KuraScene } from "@repo/brand/art/kura/kura-scene"
import { useOnView } from "@repo/brand/art/story/on-view"
import { PixelReveal } from "@repo/brand/art/story/reveal"
import { STORY_SCENES } from "@repo/brand/art/story/scenes"
import { VALLEY_DAY } from "@repo/brand/art/valley/palette"
import { ValleyHero } from "@repo/brand/art/valley/valley"
import { DISPLAY } from "@repo/brand/type"
import { ADD_CREDITS_MIN, API_KEY_PREFIX, API_PATHS, CREDIT_PACKS, MAX_API_KEYS, maskKey, WELCOME_CREDITS } from "@repo/boli"
import { SKY_TEXT } from "./tokens"

/*
 * PS2 (approved 2026-11-24): numbered expanding panels - hover, focus or tap a number and its panel widens. On the
 * landing it tells a DIFFERENT story from PS1: how Boli works for a developer, from sign-up to paying in rupees. Each
 * panel frames a pixel scene with one real product moment (a credit line, a key, a request, a payment).
 */

const PACK = CREDIT_PACKS.find((p) => p.credits > p.rupees) ?? CREDIT_PACKS[0]

type Step = { n: string; title: string; text: string; moment: ReactNode; art: (open: boolean) => ReactNode }

const ART = "block aspect-[96/60] w-full lg:aspect-auto lg:h-full"

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

const LG = "(min-width: 1024px)"

function subscribeLg(onChange: () => void) {
    const mq = window.matchMedia(LG)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
}

/** True from lg up (the expanding row); false on the server and below lg (the stacked list). */
function useIsLg(): boolean {
    return useSyncExternalStore(
        subscribeLg,
        () => window.matchMedia(LG).matches,
        () => false,
    )
}

/*
 * Motion (owner, 2026-11-24, round 4): only the panel WIDTH animates. Inside, nothing is in the flow below the title,
 * so nothing gets pushed: the number and title sit at the top and keep their size; the text and the picture are pinned
 * to the bottom at a fixed width and a fixed height, and only fade (and the picture scales from 97%) in place. A
 * collapsed panel shows its number and title. Below lg every panel is open in a plain stack, each scene revealing as it
 * scrolls in. Reduced motion: no transitions at all.
 */
function Panel({ step, open, lg, onOpen }: { step: Step; open: boolean; lg: boolean; onOpen: () => void }) {
    const [ref, seen] = useOnView<HTMLDivElement>()
    // Visibility is CSS (lg: classes keyed on `open`), so the first paint before hydration is already right; only the
    // scene's reveal and the interaction wait for JS.
    const shown = open
    const on = lg ? open : seen
    return (
        <div
            ref={ref}
            role={lg ? "button" : undefined}
            tabIndex={lg ? 0 : undefined}
            aria-expanded={lg ? open : undefined}
            onMouseEnter={lg ? onOpen : undefined}
            onFocus={lg ? onOpen : undefined}
            onClick={lg ? onOpen : undefined}
            onKeyDown={
                lg
                    ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              onOpen()
                          }
                      }
                    : undefined
            }
            className={cn(
                "relative flex min-w-0 flex-col overflow-hidden bg-white p-5 outline-none sm:p-6 lg:basis-0 lg:cursor-pointer",
                "lg:transition-[flex-grow,background-color] lg:duration-700 lg:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-boli-ink/30",
                open ? "lg:grow-[4]" : "lg:grow lg:hover:bg-boli-ground",
            )}
        >
            <p className="font-mono text-xs text-boli-muted">{step.n}</p>
            <h3 className="mt-3 text-2xl leading-tight text-boli-ink" style={DISPLAY.h3}>
                {step.title}
            </h3>
            {/* Text and picture: in the flow below lg; pinned to the bottom, fixed width, from lg up. */}
            <div
                aria-hidden={lg && !open ? true : undefined}
                className={cn(
                    "mt-5 grid gap-5 lg:absolute lg:inset-x-6 lg:bottom-6 lg:mt-0 lg:w-[30rem] lg:max-w-none",
                    "lg:transition-opacity lg:duration-500 motion-reduce:transition-none",
                    shown ? "lg:opacity-100 lg:delay-150" : "lg:pointer-events-none lg:opacity-0 lg:delay-0",
                )}
            >
                <p className="max-w-md font-sans text-sm leading-6 text-boli-text">{step.text}</p>
                <div
                    className={cn(
                        "relative w-full overflow-hidden rounded-xl border border-boli-line lg:h-[18.75rem]",
                        "origin-bottom-left lg:transition-transform lg:duration-500 lg:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                        shown ? "lg:scale-100" : "lg:scale-[0.97]",
                    )}
                >
                    {step.art(on)}
                    <p className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] rounded-full bg-white/90 px-3 py-1 font-sans text-xs text-boli-ink shadow-[0_1px_2px_rgba(20,20,20,0.08)] backdrop-blur">
                        {step.moment}
                    </p>
                </div>
            </div>
        </div>
    )
}

export function StepsPanels({ className }: { className?: string }) {
    const [active, setActive] = useState(0)
    const lg = useIsLg()
    return (
        <div className={cn("flex flex-col gap-px overflow-hidden rounded-3xl border border-boli-line bg-boli-line lg:h-[36rem] lg:flex-row", className)}>
            {STEPS.map((step, i) => (
                <Panel key={step.n} step={step} open={i === active} lg={lg} onOpen={() => setActive(i)} />
            ))}
        </div>
    )
}
