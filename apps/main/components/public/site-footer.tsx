import { AppLink } from "@repo/ui/components/app-link"
import { PixelHimalaya } from "@/components/brand/pixel-himalaya"
import { BRAND } from "@/lib/boli"
import { FOOTER_COLUMNS } from "./links"

/** The public footer: link columns, a pixel Himalaya strip and the big wordmark. Only real links. */
export function SiteFooter() {
    return (
        <footer className="relative mt-auto overflow-hidden border-t border-boli-line bg-boli-ground">
            <div className="mx-auto w-full max-w-6xl px-4 pt-14 sm:px-6">
                <div className="grid gap-10 sm:grid-cols-[1.4fr_repeat(4,1fr)]">
                    <div className="max-w-xs">
                        <p className="font-serif text-2xl leading-tight text-boli-ink">{BRAND.tagline}</p>
                        <p className="mt-3 text-sm leading-6 text-boli-muted">Built in Nepal, for Nepal. Open models, prices in rupees, and a chat that understands the way people here type.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-8 sm:col-span-4 sm:grid-cols-4">
                        {FOOTER_COLUMNS.map((col) => (
                            <div key={col.title}>
                                <h2 className="text-xs font-semibold uppercase tracking-wider text-boli-muted">{col.title}</h2>
                                <ul className="mt-4 space-y-2.5">
                                    {col.links.map((l) => (
                                        <li key={l.label}>
                                            <AppLink href={l.href} className="cursor-pointer text-sm text-boli-text transition-colors hover:text-boli-ink">
                                                {l.label}
                                            </AppLink>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="mt-14 flex flex-col gap-2 border-t border-boli-line py-5 text-xs text-boli-muted sm:flex-row sm:items-center sm:justify-between">
                    <span>
                        {BRAND.name} - {BRAND.tagline}. Built in Nepal, for Nepal.
                    </span>
                    <span>Prices in NPR. 1 credit = Rs 1.</span>
                </div>
            </div>
            <div aria-hidden className="pointer-events-none mx-auto max-w-6xl select-none px-4 sm:px-6">
                <p className="font-serif text-[28vw] leading-[0.8] tracking-tight text-boli-ink/[0.06] sm:text-[15rem]">{BRAND.name}</p>
            </div>
            <PixelHimalaya variant="strip" className="h-16 sm:h-24" />
        </footer>
    )
}
