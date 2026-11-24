"use client"

import { cn } from "@repo/ui/lib/utils"
import { STORY, useOnView } from "@/components/art/story/on-view"
import { PixelReveal } from "@/components/art/story/reveal"
import { STORY_SCENES } from "@/components/art/story/scenes"
import { VALLEY_DAY } from "@/components/art/valley/palette"
import { DISPLAY } from "@/components/brand/type"

/*
 * PS1 (approved 2026-11-24): the story as four stacked scroll panels - the gap, models need running, Boli runs them,
 * anyone builds. Each pixel scene draws its outline, then fills, row by row as it scrolls in (finished at once under
 * prefers-reduced-motion, art.css). Text and scene swap sides on alternate panels from md up.
 */

const STEPS = STORY.map((s, i) => ({ ...s, scene: STORY_SCENES[i] }))

function Panel({ step, flip }: { step: (typeof STEPS)[number]; flip: boolean }) {
    const [ref, on] = useOnView<HTMLDivElement>()
    return (
        <div ref={ref} className="grid min-w-0 items-center gap-6 bg-white p-5 sm:p-10 md:grid-cols-[1fr_1.4fr] md:gap-10">
            <div className={cn("flex min-w-0 flex-col gap-2", flip && "md:order-2")}>
                <p className="font-mono text-xs text-boli-muted">{step.n}</p>
                <h3 className="text-[28px] leading-tight text-boli-ink sm:text-[32px]" style={DISPLAY.h3}>
                    {step.title}
                </h3>
                <p className="max-w-md font-sans text-[15px] leading-7 text-boli-text">{step.text}</p>
            </div>
            <div className="min-w-0 overflow-hidden rounded-xl border border-boli-line">
                {step.scene ? <PixelReveal scene={step.scene} palette={VALLEY_DAY} on={on} className="block aspect-[96/60] w-full" /> : null}
            </div>
        </div>
    )
}

export function StoryPanels({ className }: { className?: string }) {
    return (
        <div className={cn("flex flex-col gap-px overflow-hidden rounded-3xl border border-boli-line bg-boli-line", className)}>
            {STEPS.map((step, i) => (
                <Panel key={step.n} step={step} flip={i % 2 === 1} />
            ))}
        </div>
    )
}
