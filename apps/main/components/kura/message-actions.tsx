'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy, ThumbsDown, ThumbsUp } from 'lucide-react'
import { Button } from '@repo/ui/components/ui/button'
import { Popover, PopoverAnchor, PopoverContent } from '@repo/ui/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui/components/ui/tooltip'
import { toast } from '@repo/ui/components/ui/toast'
import { cn } from '@repo/ui/lib/utils'
import { rateMessage } from '@/actions/ai/kura.action'
import { useKuraChat } from '@/stores/kura-chat.store'
import { KURA_DISLIKE_REASONS, type KuraDislikeReason, type KuraRating } from '@/lib/ai/types'

/**
 * The row under a finished reply: Copy, thumbs up, thumbs down. A thumb saves at once (optimistic, rolled back on a
 * failure); thumbs down then opens a small popover with an optional reason. Pressing the chosen thumb again clears it.
 * Rendered only for a reply that has its saved id (after the stream's `meta` frame), so a rating always has a row.
 */
export function MessageActions({ messageId, text, rating, reason, children }: {
    messageId: string
    text: string
    rating: KuraRating | null
    reason: KuraDislikeReason | null
    /** The meta line (tokens, credits, time), drawn at the end of the same row. */
    children?: React.ReactNode
}) {
    const setRating = useKuraChat((s) => s.setRating)
    const [copied, setCopied] = useState(false)
    const [askWhy, setAskWhy] = useState(false)
    const copyTimer = useRef<number | null>(null)
    useEffect(() => () => { if (copyTimer.current) window.clearTimeout(copyTimer.current) }, [])

    async function copy() {
        try {
            await navigator.clipboard.writeText(text)
            setCopied(true)
            if (copyTimer.current) window.clearTimeout(copyTimer.current)
            copyTimer.current = window.setTimeout(() => setCopied(false), 1600)
        } catch {
            toast.error('Could not copy. Select the text and copy it instead.')
        }
    }

    async function save(next: KuraRating | null, nextReason: KuraDislikeReason | null) {
        const before = { rating, reason }
        setRating(messageId, next, nextReason)
        const res = await rateMessage(messageId, next, nextReason)
        if (!res.success) {
            setRating(messageId, before.rating, before.reason)
            toast.error(res.error)
        }
    }

    function thumb(value: KuraRating) {
        if (rating === value) {
            setAskWhy(false)
            void save(null, null).catch(() => undefined)
            return
        }
        void save(value, null).catch(() => undefined)
        setAskWhy(value === -1)
    }

    return (
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <div className="-ml-1.5 flex items-center">
                <IconAction label={copied ? 'Copied' : 'Copy'} onClick={copy}>
                    {copied ? <Check className="text-emerald-600 dark:text-emerald-400" /> : <Copy />}
                </IconAction>
                <IconAction label="Helpful" pressed={rating === 1} onClick={() => thumb(1)}>
                    <ThumbsUp className={cn(rating === 1 && 'fill-current')} />
                </IconAction>
                <Popover open={askWhy} onOpenChange={setAskWhy}>
                    <PopoverAnchor asChild>
                        <span>
                            <IconAction label="Not helpful" pressed={rating === -1} onClick={() => thumb(-1)}>
                                <ThumbsDown className={cn(rating === -1 && 'fill-current')} />
                            </IconAction>
                        </span>
                    </PopoverAnchor>
                    <PopoverContent align="start" side="bottom" className="w-64 p-3" onOpenAutoFocus={(e) => e.preventDefault()}>
                        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">What went wrong?</p>
                        <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">Optional. It helps us train a better model.</p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {KURA_DISLIKE_REASONS.map((r) => (
                                <Button
                                    key={r.key}
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className={cn('h-7 rounded-full px-2.5 text-xs font-normal', reason === r.key && 'border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800 hover:text-white dark:border-white dark:bg-white dark:text-neutral-900')}
                                    onClick={() => {
                                        setAskWhy(false)
                                        void save(-1, reason === r.key ? null : r.key).catch(() => undefined)
                                    }}
                                >
                                    {r.label}
                                </Button>
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>
                {rating === -1 && reason ? (
                    <span className="ml-1 truncate text-xs text-neutral-500 dark:text-neutral-400">
                        {KURA_DISLIKE_REASONS.find((r) => r.key === reason)?.label}
                    </span>
                ) : null}
            </div>
            {children ? <div className="ml-auto min-w-0">{children}</div> : null}
        </div>
    )
}

function IconAction({ label, pressed, onClick, children }: { label: string; pressed?: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={label}
                    aria-pressed={pressed}
                    onClick={onClick}
                    className={cn(
                        'h-7 w-7 rounded-full text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 [&_svg]:size-3.5',
                        pressed && 'text-neutral-900 dark:text-neutral-100',
                    )}
                >
                    {children}
                </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{label}</TooltipContent>
        </Tooltip>
    )
}
