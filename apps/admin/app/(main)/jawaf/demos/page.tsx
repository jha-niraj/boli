import type { Metadata } from "next"
import { appBaseUrl } from "@repo/billing"
import { requireAdminPage } from "@/lib/admin-session"
import { demoPrefill, listDemos } from "@/lib/jawaf"
import { DemosView } from "./_components/demos-view"

export const metadata: Metadata = { title: "Demos" }

type SearchParams = Promise<Record<string, string | string[] | undefined>>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null

/**
 * Demos (plan/admin/jawaf/admin-v1.md task 2): the demo tracker. The reads start here and seed the client.
 * `?new=1` opens New demo on load; `?new=1&from=<contactMessageId>` (the Inbox's Create demo) pre-fills it from that
 * Jawaf pilot request - read here on the server, never fetched by the client. `?prospect=<id>` opens that demo.
 * The view drops these params with history.replaceState once open, so a refresh does not reopen the sheet.
 */
export default async function DemosPage({ searchParams }: { searchParams: SearchParams }) {
    await requireAdminPage("jawaf")
    const sp = await searchParams
    const fromId = one(sp.from)
    const openNew = one(sp.new) === "1" || !!fromId
    const [data, prefill] = await Promise.all([listDemos(), openNew ? demoPrefill(fromId) : Promise.resolve(null)])
    return <DemosView initialData={data} mainUrl={appBaseUrl()} openNew={openNew} prefill={prefill} openProspectId={one(sp.prospect)} />
}
