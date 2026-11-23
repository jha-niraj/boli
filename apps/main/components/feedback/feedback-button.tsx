"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { MessageSquarePlus, Star } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/ui/popover"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { toast } from "@repo/ui/components/ui/toast"
import { cn } from "@repo/ui/lib/utils"
import { sendFeedback } from "@/actions/feedback.action"

const RATINGS = [1, 2, 3, 4, 5] as const

/**
 * "Feedback": a small outline pill that opens a popover with a message, an optional 1-5 rating and Send. Saved to the
 * `feedback` table with the page it was sent from. The shell places one in the header; pages may also put it in their
 * own header actions.
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
            <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm" className={cn("gap-1.5", className)}>
                    <MessageSquarePlus className="h-3.5 w-3.5" />
                    Feedback
                </Button>
            </PopoverTrigger>
            <PopoverContent align={align} className="w-[min(22rem,calc(100vw-2rem))] p-3">
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
