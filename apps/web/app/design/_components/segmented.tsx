"use client"

import * as ToggleGroup from "@radix-ui/react-toggle-group"
import { motion, useReducedMotion } from "framer-motion"
import { useId } from "react"
import { cn } from "@repo/ui/lib/utils"

/**
 * A segmented control for filters and small view switches (7d / 30d / All). A sand trough with a hairline, and the
 * active segment is a white chip with a soft shadow that slides - quieter than an inverted black chip, so it can sit
 * in a page header next to a primary button without competing with it.
 */
export function Segmented<T extends string>({
    value,
    onValueChange,
    options,
    label,
    size = "md",
    className,
}: {
    value: T
    onValueChange: (value: T) => void
    options: { value: T; label: string }[]
    /** Accessible name for the group. */
    label: string
    size?: "sm" | "md"
    className?: string
}) {
    const layoutId = useId()
    const reduce = useReducedMotion()
    return (
        <ToggleGroup.Root
            type="single"
            value={value}
            aria-label={label}
            onValueChange={(v) => {
                // Radix lets a single group deselect; a segmented control always has one choice.
                const next = options.find((o) => o.value === v)
                if (next) onValueChange(next.value)
            }}
            className={cn("inline-flex items-center gap-0.5 rounded-full border border-boli-line bg-boli-sand/60 p-1", className)}
        >
            {options.map((o) => {
                const active = o.value === value
                return (
                    <ToggleGroup.Item
                        key={o.value}
                        value={o.value}
                        className={cn(
                            "relative cursor-pointer rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-boli-ink/20",
                            size === "sm" ? "h-7 px-3 text-xs" : "h-8 px-4 text-[13px]",
                            active ? "text-boli-ink" : "text-boli-muted hover:text-boli-ink",
                        )}
                    >
                        {active ? (
                            <motion.span
                                layoutId={layoutId}
                                aria-hidden
                                className="absolute inset-0 rounded-full bg-white shadow-[0_1px_2px_rgba(20,20,20,0.08),0_0_0_1px_rgba(20,20,20,0.04)]"
                                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 38 }}
                            />
                        ) : null}
                        <span className="relative font-[450] tracking-[0.005em]">{o.label}</span>
                    </ToggleGroup.Item>
                )
            })}
        </ToggleGroup.Root>
    )
}
