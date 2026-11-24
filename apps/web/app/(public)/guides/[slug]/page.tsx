import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { GetKeyCard } from "@/app/(public)/docs/_components/prose"
import { ArticleLayout } from "@/components/content/article-layout"
import { JsonLd } from "@/components/json-ld"
import { getAuthor, getEntry, lastModified, listGuides } from "@/lib/content"
import { ROUTES } from "@/lib/routes"
import { articleSchema, breadcrumbSchema, faqSchema } from "@/lib/schema"
import { absoluteUrl, pageMeta } from "@/lib/seo"

export const dynamicParams = false

export function generateStaticParams() {
    return listGuides().map((g) => ({ slug: g.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params
    const guide = getEntry("guides", slug)
    if (!guide) return {}
    return pageMeta({
        title: guide.title,
        description: guide.summary,
        path: ROUTES.guide(slug),
        type: "article",
        publishedTime: guide.date,
        modifiedTime: lastModified(guide),
        authors: [getAuthor(guide.author).name],
        section: "Guides",
        tags: guide.tags,
        noindex: guide.draft,
    })
}

/** A guide: the same long-read layout as a post (TechArticle in JSON-LD), closing with the API key card. */
export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const guide = getEntry("guides", slug)
    if (!guide) notFound()
    return (
        <>
            <JsonLd
                data={[
                    articleSchema(guide, { path: ROUTES.guide(slug), image: absoluteUrl(`${ROUTES.guide(slug)}/opengraph-image`) }),
                    breadcrumbSchema([
                        { name: "Guides", path: ROUTES.guides },
                        { name: guide.title, path: ROUTES.guide(slug) },
                    ]),
                    ...(guide.faqs.length ? [faqSchema(guide.faqs)] : []),
                ]}
            />
            <ArticleLayout
                entry={guide}
                crumbs={[{ name: "Guides", href: ROUTES.guides }]}
                aside={
                    <div className="mt-14">
                        <GetKeyCard />
                    </div>
                }
            />
        </>
    )
}
