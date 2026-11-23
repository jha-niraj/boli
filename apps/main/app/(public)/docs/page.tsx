import { redirect } from "next/navigation"
import { DOCS_PAGES, ROUTES } from "@/lib/navigation"

/** /docs opens the first page (Quickstart). */
export default function DocsIndex() {
    redirect(ROUTES.doc(DOCS_PAGES[0].slug))
}
