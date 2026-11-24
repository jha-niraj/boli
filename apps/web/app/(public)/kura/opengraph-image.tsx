import { KURA } from "@repo/boli"
import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/lib/og"

/** Kura's card. */
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const alt = `${KURA.name} - chat in Nepali, English or both`

export default function KuraOgImage() {
    return ogImage({ title: "Ask in the words you already use", kicker: `${KURA.name} - Live`, footer: KURA.subtitle, cover: "keyboard" })
}
