import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/lib/og"

export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const alt = "Boli blog topics"

export default function TopicsOgImage() {
    return ogImage({ title: "Read by subject", kicker: "Blog - Topics", footer: "Posts and guides from Boli", cover: "dhaka" })
}
