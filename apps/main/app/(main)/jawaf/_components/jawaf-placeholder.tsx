import { ArrowLeft } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { Page, PageSkeleton } from "@repo/ui/components/ui/page"
import { Skeleton } from "@repo/ui/components/ui/skeleton"
import { ArtRoot } from "@repo/brand/art/art-root"
import { PixelVignette } from "@repo/brand/art/vignettes/vignette"
import { DashDhaka } from "@/components/platform/dhaka-band"
import { ROUTES } from "@/lib/navigation"
import { JAWAF_PAGES, type JawafPageId } from "./jawaf-pages"

const CARD = "min-w-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"

/**
 * A Jawaf page before Wave 2 fills it: the real header, then one Dhaka-hemmed card with the shopkeeper vignette, "Coming
 * in this build" and what the page will do (BoliEmpty's shape, one size up). Server component; the art's motion is CSS.
 */
export function JawafPlaceholder({ page }: { page: JawafPageId }) {
    const copy = JAWAF_PAGES[page]
    return (
        <Page title={copy.title} description={copy.description} body="page">
            <div className="flex min-w-0 flex-col gap-4 pb-6">
                <section className={CARD}>
                    <DashDhaka height={9} />
                    <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
                        <ArtRoot className="w-44 overflow-hidden rounded-xl ring-1 ring-inset ring-neutral-200 dark:ring-neutral-800">
                            <div className="dark:hidden"><PixelVignette id="whoShop" variant="day" className="block aspect-[64/48] w-full" /></div>
                            <div className="hidden dark:block"><PixelVignette id="whoShop" variant="gold" className="block aspect-[64/48] w-full" /></div>
                        </ArtRoot>
                        <div className="grid gap-1">
                            <p className="text-xs font-medium text-boli-sky-ink">Coming in this build</p>
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">{copy.headline}</h2>
                            <p className="mx-auto max-w-[52ch] text-xs leading-5 text-neutral-600 dark:text-neutral-400">{copy.what}</p>
                        </div>
                        {page !== "home" ? (
                            <Button asChild variant="outline" size="sm" className="gap-1.5">
                                <AppLink href={ROUTES.jawaf}><ArrowLeft className="h-3.5 w-3.5" /> Jawaf home</AppLink>
                            </Button>
                        ) : null}
                    </div>
                </section>
            </div>
        </Page>
    )
}

/** Its loading.tsx: the real title and description, the card's shape in grey. */
export function JawafPlaceholderSkeleton({ page }: { page: JawafPageId }) {
    const copy = JAWAF_PAGES[page]
    return (
        <PageSkeleton title={copy.title} description={copy.description} icon={false} body="page">
            <div className="flex min-w-0 flex-col gap-4 pb-6">
                <div className={CARD}>
                    <Skeleton className="h-[9px] w-full rounded-none" />
                    <div className="flex flex-col items-center gap-4 px-6 py-10">
                        <Skeleton className="aspect-[64/48] w-44 rounded-xl" />
                        <div className="flex flex-col items-center gap-1.5">
                            <Skeleton className="h-3 w-28 rounded" />
                            <Skeleton className="h-4 w-52 rounded" />
                            <Skeleton className="h-3 w-80 max-w-full rounded" />
                        </div>
                        {page !== "home" ? <Skeleton className="h-8 w-32 rounded-full" /> : null}
                    </div>
                </div>
            </div>
        </PageSkeleton>
    )
}
