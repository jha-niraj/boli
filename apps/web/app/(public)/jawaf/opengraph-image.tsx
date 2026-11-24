import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/lib/og"

/** Jawaf's card: the pasal counter scene. Says "In pilot" - Jawaf is not live. */
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const alt = "Jawaf - answers for your customers, in pilot"

export default function JawafOgImage() {
    return ogImage({ title: "Your customers ask. Jawaf answers, day and night.", kicker: "Jawaf - In pilot", footer: "Nepali, Romanized Nepali and English", cover: "jawafCounter" })
}
