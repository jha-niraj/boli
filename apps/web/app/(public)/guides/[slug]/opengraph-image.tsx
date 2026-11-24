import { getEntry, listGuides } from "@/lib/content"
import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/lib/og"

export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const alt = "Boli guide"

export function generateStaticParams() {
    return listGuides().map((g) => ({ slug: g.slug }))
}

export default async function GuideOgImage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const guide = getEntry("guides", slug)
    return ogImage({ title: guide?.title ?? "Boli guides", kicker: "Guide", footer: guide ? `${guide.readingMinutes} min read` : undefined, cover: guide?.cover ?? "docsDesk" })
}
