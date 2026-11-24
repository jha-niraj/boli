import type { Metadata } from "next"
import { ArrowRight } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { DISPLAY } from "@repo/brand/type"
import { Kicker } from "@/components/public/section"
import { Cover } from "@/components/content/cover"
import { DraftBadge } from "@/components/content/draft-badge"
import { PostCard } from "@/components/content/post-card"
import { JsonLd } from "@/components/json-ld"
import { BLOG_CATEGORIES, entryHref, formatContentDate, listPosts } from "@/lib/content"
import { ROUTES } from "@/lib/routes"
import { breadcrumbSchema } from "@/lib/schema"
import { pageMeta } from "@/lib/seo"
import { BlogBrowser } from "./_components/blog-browser"

export const metadata: Metadata = pageMeta({
    title: "Blog",
    description: "Stories from Boli: launches, product notes and research on open AI for Nepali, Romanized Nepali and English.",
    path: ROUTES.blog,
})

/**
 * The blog (Sarvam's pattern): the newest post as a feature - big cover left, date, category, title and "Read the post"
 * right - then category tabs, a search box and a grid of every post. Static: the tab and the search filter in the
 * browser (BlogBrowser).
 */
export default function BlogIndex() {
    const posts = listPosts()
    const featured = posts[0]
    return (
        <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-10 font-sans sm:px-6 sm:pt-14 lg:px-10">
            <JsonLd data={breadcrumbSchema([{ name: "Blog", path: ROUTES.blog }])} />
            <header className="max-w-3xl">
                <Kicker reveal={false}>Blog</Kicker>
                <h1 className="mt-3 text-[42px] leading-[1.02] text-boli-ink sm:text-[56px]" style={DISPLAY.display}>
                    Notes from the valley
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-boli-text sm:text-lg sm:leading-8">
                    What we ship, what we measure and what we learn running open AI for Nepal.
                </p>
            </header>

            {featured ? (
                <section aria-labelledby="featured-title" className="mt-12">
                    <AppLink href={entryHref(featured)} className="group grid cursor-pointer items-center gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-12">
                        <Cover name={featured.cover} rounded="rounded-3xl" decorative className="transition-[border-color] duration-200 group-hover:border-boli-ink/20" />
                        <div className="min-w-0">
                            <p className="flex flex-wrap items-center gap-2 text-sm text-boli-muted">
                                <time dateTime={featured.date}>{formatContentDate(featured.date)}</time>
                                <span aria-hidden>-</span>
                                <span>{featured.category}</span>
                                <DraftBadge draft={featured.draft} />
                            </p>
                            <h2 id="featured-title" className="mt-3 font-serif text-[32px] leading-[1.08] text-boli-ink sm:text-[40px]" style={DISPLAY.h2}>
                                {featured.title}
                            </h2>
                            <p className="mt-4 text-base leading-7 text-boli-text">{featured.summary}</p>
                            <span className="mt-6 inline-flex items-center gap-2 text-sm font-[450] text-boli-ink">
                                Read the post <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
                            </span>
                        </div>
                    </AppLink>
                </section>
            ) : null}

            <section aria-labelledby="all-posts" className="mt-16">
                <h2 id="all-posts" className="sr-only">
                    All posts
                </h2>
                {posts.length ? (
                    <BlogBrowser
                        categories={BLOG_CATEGORIES}
                        items={posts.map((p) => ({
                            slug: p.slug,
                            category: p.category ?? "",
                            haystack: `${p.title} ${p.summary} ${p.category ?? ""} ${p.tags.join(" ")}`.toLowerCase(),
                            card: <PostCard entry={p} headingLevel={3} />,
                        }))}
                    />
                ) : (
                    <div className="rounded-2xl border border-boli-line bg-white px-6 py-12 text-center">
                        <p className="text-base font-semibold text-boli-ink">The first posts are being written</p>
                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-boli-muted">
                            Until then, the changelog has every change as it ships, and the docs get you to a first call in five minutes.
                        </p>
                        <div className="mt-5 flex justify-center gap-4 text-sm">
                            <AppLink href={ROUTES.changelog} className="cursor-pointer text-boli-sky-ink underline underline-offset-4">
                                Changelog
                            </AppLink>
                            <AppLink href={ROUTES.docs} className="cursor-pointer text-boli-sky-ink underline underline-offset-4">
                                Docs
                            </AppLink>
                        </div>
                    </div>
                )}
            </section>
        </div>
    )
}
