import type { Metadata } from "next"
import { ROUTES } from "@/lib/navigation"
import { jawafGuard } from "../_components/jawaf-guard"
import { JawafPlaceholder } from "../_components/jawaf-placeholder"

export const metadata: Metadata = { title: "Share - Jawaf" }

/** /jawaf/share - a real page now; Wave 2 (plan/main/jawaf/jawaf-v1.md) replaces the placeholder card. */
export default async function JawafSharePage() {
    await jawafGuard(ROUTES.jawafShare)
    return <JawafPlaceholder page="share" />
}
