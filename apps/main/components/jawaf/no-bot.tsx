import { ArrowRight } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { ArtRoot } from "@repo/brand/art/art-root"
import { PixelVignette } from "@repo/brand/art/vignettes/vignette"
import { DashDhaka } from "@/components/platform/dhaka-band"
import { ROUTES } from "@/lib/navigation"
import { JAWAF_CARD } from "./keys"

/**
 * A Jawaf page opened before the workspace has a bot: one Dhaka-hemmed card that says what the page needs and leads
 * to the setup. Server-safe (no hooks).
 */
export function JawafNoBot({ what }: { what: string }) {
    return (
        <section className={`${JAWAF_CARD} overflow-hidden`}>
            <DashDhaka height={9} />
            <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
                <ArtRoot className="w-44 overflow-hidden rounded-xl ring-1 ring-inset ring-neutral-200 dark:ring-neutral-800">
                    <div className="dark:hidden"><PixelVignette id="jawafCounter" variant="day" className="block aspect-[96/60] w-full" /></div>
                    <div className="hidden dark:block"><PixelVignette id="jawafCounter" variant="gold" className="block aspect-[96/60] w-full" /></div>
                </ArtRoot>
                <div className="grid gap-1">
                    <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Set up your bot first</h2>
                    <p className="mx-auto max-w-[52ch] text-xs leading-5 text-neutral-600 dark:text-neutral-400">{what}</p>
                </div>
                <Button asChild size="sm" className="cursor-pointer gap-1.5">
                    <AppLink href={ROUTES.jawafSetup}>Set up Jawaf <ArrowRight className="h-3.5 w-3.5" /></AppLink>
                </Button>
            </div>
        </section>
    )
}
