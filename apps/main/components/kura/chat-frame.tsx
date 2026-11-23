import { cn } from '@repo/ui/lib/utils'
import { READING_MEASURE } from './query-keys'

/**
 * The chat FRAME: two rails at the reading measure running the FULL height of the chat column (from the very top of
 * the page, through the header), a hairline rule along the bottom of the header (`ruleTop`, measured), and a 9px "+"
 * where each rail crosses the rule. Absolute, first child of the chat column, no pointer events - decoration, never
 * chrome. Wide screens only.
 */
export function ChatFrame({ ruleTop }: { ruleTop?: number }) {
    return (
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
            {ruleTop !== undefined && <div className="absolute inset-x-0 h-px bg-neutral-200 dark:bg-neutral-800" style={{ top: ruleTop }} />}
            <div className="absolute inset-0 flex justify-center px-4">
                <div className={cn('relative h-full w-full border-x border-neutral-200 dark:border-neutral-800', READING_MEASURE)}>
                    {ruleTop !== undefined && (
                        <>
                            <Plus className="-left-[5px]" top={ruleTop} />
                            <Plus className="-right-[5px]" top={ruleTop} />
                        </>
                    )}
                </div>
            </div>
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
