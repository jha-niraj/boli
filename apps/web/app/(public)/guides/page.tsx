import { DhakaStrip } from "@repo/brand/dhaka-strip"
import { ArrowUpRight } from "lucide-react"
import type { Metadata } from "next"
import { AppLink } from "@repo/ui/components/app-link"
import { DISPLAY } from "@repo/brand/type"
import { Kicker } from "@/components/public/section"
import { PostCard } from "@/components/content/post-card"
import { JsonLd } from "@/components/json-ld"
import { entryHref, listGuides, publishedEntries } from "@/lib/content"
import { DOCS_PAGES, ROUTES } from "@/lib/routes"
import { breadcrumbSchema, collectionPageSchema } from "@/lib/schema"
import { pageMeta } from "@/lib/seo"

const DESCRIPTION = "Step-by-step guides for building with Boli's API: your first call in five languages, a Romanized Nepali support bot, and more."

export const metadata: Metadata = pageMeta({ title: "Guides", description: DESCRIPTION, path: ROUTES.guides })

/** Guides: evergreen how-tos (the blog holds dated stories). A grid of cards, then the docs for reference. */
export default function GuidesIndex() {
    const guides = listGuides()
    return (
        <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-10 font-sans sm:px-6 sm:pt-14 lg:px-10">
            <JsonLd
                data={[
                    collectionPageSchema({
                        name: "Boli guides",
                        description: DESCRIPTION,
                        path: ROUTES.guides,
                        items: publishedEntries("guides").map((g) => ({ name: g.title, path: entryHref(g) })),
                    }),
                    breadcrumbSchema([{ name: "Guides", path: ROUTES.guides }]),
                ]}
            />
            <header className="max-w-3xl">
                <Kicker reveal={false}>Guides</Kicker>
                <h1 className="mt-3 text-[42px] leading-[1.02] text-boli-ink sm:text-[56px]" style={DISPLAY.display}>
                    Build something people in Nepal will use
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-boli-text sm:text-lg sm:leading-8">
                    Short, complete walkthroughs with code you can copy. For every field and error, the{" "}
                    <AppLink href={ROUTES.docs} className="cursor-pointer text-boli-sky-ink underline underline-offset-4">
                        docs
                    </AppLink>{" "}
                    are the reference.
                </p>
            </header>

            <section aria-labelledby="all-guides" className="mt-14">
                <h2 id="all-guides" className="sr-only">
                    All guides
                </h2>
                {guides.length ? (
                    <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                        {guides.map((g) => (
                            <li key={g.slug} className="min-w-0">
                                <PostCard entry={g} headingLevel={3} />
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="rounded-2xl border border-boli-line bg-white px-6 py-10 text-center text-sm text-boli-muted">
                        The first guides are on their way. The{" "}
                        <AppLink href={ROUTES.doc("quickstart")} className="cursor-pointer text-boli-sky-ink underline underline-offset-4">
                            quickstart
                        </AppLink>{" "}
                        gets you to a first call today.
                    </p>
                )}
            </section>

            <section aria-labelledby="reference" className="mt-20 border-t border-boli-line pt-12">
                <h2 id="reference" className="font-serif text-3xl leading-tight text-boli-ink" style={DISPLAY.h3}>
                    Reference
                </h2>
                <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {DOCS_PAGES.map((d) => (
                        <li key={d.slug}>
                            <AppLink href={ROUTES.doc(d.slug)} className="flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-boli-line bg-white transition-[border-color,box-shadow] duration-200 hover:border-boli-ink/20 hover:shadow-[0_12px_32px_-20px_rgba(20,20,20,0.3)]">
                                <DhakaStrip tone="sky" scale={2} />
                                <span className="flex items-center justify-between gap-3 p-4 text-sm font-semibold text-boli-ink">
                                    {d.title}
                                    <ArrowUpRight aria-hidden className="h-4 w-4 shrink-0 text-boli-muted" strokeWidth={1.75} />
                                </span>
                            </AppLink>
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    )
}
