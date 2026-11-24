import type { Metadata } from "next"
import { ROUTES } from "@/lib/navigation"
import { jawafGuard } from "../_components/jawaf-guard"
import { JawafPlaceholder } from "../_components/jawaf-placeholder"

export const metadata: Metadata = { title: "Contacts - Jawaf" }

/** /jawaf/contacts - a real page now; Wave 2 (plan/main/jawaf/jawaf-v1.md) replaces the placeholder card. */
export default async function JawafContactsPage() {
    await jawafGuard(ROUTES.jawafContacts)
    return <JawafPlaceholder page="contacts" />
}
