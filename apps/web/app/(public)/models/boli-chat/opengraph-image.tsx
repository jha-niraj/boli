import { BOLI_CHAT } from "@repo/boli"
import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/lib/og"

export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const alt = `${BOLI_CHAT.id} - ${BOLI_CHAT.label}`

export default function BoliChatOgImage() {
    const p = BOLI_CHAT.pricePerMillion
    return ogImage({ title: BOLI_CHAT.id, kicker: `Models - ${BOLI_CHAT.label}`, footer: `Rs ${p.input} in, Rs ${p.output} out per 1M tokens`, cover: "keyboard" })
}
