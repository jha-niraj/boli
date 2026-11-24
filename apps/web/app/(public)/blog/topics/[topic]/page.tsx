import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { AppLink } from "@repo/ui/components/app-link"
import { DISPLAY } from "@repo/brand/type"
import { Kicker } from "@/components/public/section"
import { Breadcrumb } from "@/components/content/breadcrumb"
import { PostCard } from "@/components/content/post-card"
import { TopicChips } from "@/components/content/topic-chips"
import { JsonLd } from "@/components/json-ld"
import { entriesOnTopic, entryHref, isTopicId, publishedOnTopic, topicsInUse, TOPICS } from "@/lib/content"
import { BLOG_FEED } from "@/lib/feed"
import { ROUTES } from "@/lib/routes"
import { breadcrumbSchema, collectionPageSchema } from "@/lib/schema"
import { pageMeta } from "@/lib/seo"

/** One hub per topic with something on it; any other id is a 404 (a hub is never built empty). */
export const dynamicParams = false

export function generateStaticParams() {
    return topicsInUse().map((t) => ({ topic: t.id }))
}

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }): Promise<Metadata> {
    const { topic } = await params
    if (!isTopicId(topic)) return {}
    const t = TOPICS[topic]
    return pageMeta({
        title: t.title,
        description: t.description,
        path: ROUTES.blogTopic(topic),
        feeds: [BLOG_FEED],
        // Only drafts on it (development): the hub must not be indexed before anything on it is public.
        noindex: publishedOnTopic(topic).length === 0,
    })
}

/**
 * A topic hub (gurukulhq's /blog/topics/[topic]): the topic's line, then every post and guide on it, newest first,
 * then the other topics. CollectionPage + ItemList (published only) + BreadcrumbList.
 */
export default async function TopicPage({ params }: { params: Promise<{ topic: string }> }) {
    const { topic } = await params
    if (!isTopicId(topic)) notFound()
    const t = TOPICS[topic]
    const entries = entriesOnTopic(topic)
    if (!entries.length) notFound()
    const posts = entries.filter((e) => e.kind === "blog")
    const guides = entries.filter((e) => e.kind === "guides")
    const others = topicsInUse()
        .map((x) => x.id)
        .filter((id) => id !== topic)
    return (
        <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-10 font-sans sm:px-6 sm:pt-14 lg:px-10">
            <JsonLd
                data={[
                    collectionPageSchema({
                        name: t.title,
                        description: t.description,
                        path: ROUTES.blogTopic(topic),
                        about: t.title,
                        items: publishedOnTopic(topic).map((e) => ({ name: e.title, path: entryHref(e) })),
                    }),
                    breadcrumbSchema([
                        { name: "Blog", path: ROUTES.blog },
                        { name: "Topics", path: ROUTES.blogTopics },
                        { name: t.title, path: ROUTES.blogTopic(topic) },
                    ]),
                ]}
            />
            <header className="max-w-3xl">
                <Breadcrumb
                    items={[
                        { name: "Blog", href: ROUTES.blog },
                        { name: "Topics", href: ROUTES.blogTopics },
                    ]}
                />
                <Kicker reveal={false} className="mt-6">
                    Topic
                </Kicker>
                <h1 className="mt-3 text-[42px] leading-[1.02] text-boli-ink sm:text-[56px]" style={DISPLAY.display}>
                    {t.title}
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-boli-text sm:text-lg sm:leading-8">{t.description}</p>
            </header>

            {posts.length ? (
                <section aria-labelledby="topic-posts" className="mt-14">
                    <h2 id="topic-posts" className="font-serif text-3xl leading-tight text-boli-ink" style={DISPLAY.h3}>
                        Posts
                    </h2>
                    <ul className="mt-8 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                        {posts.map((e) => (
                            <li key={e.slug} className="min-w-0">
                                <PostCard entry={e} headingLevel={3} />
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}

            {guides.length ? (
                <section aria-labelledby="topic-guides" className="mt-16">
                    <h2 id="topic-guides" className="font-serif text-3xl leading-tight text-boli-ink" style={DISPLAY.h3}>
                        Guides
                    </h2>
                    <ul className="mt-8 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                        {guides.map((e) => (
                            <li key={e.slug} className="min-w-0">
                                <PostCard entry={e} headingLevel={3} />
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}

            {others.length ? (
                <section aria-labelledby="other-topics" className="mt-20 border-t border-boli-line pt-10">
                    <h2 id="other-topics" className="text-sm font-[450] text-boli-sky-ink">
                        More topics
                    </h2>
                    <TopicChips topics={others} className="mt-4" />
                    <AppLink href={ROUTES.blogTopics} className="mt-6 inline-block cursor-pointer text-sm text-boli-ink underline underline-offset-4">
                        All topics
                    </AppLink>
                </section>
            ) : null}
        </div>
    )
}
