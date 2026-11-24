import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/lib/og"

/** The blog index card. Posts and topic hubs have their own. */
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const alt = "The Boli blog"

export default function BlogOgImage() {
    return ogImage({ title: "Notes from the valley", kicker: "Blog", footer: "Launches, product notes and research", cover: "dhaka" })
}
