import type { Metadata } from "next"
import { QuietBadge } from "@repo/brand/quiet-badge"
import { DISPLAY } from "@repo/brand/type"
import { Kicker } from "@/components/public/section"
import { ContentBody } from "@/components/content/content-body"
import { DraftBadge } from "@/components/content/draft-badge"
import { JsonLd } from "@/components/json-ld"
import { formatContentDate, listChangelog } from "@/lib/content"
import { ROUTES } from "@/lib/routes"
import { breadcrumbSchema } from "@/lib/schema"
import { pageMeta } from "@/lib/seo"

export const metadata: Metadata = pageMeta({
    title: "Changelog",
    description: "Every change to Boli as it ships: the API, Kura, billing, docs and the site, newest first.",
    path: ROUTES.changelog,
})

/**
 * The changelog: one timeline, newest first. Each entry is a dated MDX file (content/changelog) with tags for what it
 * touched; its anchor is its slug, so an entry can be linked (/changelog#kura).
 */
export default function ChangelogPage() {
    const entries = listChangelog()
    return (
        <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-10 font-sans sm:px-6 sm:pt-14 lg:px-10">
            <JsonLd data={breadcrumbSchema([{ name: "Changelog", path: ROUTES.changelog }])} />
            <header className="max-w-3xl">
                <Kicker reveal={false}>Changelog</Kicker>
                <h1 className="mt-3 text-[42px] leading-[1.02] text-boli-ink sm:text-[56px]" style={DISPLAY.display}>
                    What changed
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-boli-text sm:text-lg sm:leading-8">Every change to Boli as it ships, newest first.</p>
            </header>

            {entries.length ? (
                <ol className="mt-14 border-t border-boli-line">
                    {entries.map((e) => (
                        <li key={e.slug} id={e.slug} className="grid scroll-mt-24 gap-3 border-b border-boli-line py-10 md:grid-cols-[180px_minmax(0,1fr)] md:gap-10">
                            <div className="md:pt-1.5">
                                <time dateTime={e.date} className="text-sm text-boli-muted">
                                    {formatContentDate(e.date)}
                                </time>
                            </div>
                            <div className="min-w-0 max-w-3xl">
                                <div className="flex flex-wrap items-center gap-2">
                                    {e.tags.map((t) => (
                                        <QuietBadge key={t}>{t}</QuietBadge>
                                    ))}
                                    <DraftBadge draft={e.draft} />
                                </div>
                                <h2 className="mt-3 font-serif text-[26px] leading-[1.15] text-boli-ink" style={DISPLAY.h3}>
                                    <a href={`#${e.slug}`} className="cursor-pointer hover:underline hover:decoration-boli-line hover:underline-offset-8">
                                        {e.title}
                                    </a>
                                </h2>
                                <div className="[&>p:first-child]:mt-3">
                                    <ContentBody entry={e} />
                                </div>
                            </div>
                        </li>
                    ))}
                </ol>
            ) : (
                <p className="mt-14 rounded-2xl border border-boli-line bg-white px-6 py-10 text-center text-sm text-boli-muted">Nothing published here yet.</p>
            )}
        </div>
    )
}
