"use client"

import * as TabsPrimitive from "@radix-ui/react-tabs"
import { motion, useReducedMotion } from "framer-motion"
import { useId, type ReactNode } from "react"
import { cn } from "@repo/ui/lib/utils"

/**
 * Editorial tabs: labels in body text on a hairline, the active one in ink with a 1.5px ink rule that slides under it.
 * No boxes, no fill. For section switches on public pages and docs (Overview / Pricing / Limits), not for filters -
 * filters use the Segmented control.
 */
export function QuietTabs({
    value,
    onValueChange,
    tabs,
    children,
    className,
}: {
    value: string
    onValueChange: (value: string) => void
    tabs: { value: string; label: string; count?: number }[]
    children?: ReactNode
    className?: string
}) {
    const layoutId = useId()
    const reduce = useReducedMotion()
    return (
        <TabsPrimitive.Root value={value} onValueChange={onValueChange} className={className}>
            <TabsPrimitive.List className="flex gap-7 border-b border-boli-line">
                {tabs.map((t) => {
                    const active = t.value === value
                    return (
                        <TabsPrimitive.Trigger
                            key={t.value}
                            value={t.value}
                            className={cn(
                                "relative -mb-px inline-flex cursor-pointer items-baseline gap-1.5 pb-3 pt-1 text-sm tracking-[0.005em] outline-none transition-colors focus-visible:text-boli-ink",
                                active ? "text-boli-ink" : "text-boli-muted hover:text-boli-ink",
                            )}
                        >
                            {t.label}
                            {t.count != null ? <span className="text-xs tabular-nums text-boli-muted">{t.count}</span> : null}
                            {active ? (
                                <motion.span
                                    layoutId={layoutId}
                                    aria-hidden
                                    className="absolute inset-x-0 bottom-0 h-[1.5px] bg-boli-ink"
                                    transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }}
                                />
                            ) : null}
                        </TabsPrimitive.Trigger>
                    )
                })}
            </TabsPrimitive.List>
            {children}
        </TabsPrimitive.Root>
    )
}

export const QuietTabPanel = TabsPrimitive.Content
