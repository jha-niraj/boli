import type { Metadata } from "next"
import { ROUTES } from "@/lib/navigation"
import { jawafGuard } from "../_components/jawaf-guard"
import { JawafPlaceholder } from "../_components/jawaf-placeholder"

export const metadata: Metadata = { title: "Conversations - Jawaf" }

/** /jawaf/conversations - a real page now; Wave 2 (plan/main/jawaf/jawaf-v1.md) replaces the placeholder card. */
export default async function JawafConversationsPage() {
    await jawafGuard(ROUTES.jawafConversations)
    return <JawafPlaceholder page="conversations" />
}
