import type { ReactNode } from "react"
import { EmptyState } from "@repo/ui/components/ui/empty-state"
import { cn } from "@repo/ui/lib/utils"
import { DashDhaka } from "./dhaka-band"

/**
 * The shared EmptyState in a card hemmed by a thin Dhaka band - for the dashboard's "nothing yet" moments (no keys, no
 * usage, no payments). The band sits on the card's top edge, never behind the text.
 */
export function DhakaEmpty({ icon, title, description, action, className }: {
    icon: ReactNode
    title: string
    description: string
    action?: ReactNode
    className?: string
}) {
    return (
        <section className={cn("flex min-w-0 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900", className)}>
            <DashDhaka height={9} />
            <EmptyState className="flex-1" icon={icon} title={title} description={description} action={action} />
        </section>
    )
}
