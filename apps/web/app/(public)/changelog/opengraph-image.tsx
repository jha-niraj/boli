import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/lib/og"

export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const alt = "Boli changelog"

export default function ChangelogOgImage() {
    return ogImage({ title: "What changed", kicker: "Changelog", footer: "Every change to Boli as it ships", cover: "aboutScorecard" })
}
