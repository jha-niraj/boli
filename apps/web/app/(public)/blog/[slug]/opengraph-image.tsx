import { getAuthor, getEntry, listPosts } from "@/lib/content"
import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/lib/og"

/** A card per post (its title and its own cover), prerendered at build. */
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const alt = "Boli blog post"

export function generateStaticParams() {
    return listPosts().map((p) => ({ slug: p.slug }))
}

export default async function PostOgImage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const post = getEntry("blog", slug)
    return ogImage({
        title: post?.title ?? "Boli blog",
        kicker: post?.category ? `Blog - ${post.category}` : "Blog",
        footer: getAuthor(post?.author ?? "boli-team").name,
        cover: post?.cover ?? "dhaka",
    })
}
