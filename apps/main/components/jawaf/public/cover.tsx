import type { JawafBusinessType } from "@repo/boli/jawaf"
import { ArtRoot } from "@repo/brand/art/art-root"
import { ValleyHero } from "@repo/brand/art/valley/valley"
import { PixelVignette } from "@repo/brand/art/vignettes/vignette"
import { PixelHimalaya } from "@repo/brand/pixel-himalaya"
import { DISPLAY } from "@repo/brand/type"
import type { JawafPublicBot } from "@/types/jawaf-public"
import { BusinessLogo } from "./logo"

/**
 * The top of /j/<slug>: the business's cover (its own image, else a calm pixel scene picked by business type), its logo
 * (else its initial), its name in Fraunces and its tagline. The business leads here; Boli does not appear.
 */

function PixelFallback({ type }: { type: JawafBusinessType }) {
    const cls = "absolute inset-0 block h-full w-full"
    if (type === "education") return <PixelVignette id="whoStudent" className={cls} preserve="xMidYMid slice" />
    if (type === "shop") return <PixelVignette id="whoShop" className={cls} preserve="xMidYMid slice" />
    if (type === "hotel") return <PixelHimalaya variant="hero" className={`${cls} h-full`} />
    return <ValleyHero crop="banner" className={cls} preserve="xMidYMid slice" />
}

export function JawafCover({ bot }: { bot: JawafPublicBot }) {
    return (
        <header className="relative">
            <div className="relative h-36 w-full overflow-hidden bg-boli-sand sm:h-48 lg:h-56 dark:bg-neutral-900">
                {bot.coverHref ? (
                    // eslint-disable-next-line @next/next/no-img-element -- an owner upload on R2
                    <img src={bot.coverHref} alt="" className="absolute inset-0 h-full w-full object-cover" fetchPriority="high" />
                ) : (
                    <ArtRoot className="absolute inset-0">
                        <PixelFallback type={bot.businessType} />
                    </ArtRoot>
                )}
                <div aria-hidden className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/25 to-transparent" />
            </div>
            <div className="mx-auto flex w-full max-w-6xl min-w-0 items-end gap-4 px-4 sm:px-6">
                <BusinessLogo bot={bot} size={72} className="relative z-10 -mt-9 ring-4 ring-boli-ground dark:ring-[#121314]" />
                <div className="min-w-0 pb-0.5 pt-3">
                    <h1 className="truncate text-[26px] leading-tight text-neutral-900 sm:text-[32px] dark:text-neutral-50" style={DISPLAY.h3}>
                        {bot.name}
                    </h1>
                    {bot.tagline ? <p className="mt-0.5 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">{bot.tagline}</p> : null}
                </div>
            </div>
        </header>
    )
}
