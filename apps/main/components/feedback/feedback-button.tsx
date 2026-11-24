"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { MessageSquarePlus, Star } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@/components/loaders/spinners"
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/ui/popover"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/components/ui/tooltip"
import { toast } from "@repo/ui/components/ui/toast"
import { cn } from "@repo/ui/lib/utils"
import { sendFeedback } from "@/actions/feedback.action"

const RATINGS = [1, 2, 3, 4, 5] as const

/**
 * "Send feedback": a round icon button (tooltip + aria-label) that opens a popover with a message, an optional 1-5 rating
 * and Send. Saved to the `feedback` table with the page it was sent from. The shell places one in the rail footer,
 * between the account chip and the bell.
 */
export function FeedbackButton({ className, align = "end" }: { className?: string; align?: "start" | "center" | "end" }) {
    const pathname = usePathname()
    const [open, setOpen] = React.useState(false)
    const [message, setMessage] = React.useState("")
    const [rating, setRating] = React.useState<number | null>(null)
    const [pending, setPending] = React.useState(false)

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

    return (
        <Popover open={open} onOpenChange={setOpen}>
            {/* Icon-only and round, drawn like the bell beside it (AccountMenuIcon), so the account row keeps the room. */}
            <Tooltip>
                <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            aria-label="Send feedback"
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
            <PopoverContent side="top" align={align} className="w-[min(22rem,calc(100vw-2rem))] p-3">
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
                        <div role="radiogroup" aria-label="Rating (optional)" className="flex items-center gap-0.5">
                            {RATINGS.map((n) => {
                                const on = rating !== null && n <= rating
                                return (
                                    <Button
                                        key={n}
                                        type="button"
                                        role="radio"
                                        aria-checked={rating === n}
                                        aria-label={`${n} of 5`}
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => setRating(rating === n ? null : n)}
                                    >
                                        <Star className={cn("h-4 w-4", on ? "fill-amber-400 text-amber-500" : "text-neutral-400")} />
                                    </Button>
                                )
                            })}
                        </div>
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
