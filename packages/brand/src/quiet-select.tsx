"use client"

import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"

export type QuietOption = { value: string; label: string; hint?: string }

/**
 * A pill select in Boli's character: white on the warm ground, a hairline, an inline label ("Model") before the value,
 * a thin chevron that turns when open. The list is a soft white panel with the check on the right and an optional
 * one-line hint under each option. Radix does the keyboard and typeahead.
 */
export function QuietSelect({
    label,
    value,
    onValueChange,
    options,
    className,
    emptyMessage = "Nothing to choose yet",
}: {
    label?: string
    value: string
    onValueChange: (value: string) => void
    options: QuietOption[]
    className?: string
    emptyMessage?: string
}) {
    return (
        <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
            <SelectPrimitive.Trigger
                aria-label={label}
                className={cn(
                    "group/sel inline-flex h-11 min-w-0 cursor-pointer items-center gap-2 rounded-full border border-boli-line bg-white pl-4 pr-3 text-[15px] text-boli-ink outline-none transition-colors hover:border-[#d6d0c8] focus-visible:border-boli-ink/40 data-[state=open]:border-boli-ink/30",
                    className,
                )}
            >
                {label ? <span className="shrink-0 text-xs tracking-[0.01em] text-boli-muted">{label}</span> : null}
                <span className="min-w-0 flex-1 truncate text-left font-[450]">
                    <SelectPrimitive.Value />
                </span>
                <SelectPrimitive.Icon asChild>
                    <ChevronDown strokeWidth={1.5} className="size-4 shrink-0 text-boli-muted transition-transform duration-300 group-data-[state=open]/sel:rotate-180 motion-reduce:transition-none" />
                </SelectPrimitive.Icon>
            </SelectPrimitive.Trigger>
            <SelectPrimitive.Portal>
                <SelectPrimitive.Content
                    position="popper"
                    sideOffset={8}
                    className="z-50 max-h-[min(22rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl border border-boli-line bg-white p-1.5 text-boli-ink shadow-[0_12px_32px_-12px_rgba(20,20,20,0.18),0_2px_6px_-2px_rgba(20,20,20,0.06)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
                >
                    <SelectPrimitive.Viewport>
                        {options.length === 0 ? <p className="px-3 py-2.5 text-sm text-boli-muted">{emptyMessage}</p> : null}
                        {options.map((o) => (
                            <SelectPrimitive.Item
                                key={o.value}
                                value={o.value}
                                className="relative flex cursor-pointer select-none items-start gap-3 rounded-xl py-2.5 pl-3 pr-9 text-sm outline-none transition-colors data-[highlighted]:bg-boli-ground data-[state=checked]:font-[450]"
                            >
                                <span className="grid min-w-0 gap-0.5">
                                    <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
                                    {o.hint ? <span className="truncate text-xs text-boli-muted">{o.hint}</span> : null}
                                </span>
                                <SelectPrimitive.ItemIndicator className="absolute right-3 top-3">
                                    <Check strokeWidth={1.75} className="size-4" />
                                </SelectPrimitive.ItemIndicator>
                            </SelectPrimitive.Item>
                        ))}
                    </SelectPrimitive.Viewport>
                </SelectPrimitive.Content>
            </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
    )
}
