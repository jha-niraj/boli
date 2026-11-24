import * as React from "react"
import { Input } from "@repo/ui/components/ui/input"
import { cn } from "@repo/ui/lib/utils"

/**
 * A labelled pill input: the label sits above in text-xs, the field is white on the warm ground with a hairline, and
 * focus is a soft ink ring (no brand colour). An optional `suffix` (a unit like "credits") sits inside on the right.
 */
export function QuietInput({
    label,
    hint,
    suffix,
    className,
    id,
    ...props
}: React.ComponentProps<typeof Input> & { label: string; hint?: string; suffix?: string }) {
    const autoId = React.useId()
    const inputId = id ?? autoId
    return (
        <div className={cn("grid gap-1.5", className)}>
            <label htmlFor={inputId} className="text-xs font-[450] tracking-[0.01em] text-boli-muted">
                {label}
            </label>
            <div className="relative">
                <Input
                    id={inputId}
                    {...props}
                    className={cn(
                        "h-11 rounded-full border-boli-line bg-white px-4 text-[15px] text-boli-ink shadow-[0_1px_0_rgba(20,20,20,0.02)] placeholder:text-[#a39d96] hover:border-[#d6d0c8] hover:bg-white focus-visible:border-boli-ink/40 focus-visible:ring-4 focus-visible:ring-boli-ink/[0.06]",
                        suffix && "pr-20",
                    )}
                />
                {suffix ? <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs text-boli-muted">{suffix}</span> : null}
            </div>
            {hint ? <p className="text-xs text-boli-muted">{hint}</p> : null}
        </div>
    )
}
