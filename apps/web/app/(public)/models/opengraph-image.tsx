import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/lib/og"

/** The models index card. The boli-chat page has its own. */
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const alt = "Boli models"

export default function ModelsOgImage() {
    return ogImage({ title: "Open models, one at a time", kicker: "Models", footer: "Open weights you could run yourself", cover: "aboutBench" })
}
