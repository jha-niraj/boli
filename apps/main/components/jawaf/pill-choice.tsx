"use client"

import { Button } from "@repo/ui/components/ui/button"
import { cn } from "@repo/ui/lib/utils"

const PILL = "h-9 cursor-pointer rounded-full px-4 text-sm font-normal"
const pillState = (on: boolean) => on
    ? "border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800 hover:text-white dark:border-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 dark:hover:text-neutral-900"
    : "border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"

/** One row of pill chips that behaves as a radio group (business type, tone, answer length). Ink when chosen. */
export function PillChoice<V extends string>({ label, options, value, onChange, disabled }: {
    label: string
    options: { value: V; label: string; hint?: string }[]
    value: V
    onChange: (v: V) => void
    disabled?: boolean
}) {
    return (
        <div role="radiogroup" aria-label={label} className="flex min-w-0 flex-wrap gap-2">
            {options.map((o) => (
                <Button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={value === o.value}
                    variant="outline"
                    title={o.hint}
                    disabled={disabled}
                    onClick={() => onChange(o.value)}
                    className={cn(PILL, pillState(value === o.value))}
                >
                    {o.label}
                </Button>
            ))}
        </div>
    )
}
