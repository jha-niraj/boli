import type { ComponentType } from "react"
import { Check, Mail } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Page, PageSkeleton } from "@repo/ui/components/ui/page"
import { Skeleton } from "@repo/ui/components/ui/skeleton"
import { ArtRoot } from "@repo/brand/art/art-root"
import { PixelCover, type CoverId } from "@repo/brand/art/covers/cover"
import { DashDhaka } from "@/components/platform/dhaka-band"

/**
 * A product that is not live yet (the rail's greyed "Later" entries: Kagaj, Swar). One card: the pixel scene,
 * what it will do in three lines, and a quiet "We will email you" (no list to join yet - every account hears when it
 * opens). Server component; no data, no backend.
 */
export interface SoonCopy {
    title: string
    description: string
    /** The product's icon (@repo/brand/product-icons, the same one the rail shows). */
    icon: ComponentType<{ className?: string }>
    art: CoverId
    headline: string
    points: [string, string, string]
}

const CARD = "min-w-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
const cnCard = `${CARD} w-full`
/** The card fills the header's reading column (so its left edge lines up with the title, owner 2026-11-25) and sits in
 *  the middle of the space below the header (about 7rem of header and padding). */
const CENTER = "flex min-w-0 flex-col pb-6"

export function SoonPage({ copy }: { copy: SoonCopy }) {
    const Icon = copy.icon
    return (
        <Page title={copy.title} description={copy.description} badges={<SoonBadge />} body="page" width="reading">
            {/* Same column as the header (owner, 2026-11-25); the art shown whole and tall (owner preferred it over a cropped band). */}
            <div className={CENTER}>
                <section className={cnCard}>
                    <ArtRoot className="w-full bg-boli-sky-soft">
                        <PixelCover id={copy.art} className="block aspect-[96/60] w-full" />
                    </ArtRoot>
                    <DashDhaka height={9} tone="tonal" />
                    <div className="flex flex-col items-center gap-4 p-6 text-center">
                        <div className="grid justify-items-center gap-1">
                            <p className="flex items-center gap-1.5 text-xs font-medium text-boli-sky-ink">
                                <Icon className="size-4 shrink-0" /> What it will do
                            </p>
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">{copy.headline}</h2>
                        </div>
                        <ul className="flex flex-col gap-2 text-left">
                            {copy.points.map((p) => (
                                <li key={p} className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                                    <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-boli-sky-ink" />
                                    <span className="min-w-0">{p}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="flex flex-col items-center gap-2 pt-1">
                            <Button type="button" variant="outline" size="sm" disabled className="gap-1.5">
                                <Mail className="h-3.5 w-3.5" /> We will email you
                            </Button>
                            <p className="text-xs text-neutral-600 dark:text-neutral-400">Every Boli account hears by email the day it opens.</p>
                        </div>
                    </div>
                </section>
            </div>
        </Page>
    )
}

function SoonBadge() {
    return <span className="rounded-full px-2 text-xs text-neutral-600 ring-1 ring-inset ring-neutral-200 dark:text-neutral-400 dark:ring-neutral-700">Later</span>
}

export function SoonPageSkeleton({ copy }: { copy: SoonCopy }) {
    return (
        <PageSkeleton title={copy.title} description={copy.description} icon={false} body="page" width="reading">
            <div className={CENTER}>
                <div className={cnCard}>
                    <Skeleton className="aspect-[96/60] w-full rounded-none" />
                    <div className="flex flex-col items-center gap-3 p-6">
                        <Skeleton className="h-3 w-24 rounded" />
                        <Skeleton className="h-4 w-56 rounded" />
                        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-4 w-4/5 rounded" delay={i * 0.05} />)}
                        <Skeleton className="mt-1 h-8 w-40 rounded-full" />
                    </div>
                </div>
            </div>
        </PageSkeleton>
    )
}
