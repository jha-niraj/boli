import { ArtRoot } from "@repo/brand/art/art-root"
import { ValleyWordmark } from "@repo/brand/art/footer/footer"
import { BoliLogo } from "@repo/brand/boli-logo"
import { BRAND } from "@repo/boli"
import { FOOTER_COLUMNS } from "./links"
import { SiteLink } from "@/components/site-link"

/**
 * F5 (owner pick, 2026-11-24): link columns above the big serif "Boli" filled with the day valley, which runs off the
 * bottom edge a little like a signature on the last line. Only real links.
 */
export function SiteFooter() {
    return (
        <footer className="relative mt-auto overflow-hidden border-t border-boli-line bg-boli-ground font-sans">
            <div className="mx-auto w-full max-w-6xl px-4 pt-14 sm:px-6 lg:px-10">
                <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
                    <div className="flex max-w-xs flex-col gap-3">
                        <BoliLogo size={24} />
                        <p className="text-sm leading-6 text-boli-muted">{BRAND.tagline}. Open models, priced in rupees, built in Nepal.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-3">
                        {FOOTER_COLUMNS.map((col) => (
                            <div key={col.title}>
                                <h2 className="text-xs text-boli-muted">{col.title}</h2>
                                <ul className="mt-4 space-y-2.5">
                                    {col.links.map((l) => (
                                        <li key={l.label}>
                                            <SiteLink href={l.href} className="cursor-pointer text-sm text-boli-text transition-colors hover:text-boli-ink">
                                                {l.label}
                                            </SiteLink>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="mt-14 flex flex-col gap-2 border-t border-boli-line pt-5 text-xs text-boli-muted sm:flex-row sm:items-center sm:justify-between">
                    <span>
                        {BRAND.name} - {BRAND.tagline}. Built in Nepal, for Nepal.
                    </span>
                    <span>Prices in NPR. 1 credit = Rs 1.</span>
                </div>
            </div>
            <ArtRoot className="mx-auto -mb-[3%] max-w-7xl px-3 pt-6 sm:px-6">
                <ValleyWordmark />
            </ArtRoot>
        </footer>
    )
}
