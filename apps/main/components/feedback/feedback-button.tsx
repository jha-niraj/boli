"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { MessageSquarePlus, Star } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@repo/brand/loaders/spinners"
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/ui/popover"
import { RailRowButton, useProductRail } from "@repo/ui/components/shell/product-rail"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/components/ui/tooltip"
import { toast } from "@repo/ui/components/ui/toast"
import { cn } from "@repo/ui/lib/utils"
import { sendFeedback } from "@/actions/feedback.action"

const RATINGS = [1, 2, 3, 4, 5] as const

/**
 * "Send feedback": opens a popover with a message, an optional 1-5 rating and Send. Saved to the `feedback` table with
 * the page it was sent from.
 *
 * - `variant="icon"`: a round icon button (tooltip + aria-label).
 * - `variant="rail"`: one product-rail foot row (owner, 2026-11-25: the WHOLE row opens it, with the row hover). Drawn
 *   with the rail's `RailRowButton`; while the popover is open the rail stays wide (`useProductRail`).
 */
export function FeedbackButton({ className, align = "end", variant = "icon" }: {
    className?: string
    align?: "start" | "center" | "end"
    variant?: "icon" | "rail"
}) {
    const pathname = usePathname()
    const rail = useProductRail()
    const [open, setOpen] = React.useState(false)
    const [message, setMessage] = React.useState("")
    const [rating, setRating] = React.useState<number | null>(null)
    const [pending, setPending] = React.useState(false)

    // The rail counts open popovers to stay wide: tell it on open, and on close or unmount.
    const notifyRail = variant === "rail" ? rail.onMenuOpenChange : undefined
    React.useEffect(() => {
        if (!open || !notifyRail) return
        notifyRail(true)
        return () => notifyRail(false)
    }, [open, notifyRail])

    async function send(e: React.FormEvent) {
        e.preventDefault()
        if (!message.trim() || pending) return
        setPending(true)
        const r = await sendFeedback({ message, rating, page: pathname })
        setPending(false)
        if (!r.success) {
            toast.error(r.error ?? "Your feedback could not be sent. Try again.")
            return
        }
        toast.success("Thanks - sent")
        setMessage("")
        setRating(null)
        setOpen(false)
    }

    const railRow = variant === "rail"
    return (
        <Popover open={open} onOpenChange={setOpen}>
            {railRow ? (
                <PopoverTrigger asChild>
                    <RailRowButton icon={<MessageSquarePlus />} label="Feedback" className={className} />
                </PopoverTrigger>
            ) : (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <PopoverTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                aria-label="Feedback"
                                className={cn(
                                    "relative size-10 shrink-0 rounded-full border border-neutral-950/[0.07] p-0 text-neutral-600 hover:bg-neutral-950/[0.05] [&_svg]:size-[18px] dark:border-white/[0.08] dark:text-neutral-300 dark:hover:bg-white/[0.07]",
                                    open && "bg-neutral-950/[0.05] text-neutral-900 dark:bg-white/[0.07] dark:text-white",
                                    className,
                                )}
                            >
                                <MessageSquarePlus />
                            </Button>
                        </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="border-neutral-800 bg-neutral-900 text-white dark:bg-white dark:text-black">Send feedback</TooltipContent>
                </Tooltip>
            )}
            <PopoverContent
                side={railRow && rail.layout === "rail" ? "right" : "top"}
                align={railRow && rail.layout === "rail" ? "end" : align}
                sideOffset={8}
                className="w-[min(22rem,calc(100vw-2rem))] p-3"
            >
                <form onSubmit={send} className="flex flex-col gap-3">
                    <div>
                        <p className="text-sm font-semibold text-neutral-900 dark:text-white">Send feedback</p>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">What works, what does not, what you need next.</p>
                    </div>
                    <Textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Tell us what you think..."
                        aria-label="Feedback"
                        maxLength={4000}
                        className="field-sizing-content max-h-48 min-h-24 text-sm"
                    />
                    <div className="flex items-center justify-between gap-2">
                        <StarRating value={rating} onChange={setRating} />
                        <Button type="submit" size="sm" disabled={!message.trim() || pending} className="gap-2">
                            {pending ? <InlineLoader size={14} label="Sending" /> : null}
                            Send
                        </Button>
                    </div>
                </form>
            </PopoverContent>
        </Popover>
    )
}

/**
 * The optional 1-5 rating (a radio group). Hovering star N previews 1..N filled; leaving the group shows the chosen
 * value again. Keyboard: one tab stop (the chosen star, else the first); Left / Down and Right / Up move and choose,
 * Home / End jump, pressing the chosen star again clears it.
 */
function StarRating({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
    const [hover, setHover] = React.useState<number | null>(null)
    const refs = React.useRef<(HTMLButtonElement | null)[]>([])
    const shown = hover ?? value ?? 0
    const max = RATINGS.length

    function choose(n: number) {
        onChange(n)
        refs.current[n - 1]?.focus()
    }

    function onKeyDown(e: React.KeyboardEvent, n: number) {
        let next: number | null = null
        if (e.key === "ArrowRight" || e.key === "ArrowUp") next = Math.min(max, n + 1)
        else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = Math.max(1, n - 1)
        else if (e.key === "Home") next = 1
        else if (e.key === "End") next = max
        if (next === null) return
        e.preventDefault()
        choose(next)
    }

    return (
        <div role="radiogroup" aria-label="Rating (optional)" className="flex items-center gap-0.5" onPointerLeave={() => setHover(null)}>
            {RATINGS.map((n) => {
                const on = n <= shown
                const tabStop = (value ?? 1) === n
                return (
                    <Button
                        key={n}
                        ref={(el) => { refs.current[n - 1] = el }}
                        type="button"
                        role="radio"
                        aria-checked={value === n}
                        aria-label={`${n} of 5`}
                        tabIndex={tabStop ? 0 : -1}
                        variant="ghost"
                        size="icon-sm"
                        className="cursor-pointer"
                        onPointerEnter={(e) => { if (e.pointerType === "mouse") setHover(n) }}
                        onClick={() => onChange(value === n ? null : n)}
                        onKeyDown={(e) => onKeyDown(e, n)}
                    >
                        <Star
                            className={cn(
                                "h-4 w-4 transition-colors motion-reduce:transition-none",
                                on ? "fill-amber-400 text-amber-500" : "text-neutral-400 dark:text-neutral-500",
                            )}
                        />
                    </Button>
                )
            })}
        </div>
    )
}
