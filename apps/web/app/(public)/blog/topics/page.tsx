import type { Metadata } from "next"
import { ArrowRight } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { DISPLAY } from "@repo/brand/type"
import { Kicker } from "@/components/public/section"
import { Breadcrumb } from "@/components/content/breadcrumb"
import { JsonLd } from "@/components/json-ld"
import { publishedTopics, topicsInUse } from "@/lib/content"
import { BLOG_FEED } from "@/lib/feed"
import { ROUTES } from "@/lib/routes"
import { breadcrumbSchema, collectionPageSchema } from "@/lib/schema"
import { pageMeta } from "@/lib/seo"
import { TOPICS } from "@/content/topics"

const TITLE = "Topics"
const DESCRIPTION = "Boli's posts and guides by subject: Romanized Nepali, building with the API, open models, document intelligence and Kura."

// noindex until a topic has something published (in development every topic on the page is drafts only).
export const metadata: Metadata = pageMeta({ title: `${TITLE} - Blog`, description: DESCRIPTION, path: ROUTES.blogTopics, feeds: [BLOG_FEED], noindex: publishedTopics().length === 0 })

/** Every topic that has something on it, with its line and a count. Each card is one link to its hub. */
export default function TopicsIndex() {
    const topics = topicsInUse()
    const published = publishedTopics()
    return (
        <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-10 font-sans sm:px-6 sm:pt-14 lg:px-10">
            <JsonLd
                data={[
                    collectionPageSchema({
                        name: `${TITLE} - Boli blog`,
                        description: DESCRIPTION,
                        path: ROUTES.blogTopics,
                        items: published.map((id) => ({ name: TOPICS[id].title, path: ROUTES.blogTopic(id) })),
                    }),
                    breadcrumbSchema([
                        { name: "Blog", path: ROUTES.blog },
                        { name: TITLE, path: ROUTES.blogTopics },
                    ]),
                ]}
            />
            <header className="max-w-3xl">
                <Breadcrumb items={[{ name: "Blog", href: ROUTES.blog }]} />
                <Kicker reveal={false} className="mt-6">
                    Topics
                </Kicker>
                <h1 className="mt-3 text-[42px] leading-[1.02] text-boli-ink sm:text-[56px]" style={DISPLAY.display}>
                    Read by subject
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-boli-text sm:text-lg sm:leading-8">{DESCRIPTION}</p>
            </header>

            {topics.length ? (
                <ul className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {topics.map((t) => (
                        <li key={t.id} className="min-w-0">
                            <AppLink
                                href={ROUTES.blogTopic(t.id)}
                                className="group flex h-full cursor-pointer flex-col rounded-2xl border border-boli-line bg-white p-6 transition-colors hover:border-boli-ink/20"
                            >
                                <span className="text-xs text-boli-muted">
                                    {t.count} {t.count === 1 ? "piece" : "pieces"}
                                </span>
                                <h2 className="mt-2 font-serif text-2xl leading-tight text-boli-ink" style={DISPLAY.card}>
                                    {t.title}
                                </h2>
                                <p className="mt-2 flex-1 text-sm leading-6 text-boli-text">{t.description}</p>
                                <span className="mt-5 inline-flex items-center gap-2 text-sm font-[450] text-boli-ink">
                                    Read the topic <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
                                </span>
                            </AppLink>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="mt-14 rounded-2xl border border-boli-line bg-white px-6 py-10 text-center text-sm text-boli-muted">
                    Nothing published yet. The{" "}
                    <AppLink href={ROUTES.changelog} className="cursor-pointer text-boli-sky-ink underline underline-offset-4">
                        changelog
                    </AppLink>{" "}
                    has every change as it ships.
                </p>
            )}
        </div>
    )
}
