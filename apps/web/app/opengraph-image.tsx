import { BRAND } from "@repo/boli"
import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/lib/og"

/** The site-wide card: every page without its own (the landing, About, Docs, Models, the indexes) shares it. */
export const alt = `${BRAND.name} - ${BRAND.tagline}`
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default function OpengraphImage() {
    return ogImage({ title: "Chat and build in Nepali, English or both", kicker: BRAND.tagline, footer: "Open models, priced in rupees", cover: "launch" })
}
