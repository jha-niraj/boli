import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { ROUTES } from "@/lib/navigation"
import { getSession } from "@/lib/session"
import { SoonPage } from "../_components/soon-page"
import { SPEECH } from "./copy"

export const metadata: Metadata = { title: "Swar" }

/** /swar - a Soon product: what it will do. No data. */
export default async function Page() {
    const session = await getSession()
    if (!session) redirect(`${ROUTES.signIn}?stale=1&returnTo=${ROUTES.speech}`)
    return <SoonPage copy={SPEECH} />
}
