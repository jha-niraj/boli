import type { ReactNode } from "react"
import { ArrowRight } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { cn } from "@repo/ui/lib/utils"
import { ArtRoot } from "@repo/brand/art/art-root"
import { PixelCover, type CoverId } from "@repo/brand/art/covers/cover"
import { BoliLogo } from "@repo/brand/boli-logo"
import { PillButton } from "@repo/brand/pill-button"
import { QuietBadge } from "@repo/brand/quiet-badge"
import { BOLI_CHAT, KURA, WELCOME_CREDITS } from "@repo/boli"
import { ROUTES } from "@/lib/routes"
import { entryHref, formatContentDate, latestPost } from "@/lib/content"
import { SIGNIN_URL, SIGNUP_URL } from "@/lib/app-links"
import { SiteLink } from "@/components/site-link"
import { NAV_GROUPS, navBadgeTone, type NavGroup, type NavGroupId } from "./links"
import { MegaMenu } from "./mega-menu"
import { MobileMenu } from "./mobile-menu"

/**
 * The public header: the logo, the four mega menus (Products, Developers, Resources, Company), then "Log in" (quiet
 * pill) and "Sign up free" (near-black pill). Translucent white over a blur, so it reads over the landing hero's sky as
 * well as the warm ground. Both pills go to the app (lib/app-links.ts); the site reads no session. The header is the
 * positioned box the mega menu's full-width panel hangs from. Below md: the phone menu.
 */
export function SiteNav() {
    const menus = NAV_GROUPS.map((g) => ({ id: g.id, label: g.label, panel: <Panel group={g} card={featureCard(g.id)} /> }))
    return (
        <header className="sticky top-0 z-40 border-b border-boli-ink/[0.06] bg-white/60 font-sans backdrop-blur-md supports-[backdrop-filter]:bg-white/50">
            <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
                <div className="flex min-w-0 items-center gap-6 lg:gap-8">
                    <AppLink href={ROUTES.landing} aria-label="Boli home" className="cursor-pointer rounded-lg">
                        <BoliLogo size={22} />
                    </AppLink>
                    <MegaMenu menus={menus} />
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <PillButton asChild variant="ghost" size="sm" className="hidden h-9 sm:inline-flex">
                        <a href={SIGNIN_URL}>Log in</a>
                    </PillButton>
                    <PillButton asChild size="sm" className="h-9 px-4">
                        <a href={SIGNUP_URL}>Sign up free</a>
                    </PillButton>
                    <MobileMenu />
                </div>
            </div>
        </header>
    )
}

type Card = { href: string; eyebrow: string; title: string; line: string; art: CoverId }

/** The feature card on the right of each panel. Resources shows the newest post, if one is published. */
function featureCard(id: NavGroupId): Card {
    switch (id) {
        case "products":
            return { href: SIGNUP_URL, eyebrow: `${WELCOME_CREDITS} free credits`, title: `Try ${KURA.name}`, line: KURA.subtitle, art: "keyboard" }
        case "developers":
            return { href: ROUTES.model(BOLI_CHAT.id), eyebrow: "Latest model", title: BOLI_CHAT.id, line: `${BOLI_CHAT.label}, open weights, priced in rupees`, art: "aboutBench" }
        case "resources": {
            const post = latestPost()
            if (post) return { href: entryHref(post), eyebrow: `${formatContentDate(post.date)} - ${post.category ?? "Blog"}`, title: post.title, line: post.summary, art: post.cover ?? "dhaka" }
            return { href: ROUTES.changelog, eyebrow: "Changelog", title: "What changed lately", line: "Every change to Boli as it ships.", art: "docsDesk" }
        }
        case "company":
            return { href: ROUTES.about, eyebrow: "Our story", title: "Why we built Boli", line: "Open AI for how Nepal actually writes.", art: "launch" }
    }
}

function Panel({ group, card }: { group: NavGroup; card: Card }) {
    return (
        <div className="grid w-full gap-8 p-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:p-6">
            <div className="min-w-0">
                <p className="px-3 text-xs text-boli-muted">{group.label}</p>
                <ul className="mt-2 grid gap-1 md:grid-cols-2">
                    {group.items.map((it) => {
                        const Icon = it.icon
                        const inner: ReactNode = (
                            <>
                                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-boli-ground text-boli-ink ring-1 ring-boli-line transition-colors group-hover:bg-white">
                                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} aria-hidden />
                                </span>
                                <span className="min-w-0">
                                    <span className="flex flex-wrap items-center gap-2 text-sm font-[450] text-boli-ink">
                                        {it.label}
                                        {it.badge ? (
                                            <QuietBadge tone={navBadgeTone(it.badge)} className="h-5 px-2">
                                                {it.badge}
                                            </QuietBadge>
                                        ) : null}
                                    </span>
                                    <span className="mt-0.5 block text-[13px] leading-5 text-boli-muted">{it.subtitle}</span>
                                </span>
                            </>
                        )
                        const cls = "group flex items-start gap-3 rounded-2xl p-3"
                        return (
                            <li key={it.label} className="min-w-0">
                                {it.href ? (
                                    <SiteLink href={it.href} className={cn(cls, "cursor-pointer transition-colors hover:bg-boli-ground focus-visible:bg-boli-ground focus-visible:outline-none")}>
                                        {inner}
                                    </SiteLink>
                                ) : (
                                    <div className={cn(cls, "opacity-70")}>{inner}</div>
                                )}
                            </li>
                        )
                    })}
                </ul>
                {group.more ? (
                    <SiteLink
                        href={group.more.href}
                        className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-[450] text-boli-ink underline decoration-boli-sky-ink/50 decoration-1 underline-offset-4 transition-colors hover:bg-boli-ground"
                    >
                        {group.more.label}
                        <ArrowRight aria-hidden strokeWidth={1.75} className="size-3.5" />
                    </SiteLink>
                ) : null}
            </div>
            <SiteLink
                href={card.href}
                className="group hidden min-w-0 cursor-pointer flex-col overflow-hidden rounded-2xl border border-boli-line bg-white transition-colors hover:border-boli-ink/20 lg:flex"
            >
                <ArtRoot className="relative border-b border-boli-line">
                    <div className="relative w-full" style={{ aspectRatio: "96 / 60" }} aria-hidden>
                        <div className="absolute inset-0 [&>svg]:block [&>svg]:h-full [&>svg]:w-full">
                            <PixelCover id={card.art} />
                        </div>
                    </div>
                </ArtRoot>
                <span className="block p-4">
                    <span className="block text-xs text-boli-muted">{card.eyebrow}</span>
                    <span className="mt-1 block font-serif text-lg leading-snug text-boli-ink">{card.title}</span>
                    <span className="mt-1 line-clamp-2 block text-[13px] leading-5 text-boli-text">{card.line}</span>
                </span>
            </SiteLink>
        </div>
    )
}
