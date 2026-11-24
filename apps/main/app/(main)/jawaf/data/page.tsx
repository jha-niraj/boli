import type { Metadata } from "next"
import { ROUTES } from "@/lib/navigation"
import { jawafGuard } from "../_components/jawaf-guard"
import { JawafPlaceholder } from "../_components/jawaf-placeholder"

export const metadata: Metadata = { title: "Your data - Jawaf" }

/** /jawaf/data - the plain Data page (plan "Data and trust"); a placeholder card until it is written. */
export default async function JawafDataPage() {
    await jawafGuard(ROUTES.jawafData)
    return <JawafPlaceholder page="data" />
}
