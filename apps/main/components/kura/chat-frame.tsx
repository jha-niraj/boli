import { cn } from '@repo/ui/lib/utils'
import { KURA_HEADER_H } from './query-keys'

/**
 * The chat FRAME's horizontal half. The two vertical lines are the chat column's own borders (CHAT_COLUMN), so this
 * draws only what crosses them: a hairline along the bottom of the header that runs past the lines to the edges of the
 * chat area (which clips it), and a 9px "+" exactly where each line crosses it. Absolute inside the column, first
 * child, no pointer events - decoration, never chrome. lg and up only.
 *
 * `headerHeight` is the measured header (the column's top to the body's top). The rule takes the header's LAST pixel,
 * the same row the side column's header border takes, so the two meet in one line.
 */
export function ChatFrame({ headerHeight }: { headerHeight?: number }) {
    const top = (headerHeight ?? KURA_HEADER_H) - 1
    return (
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
            <div className="absolute -inset-x-[100vw] h-px bg-neutral-200 dark:bg-neutral-800" style={{ top }} />
            {/* Offsets: the column's 1px border sits just outside its padding box (x = -1..0 and width..width+1); a 9px
                box at -5px puts its centre line on that pixel. Vertically, top - 4 does the same for the rule. */}
            <Plus className="-left-[5px]" top={top} />
            <Plus className="-right-[5px]" top={top} />
        </div>
    )
}

function Plus({ className, top }: { className: string; top: number }) {
    return (
        <span className={cn('absolute h-[9px] w-[9px]', className)} style={{ top: top - 4 }}>
            <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-neutral-400 dark:bg-neutral-600" />
            <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-neutral-400 dark:bg-neutral-600" />
        </span>
    )
}
