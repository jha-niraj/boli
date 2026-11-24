import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/lib/og"

/** The guides index card. Each guide has its own. */
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const alt = "Boli guides"

export default function GuidesOgImage() {
    return ogImage({ title: "Build something people in Nepal will use", kicker: "Guides", footer: "Walkthroughs with code you can copy", cover: "docsDesk" })
}
