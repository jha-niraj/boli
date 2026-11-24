"use client"

import * as AccordionPrimitive from "@radix-ui/react-accordion"
import type { CSSProperties, ReactNode } from "react"
import { cn } from "@repo/ui/lib/utils"

export type FaqItem = { q: string; a: ReactNode }

/**
 * The FAQ as an editorial list - no boxes. Each row is a hairline, a two-digit number, a large serif question and a
 * small plus that turns into a minus; the answer slides open below in body text, aligned under the question.
 *
 * Radix Accordion does the keyboard (Tab between questions, Enter / Space to open, aria-expanded) and publishes the
 * measured height, so the open animation is a real height transition. `prefers-reduced-motion` is honoured by the
 * shared globals (accordion animations land at 1ms) and by `motion-reduce:` on the icon here.
 */
export function EditorialFaq({
    items,
    questionStyle,
    className,
    defaultOpen,
}: {
    items: FaqItem[]
    /** Font for the questions (the display face). */
    questionStyle?: CSSProperties
    className?: string
    defaultOpen?: string
}) {
    return (
        <AccordionPrimitive.Root type="single" collapsible defaultValue={defaultOpen} className={cn("border-b border-boli-line", className)}>
            {items.map((item, i) => {
                const n = String(i + 1).padStart(2, "0")
                return (
                    <AccordionPrimitive.Item key={item.q} value={n} className="group/faq border-t border-boli-line">
                        <AccordionPrimitive.Header asChild>
                            <h3>
                                <AccordionPrimitive.Trigger className="grid w-full cursor-pointer grid-cols-[2.5rem_1fr_auto] items-baseline gap-x-4 py-6 text-left outline-none transition-colors focus-visible:bg-boli-sand/60 sm:grid-cols-[4rem_1fr_auto] sm:py-7">
                                    <span className="text-xs tabular-nums tracking-[0.04em] text-boli-muted transition-colors group-data-[state=open]/faq:text-boli-ink">
                                        {n}
                                    </span>
                                    <span
                                        style={questionStyle}
                                        className="text-[22px] leading-[1.2] text-boli-ink transition-colors group-hover/faq:text-black sm:text-[28px]"
                                    >
                                        {item.q}
                                    </span>
                                    <PlusMinus />
                                </AccordionPrimitive.Trigger>
                            </h3>
                        </AccordionPrimitive.Header>
                        <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-[accordion-up_320ms_cubic-bezier(0.32,0.72,0,1)] data-[state=open]:animate-[accordion-down_420ms_cubic-bezier(0.32,0.72,0,1)] motion-reduce:animate-none">
                            <div className="grid grid-cols-[2.5rem_1fr_auto] gap-x-4 pb-8 sm:grid-cols-[4rem_1fr_auto]">
                                <p className="col-start-2 max-w-2xl text-[15px] leading-7 text-boli-text opacity-0 transition-opacity delay-100 duration-300 group-data-[state=open]/faq:opacity-100 motion-reduce:transition-none">
                                    {item.a}
                                </p>
                            </div>
                        </AccordionPrimitive.Content>
                    </AccordionPrimitive.Item>
                )
            })}
        </AccordionPrimitive.Root>
    )
}

/** Two hairline bars; the vertical one turns flat when the row opens, so + becomes - (the whole icon turns with it). */
function PlusMinus() {
    return (
        <span
            aria-hidden
            className="relative mt-1 size-5 self-start transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-data-[state=open]/faq:rotate-180 motion-reduce:transition-none sm:mt-2"
        >
            <span className="absolute left-1/2 top-1/2 h-px w-3.5 -translate-x-1/2 -translate-y-1/2 bg-boli-ink" />
            <span className="absolute left-1/2 top-1/2 h-3.5 w-px -translate-x-1/2 -translate-y-1/2 bg-boli-ink transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-data-[state=open]/faq:rotate-90 motion-reduce:transition-none" />
        </span>
    )
}
