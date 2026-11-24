import { Skeleton } from "@repo/ui/components/ui/skeleton"
import { cn } from "@repo/ui/lib/utils"
import { NOTIFICATION_TOPICS } from "@/lib/settings-values"

/**
 * The section bodies' loading shapes - each loading.tsx and nothing else uses these, so a layout edit to a section is
 * diffed against ONE skeleton here.
 */

const CARD = "rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 dark:border-neutral-800 dark:bg-neutral-900"

function SectionHead() {
    return (
        <div className="space-y-1.5">
            <Skeleton className="h-5 w-40 rounded" />
            <Skeleton className="h-3 w-64 max-w-full rounded" />
        </div>
    )
}

type Control = "switch" | "button" | "none"

/**
 * A Section (profile/_components/section) of `rows` divider rows. `icon`: each row starts with a 36px tile. `controls`:
 * what sits on the right of each row (switches, one pill button, or nothing) - pass one per row when they differ.
 * `columns`: the small column labels above the rows (from sm), e.g. "Email" / "In app".
 */
export function SectionRowsSkeleton({ rows = 4, controls = "switch", count = 1, icon = false, columns = 0, className }: {
    rows?: number
    controls?: Control | Control[]
    count?: number
    icon?: boolean
    columns?: number
    className?: string
}) {
    return (
        <div className={cn(CARD, className)}>
            <SectionHead />
            <div className="mt-4">
                {columns > 0 ? (
                    <div className="mb-1 hidden justify-end gap-6 pr-0.5 sm:flex">
                        {Array.from({ length: columns }).map((_, j) => <Skeleton key={j} className="h-3 w-9 rounded" />)}
                    </div>
                ) : null}
                <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {Array.from({ length: rows }).map((_, i) => {
                        const control = Array.isArray(controls) ? (controls[i] ?? "none") : controls
                        return (
                            <div key={i} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                    {icon ? <Skeleton className="h-9 w-9 shrink-0 rounded-xl" delay={i * 0.05} /> : null}
                                    <div className="min-w-0 flex-1 space-y-1.5">
                                        <Skeleton className="h-4 w-36 rounded" delay={i * 0.05} />
                                        <Skeleton className="h-3 w-56 max-w-full rounded" delay={i * 0.05} />
                                    </div>
                                </div>
                                {control === "switch" ? (
                                    <div className="flex shrink-0 gap-6">
                                        {Array.from({ length: count }).map((__, j) => <Skeleton key={j} className="h-5 w-9 rounded-full" />)}
                                    </div>
                                ) : control === "button" ? (
                                    <Skeleton className="h-8 w-32 shrink-0 rounded-full" />
                                ) : null}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

/** Notifications: one section, the Email / In app column labels, a row per topic with two switches. */
export function NotificationsSettingsSkeleton() {
    return (
        <div className="flex w-full flex-col gap-3">
            <SectionRowsSkeleton rows={NOTIFICATION_TOPICS.length} count={2} columns={2} />
        </div>
    )
}

/** Appearance: Theme (three 80px choices), then Layout (Compact, Reduce motion - each a switch). */
export function AppearanceSkeleton() {
    return (
        <div className="flex w-full flex-col gap-3">
            <div className={CARD}>
                <SectionHead />
                <div className="mt-4 grid grid-cols-3 gap-2">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" delay={i * 0.05} />)}
                </div>
            </div>
            <SectionRowsSkeleton rows={2} />
        </div>
    )
}

/** Connected accounts: Google and Email and password (tile + a button), then Email code (tile only). */
export function AccountsSkeleton() {
    return (
        <div className="flex w-full flex-col gap-3">
            <SectionRowsSkeleton rows={3} icon controls={["button", "button", "none"]} />
        </div>
    )
}
