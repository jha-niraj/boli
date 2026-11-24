import { isTopicId, TOPICS, topicsInUse } from "@/lib/content"
import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/lib/og"

/** A card per topic hub, prerendered at build. */
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const alt = "Boli blog topic"

export function generateStaticParams() {
    return topicsInUse().map((t) => ({ topic: t.id }))
}

export default async function TopicOgImage({ params }: { params: Promise<{ topic: string }> }) {
    const { topic } = await params
    return ogImage({ title: isTopicId(topic) ? TOPICS[topic].title : "Topics", kicker: "Blog - Topic", footer: "Posts and guides from Boli", cover: "dhaka" })
}
