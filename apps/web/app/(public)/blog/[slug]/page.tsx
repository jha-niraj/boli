import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ArticleLayout } from "@/components/content/article-layout"
import { JsonLd } from "@/components/json-ld"
import { getAuthor, getEntry, lastModified, listPosts } from "@/lib/content"
import { BLOG_FEED } from "@/lib/feed"
import { ROUTES } from "@/lib/routes"
import { articleSchema, breadcrumbSchema, faqSchema } from "@/lib/schema"
import { absoluteUrl, pageMeta } from "@/lib/seo"

/** Every post is built at build time; any other slug is a 404 (drafts are not built in production). */
export const dynamicParams = false

export function generateStaticParams() {
    return listPosts().map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params
    const post = getEntry("blog", slug)
    if (!post) return {}
    return pageMeta({
        title: post.title,
        description: post.summary,
        path: ROUTES.post(slug),
        type: "article",
        publishedTime: post.date,
        modifiedTime: lastModified(post),
        authors: [getAuthor(post.author).name],
        section: post.category,
        tags: post.tags,
        noindex: post.draft,
        feeds: [BLOG_FEED],
    })
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const post = getEntry("blog", slug)
    if (!post) notFound()
    const category = post.category ?? "Blog"
    return (
        <>
            <JsonLd
                data={[
                    articleSchema(post, { path: ROUTES.post(slug), image: absoluteUrl(`${ROUTES.post(slug)}/opengraph-image`) }),
                    breadcrumbSchema([
                        { name: "Blog", path: ROUTES.blog },
                        { name: post.title, path: ROUTES.post(slug) },
                    ]),
                    ...(post.faqs.length ? [faqSchema(post.faqs)] : []),
                ]}
            />
            <ArticleLayout
                entry={post}
                crumbs={[
                    { name: "Blog", href: ROUTES.blog },
                    { name: category, href: ROUTES.blogCategory(category) },
                ]}
            />
        </>
    )
}
