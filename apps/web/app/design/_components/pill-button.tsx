import * as React from "react"
import { Button } from "@repo/ui/components/ui/button"
import { cn } from "@repo/ui/lib/utils"

export type PillVariant = "primary" | "secondary" | "ghost"
export type PillSize = "sm" | "md" | "lg"

const VARIANT: Record<PillVariant, string> = {
    // Near-black, never crimson (owner, 2026-11-24). The lift is a hairline of light at the top edge, not a shadow.
    primary: "bg-boli-ink text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-[#2a2826] active:bg-black",
    secondary: "border border-boli-line bg-white text-boli-ink hover:border-[#d6d0c8] hover:bg-[#fbfaf8] active:bg-boli-sand",
    ghost: "bg-transparent text-boli-ink hover:bg-boli-sand/70 active:bg-boli-sand",
}

const SIZE: Record<PillSize, string> = {
    sm: "h-8 gap-1.5 px-3.5 text-[13px] [&_svg]:size-3.5",
    md: "h-10 gap-2 px-5 text-sm [&_svg]:size-4",
    lg: "h-12 gap-2 px-6 text-[15px] [&_svg]:size-4",
}

export type PillButtonProps = Omit<React.ComponentProps<typeof Button>, "variant" | "size"> & {
    variant?: PillVariant
    size?: PillSize
}

/**
 * Boli's button: a pill in one of three weights. Built on the shared Button (focus ring, Slot via `asChild`), with the
 * colour and size decided here so a call site states intent, never classes. Label weight 450 - between regular and
 * medium, the Sarvam 425 feel without looking thin on a dark fill.
 */
export function PillButton({ variant = "primary", size = "md", className, ...props }: PillButtonProps) {
    return (
        <Button
            {...props}
            className={cn(
                "rounded-full font-[450] tracking-[0.005em] transition-[background-color,border-color,transform] duration-200 ease-out active:scale-[0.98] motion-reduce:active:scale-100",
                VARIANT[variant],
                SIZE[size],
                className,
            )}
        />
    )
}
