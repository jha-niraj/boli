import type { Metadata } from "next"
import { ROUTES } from "@/lib/navigation"
import { jawafGuard } from "../_components/jawaf-guard"
import { JawafPlaceholder } from "../_components/jawaf-placeholder"

export const metadata: Metadata = { title: "Insights - Jawaf" }

/** /jawaf/insights - a real page now; Wave 2 (plan/main/jawaf/jawaf-v1.md) replaces the placeholder card. */
export default async function JawafInsightsPage() {
    await jawafGuard(ROUTES.jawafInsights)
    return <JawafPlaceholder page="insights" />
}
