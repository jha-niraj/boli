import type { ReactNode } from "react"
import { ArrowRight } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { PageSkeleton } from "@repo/ui/components/ui/page"
import { Skeleton } from "@repo/ui/components/ui/skeleton"
import { cn } from "@repo/ui/lib/utils"
import { ArtRoot } from "@repo/brand/art/art-root"
import { KuraScene } from "@repo/brand/art/kura/kura-scene"
import { PixelVignette } from "@repo/brand/art/vignettes/vignette"
import { DISPLAY } from "@repo/brand/type"
import { DashDhaka } from "@/components/platform/dhaka-band"
import { PRODUCTS, type ProductId } from "@/lib/navigation"

export const START_TITLE = "Get started"
export const START_DESCRIPTION = "Pick a product to begin - you can switch any time from the rail on the left."

type StartId = Extract<ProductId, "kura" | "api" | "jawaf">

const CTA: Record<StartId, { cta: string; who: string }> = {
    kura: { cta: "Open Kura", who: "For anyone - ask, write and translate" },
    api: { cta: "Open the API", who: "For developers - OpenAI compatible" },
    jawaf: { cta: "Set up Jawaf", who: "For businesses - answers your customers" },
}

const CARD = "flex min-w-0 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
const ART = "flex aspect-[16/9] items-end justify-center overflow-hidden bg-boli-sky-soft"

/** Each product's scene, light and dark side by side so the first frame is right in either theme. */
function Scene({ id }: { id: StartId }): ReactNode {
    if (id === "kura") {
        return (
            <>
                <KuraScene variant="day" className="block aspect-[112/48] w-full dark:hidden" />
                <KuraScene variant="gold" className="hidden aspect-[112/48] w-full dark:block" />
            </>
        )
    }
    const vid = id === "api" ? "whoDeveloper" : "whoShop"
    return (
        <>
            <PixelVignette id={vid} variant="day" className="block h-full w-full dark:hidden" preserve="xMidYMax meet" />
            <PixelVignette id={vid} variant="gold" className="hidden h-full w-full dark:block" preserve="xMidYMax meet" />
        </>
    )
}

/**
 * "Choose where to start" (plan/main/jawaf/jawaf-v1.md): a browser with no last product lands here after sign-in. Three
 * Dhaka-edged cards - Kura, API, Jawaf - each with its pixel scene, the name in Fraunces and one pill to open it. The
 * product page that opens writes the last-product cookie, so next time sign-in goes straight there.
 */
export function StartCards() {
    const live = PRODUCTS.filter((p): p is typeof p & { id: StartId } => p.id === "kura" || p.id === "api" || p.id === "jawaf")
    return (
        <div className="flex min-w-0 flex-col gap-6 pb-8 pt-2">
            <div className="max-w-2xl">
                <p className="text-xs font-medium text-boli-sky-ink">Welcome to Boli</p>
                <h2 className="mt-1 text-3xl text-neutral-900 dark:text-white" style={DISPLAY.h3}>Where would you like to start?</h2>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">All three run on Boli&apos;s own open model and share one credit balance.</p>
            </div>
            <div className="grid min-w-0 gap-3 md:grid-cols-3">
                {live.map((p) => (
                    <AppLink
                        key={p.id}
                        href={p.href}
                        className={cn(CARD, "group cursor-pointer outline-none transition-colors hover:border-neutral-300 focus-visible:ring-2 focus-visible:ring-boli-sky dark:hover:border-neutral-700")}
                    >
                        <DashDhaka height={9} />
                        <ArtRoot className={ART}>
                            <Scene id={p.id} />
                        </ArtRoot>
                        <div className="flex flex-1 flex-col gap-1 p-4">
                            <p className="text-xl text-neutral-900 dark:text-white" style={DISPLAY.card}>{p.label}</p>
                            <p className="text-sm text-neutral-700 dark:text-neutral-300">{p.line}</p>
                            <p className="text-xs text-neutral-600 dark:text-neutral-400">{CTA[p.id].who}</p>
                            <span className="mt-4 flex">
                                <Button asChild size="sm" className="pointer-events-none gap-1.5">
                                    <span>{CTA[p.id].cta} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" /></span>
                                </Button>
                            </span>
                        </div>
                    </AppLink>
                ))}
            </div>
        </div>
    )
}

export function StartSkeleton() {
    return (
        <PageSkeleton title={START_TITLE} description={START_DESCRIPTION} icon={false} body="page">
            <div className="flex min-w-0 flex-col gap-6 pb-8 pt-2">
                <div className="flex flex-col gap-2">
                    <Skeleton className="h-3 w-24 rounded" />
                    <Skeleton className="h-8 w-96 max-w-full rounded-lg" />
                    <Skeleton className="h-4 w-80 max-w-full rounded" />
                </div>
                <div className="grid min-w-0 gap-3 md:grid-cols-3">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className={CARD}>
                            <Skeleton className="h-[9px] w-full rounded-none" />
                            <Skeleton className="aspect-[16/9] w-full rounded-none" delay={i * 0.05} />
                            <div className="flex flex-col gap-2 p-4">
                                <Skeleton className="h-5 w-20 rounded" />
                                <Skeleton className="h-4 w-4/5 rounded" />
                                <Skeleton className="h-3 w-3/5 rounded" />
                                <Skeleton className="mt-3 h-8 w-32 rounded-full" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </PageSkeleton>
    )
}
