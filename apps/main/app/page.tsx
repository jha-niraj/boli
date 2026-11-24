import { redirect } from "next/navigation"
import { ROUTES } from "@/lib/navigation"

/**
 * The app has no landing page: the public site is apps/web on its own origin. The middleware already sends `/` to Kura
 * (signed in) or to sign-in; this is only the fallback if a request ever reaches the page.
 */
export default function RootPage() {
    redirect(ROUTES.kura)
}
