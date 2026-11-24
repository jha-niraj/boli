"use client"

import { useState } from "react"
import { cn } from "@repo/ui/lib/utils"
import { ArtFrame } from "../frame"
import { VALLEY_DAY } from "../valley/palette"
import { STORY, useOnView } from "./on-view"
import { PixelReveal } from "./reveal"
import { STORY_SCENES } from "./scenes"

/*
 * Story art, round 3 (v3 kit): "pixel scenes with bold coloured outlines". The four steps as small scenes from the P1 v3 world
 * (same palette, same pixel unit), revealed outline first and then filled, row by row.
 *
 * PS1 - four stacked scroll panels (About): each scene reveals as it scrolls into view.
 * PS2 - numbered expanding panels (landing): the open panel widens and its scene reveals.
 */

const STEPS = STORY.map((s, i) => ({ n: s.n, title: s.title, text: s.text, scene: STORY_SCENES[i] }))

function ScrollPanel({ step, flip }: { step: (typeof STEPS)[number]; flip: boolean }) {
    const [ref, on] = useOnView<HTMLDivElement>()
    return (
        <div ref={ref} className="grid min-w-0 items-center gap-6 bg-white p-6 sm:p-10 md:grid-cols-[1fr_1.4fr] md:gap-10">
            <div className={cn("flex min-w-0 flex-col gap-2", flip && "md:order-2")}>
                <p className="font-mono text-xs text-boli-muted">{step.n}</p>
                <h3 className="font-serif text-3xl leading-tight text-boli-ink">{step.title}</h3>
                <p className="max-w-md text-sm leading-6 text-boli-text">{step.text}</p>
            </div>
            <div className="min-w-0 overflow-hidden rounded-xl border border-boli-line">
                {step.scene && <PixelReveal scene={step.scene} palette={VALLEY_DAY} on={on} className="block aspect-[96/60] w-full" />}
            </div>
        </div>
    )
}

export function ExpandingPixelPanels() {
    const [active, setActive] = useState(0)
    return (
        <div className="flex flex-col gap-px bg-boli-line lg:h-[34rem] lg:flex-row">
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
                        className={cn(
                            "relative flex min-w-0 cursor-pointer flex-col overflow-hidden bg-white p-6 outline-none transition-[flex-grow,background-color] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:ring-2 focus-visible:ring-boli-ink/30",
                            open ? "lg:grow-[4]" : "lg:grow hover:bg-boli-ground",
                        )}
                        style={{ flexBasis: 0 }}
                    >
                        <p className="font-mono text-xs text-boli-muted">{step.n}</p>
                        <h3 className={cn("mt-3 font-serif leading-tight text-boli-ink", open ? "text-3xl" : "text-xl")}>{step.title}</h3>
                        <div className={cn("flex min-h-0 flex-1 flex-col justify-end gap-4", open ? "opacity-100" : "hidden opacity-0 lg:flex")}>
                            <div className="mx-auto w-full max-w-xl overflow-hidden rounded-xl border border-boli-line">
                                {step.scene && <PixelReveal scene={step.scene} palette={VALLEY_DAY} on={open} className="block aspect-[96/60] w-full" />}
                            </div>
                            <p className="max-w-md text-sm leading-6 text-boli-text">{step.text}</p>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

export function PixelStory() {
    return (
        <div className="flex flex-col gap-12">
            <ArtFrame
                code="PS1"
                title="The story in four pixel scenes - scroll panels"
                use="About page body: one panel per step, text beside the scene; each scene draws its outline, then fills, row by row as it scrolls in."
                bodyClassName="bg-boli-line"
            >
                <div className="flex flex-col gap-px">
                    {STEPS.map((step, i) => (
                        <ScrollPanel key={step.n} step={step} flip={i % 2 === 1} />
                    ))}
                </div>
            </ArtFrame>
            <ArtFrame
                code="PS2"
                title="The story in four pixel scenes - numbered expanding panels"
                use="Landing 'How Boli works': hover or tap a number, the panel widens and its scene reveals."
            >
                <ExpandingPixelPanels />
            </ArtFrame>
        </div>
    )
}
