import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/lib/og"

/** The products index card. /kura and /jawaf have their own. */
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const alt = "Boli products"

export default function ProductsOgImage() {
    return ogImage({ title: "One open model, put to work", kicker: "Products", footer: "Kura is live - Jawaf is in pilot", cover: "launch" })
}
