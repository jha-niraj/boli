"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { CalendarClock, CircleDollarSign, Handshake, Plus, Presentation, Send, Sprout, XCircle } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { InlineNote } from "@repo/ui/components/ui/inline-note"
import { Input } from "@repo/ui/components/ui/input"
import { Page } from "@repo/ui/components/ui/page"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/ui/table"
import { useDebounce } from "@repo/ui/hooks/use-debounce"
import { BoliEmpty } from "@/components/empty/boli-empty"
import { TableCard } from "@/components/table-card"
import { useAdminAccess } from "@/context/admin-access-context"
import { getJawafDemos } from "@/actions/jawaf/demos.action"
import { PROSPECT_STAGES, type DemoPrefill, type DemosData, type ProspectRow, type ProspectStage } from "@/types/jawaf"
import { BotState, fmtDate, fmtInt, fmtRate, isDue, JAWAF_KEYS, StageChip } from "../../_components/jawaf-bits"
import { DemoFormSheet } from "./demo-form-sheet"
import { DemoSheet } from "./demo-sheet"
import { DEMOS_DESCRIPTION, DEMOS_TITLE } from "./demos-skeleton"

const STAGE_ICON = { sent: Send, met: Handshake, pilot: Sprout, paying: CircleDollarSign, lost: XCircle } as const

/**
 * Demos - the demo tracker (plan/admin/jawaf/admin-v1.md "Jawaf in admin"). A stage band (each cell filters), a search,
 * the table (business, contact, stage, next step, owner, bot, questions on the demo link, answer rate, last visit). A
 * row opens the non-modal right sheet (rows carry data-sheet-keep-open, so another row swaps it); New demo opens the
 * form sheet. The page opens it on load for ?new=1, pre-filled (read on the server) for ?new=1&from=<contactMessageId>;
 * once open, the params leave the URL (history.replaceState) so a refresh does not reopen it.
 */
export function DemosView({ initialData, mainUrl, openNew, prefill, openProspectId }: {
    initialData: DemosData
    mainUrl: string
    openNew: boolean
    prefill: DemoPrefill | null
    openProspectId: string | null
}) {
    const { can } = useAdminAccess()
    const canWrite = can("jawaf", "write")
    const [stage, setStage] = React.useState<ProspectStage | "due" | null>(null)
    const [search, setSearch] = React.useState("")
    const q = useDebounce(search.trim().toLowerCase(), 200)
    const [openId, setOpenId] = React.useState<string | null>(openProspectId)
    const [sheetOpen, setSheetOpen] = React.useState(!!openProspectId)
    const [formOpen, setFormOpen] = React.useState(openNew && canWrite && !!initialData.houseWorkspaceId)
    const [formPrefill, setFormPrefill] = React.useState<DemoPrefill | null>(prefill)

    // The sheet is open from the first frame; drop ?new / ?from / ?prospect so a refresh does not reopen it.
    React.useEffect(() => {
        if (!openNew && !openProspectId) return
        const url = new URL(window.location.href)
        for (const k of ["new", "from", "prospect"]) url.searchParams.delete(k)
        window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`)
    }, [openNew, openProspectId])

    const demos = useQuery({
        queryKey: JAWAF_KEYS.demos,
        queryFn: async () => {
            const r = await getJawafDemos()
            if (!r.success) throw new Error(r.error ?? "Could not load the demos")
            return r.data
        },
        initialData,
    })
    const data = demos.data
    const counts = React.useMemo(() => {
        const c: Record<ProspectStage, number> = { sent: 0, met: 0, pilot: 0, paying: 0, lost: 0 }
        for (const r of data.rows) c[r.stage]++
        return c
    }, [data.rows])
    const due = data.rows.filter((r) => r.stage !== "lost" && r.stage !== "paying" && isDue(r.nextStepAt)).length

    const rows = data.rows.filter((r) => {
        if (stage === "due" && !(r.stage !== "lost" && r.stage !== "paying" && isDue(r.nextStepAt))) return false
        if (stage && stage !== "due" && r.stage !== stage) return false
        if (!q) return true
        return [r.business, r.contactName, r.city, r.sector, r.email, r.phone, r.bot?.slug].some((v) => v?.toLowerCase().includes(q))
    })

    const open = (r: ProspectRow) => { setOpenId(r.id); setSheetOpen(true) }
    const toggle = (s: ProspectStage | "due") => setStage((cur) => (cur === s ? null : s))

    return (
        <Page
            title={DEMOS_TITLE}
            description={DEMOS_DESCRIPTION}
            icon={<Presentation />}
            actions={canWrite ? [{ key: "new", label: "New demo", icon: <Plus className="h-3.5 w-3.5" />, primary: true, keepSheetOpen: true, onClick: () => { setFormPrefill(null); setFormOpen(true) }, disabled: !data.houseWorkspaceId }] : undefined}
        >
            {!data.houseWorkspaceId ? (
                <InlineNote tone="warning">The Boli Demos workspace is not set up on this database yet. Run pnpm --filter @repo/db jawaf:house --apply, then refresh.</InlineNote>
            ) : null}

            <StatBand
                items={[
                    ...PROSPECT_STAGES.map((s) => ({
                        key: s, icon: STAGE_ICON[s], label: s === "sent" ? "Sent" : s === "met" ? "Met" : s === "pilot" ? "Pilot" : s === "paying" ? "Paying" : "Lost",
                        value: fmtInt(counts[s]), onClick: () => toggle(s), active: stage === s,
                    })),
                    { key: "due", icon: CalendarClock, label: "Follow-ups due", value: fmtInt(due), hint: "today or earlier", tone: due ? ("amber" as const) : undefined, onClick: () => toggle("due"), active: stage === "due" },
                ]}
            />

            <div className="flex min-w-0 items-center gap-2">
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search business, contact, city" aria-label="Search demos" className="h-9 min-w-0 flex-1 rounded-xl sm:max-w-xs" />
                {stage ? <Button variant="ghost" size="sm" className="cursor-pointer rounded-xl" onClick={() => setStage(null)}>Show all</Button> : null}
            </div>

            {rows.length === 0 ? (
                <BoliEmpty
                    kind={data.rows.length ? "search" : "conversations"}
                    framed
                    title={data.rows.length ? "No demos match" : "No demos yet"}
                    description={data.rows.length ? "Change the search or the stage." : "Build a demo bot for a business with New demo. It shows here with its stage and next step."}
                />
            ) : (
                <div data-sheet-keep-open="" className="min-w-0">
                    <TableCard minWidth="min-w-[64rem]">
                        <Table scroller="parent">
                            <TableHeader sticky>
                                <TableRow>
                                    <TableHead>Business</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Stage</TableHead>
                                    <TableHead>Next step</TableHead>
                                    <TableHead>Owner</TableHead>
                                    <TableHead>Bot</TableHead>
                                    <TableHead className="text-right">Questions</TableHead>
                                    <TableHead className="text-right">Answered</TableHead>
                                    <TableHead>Last visit</TableHead>
                                    <TableHead pin="end"><span className="sr-only">Open</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((r) => (
                                    <TableRow key={r.id} data-sheet-keep-open="" className="cursor-pointer" data-state={sheetOpen && openId === r.id ? "selected" : undefined} onClick={() => open(r)}>
                                        <TableCell className="max-w-[220px]">
                                            <p className="truncate text-sm text-neutral-900 dark:text-white">{r.business}</p>
                                            <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{[r.city, r.sector].filter(Boolean).join(" - ") || "-"}</p>
                                        </TableCell>
                                        <TableCell className="max-w-[200px]">
                                            <p className="truncate text-sm text-neutral-800 dark:text-neutral-200">{r.contactName ?? "-"}</p>
                                            <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{r.phone ?? r.email ?? ""}</p>
                                        </TableCell>
                                        <TableCell><StageChip stage={r.stage} /></TableCell>
                                        <TableCell className="whitespace-nowrap text-sm text-neutral-700 dark:text-neutral-300">
                                            {r.nextStepAt ? <>{fmtDate(r.nextStepAt)}{isDue(r.nextStepAt) && r.stage !== "lost" && r.stage !== "paying" ? <span className="ml-1.5 text-xs text-amber-700 dark:text-amber-400">due</span> : null}</> : "-"}
                                        </TableCell>
                                        <TableCell className="max-w-[140px] truncate text-sm text-neutral-700 dark:text-neutral-300">{r.ownerName ?? "-"}</TableCell>
                                        <TableCell><BotState bot={r.bot} /></TableCell>
                                        <TableCell className="text-right text-sm tabular-nums text-neutral-900 dark:text-white">{fmtInt(r.numbers.questions)}</TableCell>
                                        <TableCell className="text-right text-sm tabular-nums text-neutral-700 dark:text-neutral-300">{r.numbers.answerRate === null ? "-" : fmtRate(r.numbers.answerRate)}</TableCell>
                                        <TableCell className="whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-400">{r.numbers.lastVisitAt ? fmtDate(r.numbers.lastVisitAt, true) : "No visits"}</TableCell>
                                        <TableCell pin="end" className="text-right">
                                            <Button size="sm" variant="outline" className="cursor-pointer rounded-xl" data-sheet-keep-open="" onClick={(e) => { e.stopPropagation(); open(r) }}>Open</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableCard>
                </div>
            )}

            <DemoSheet prospectId={openId} open={sheetOpen && !!openId} onOpenChange={setSheetOpen} onExitComplete={() => setOpenId(null)} owners={data.owners} mainUrl={mainUrl} canWrite={canWrite} />
            <DemoFormSheet
                open={formOpen}
                onOpenChange={setFormOpen}
                prefill={formPrefill}
                owners={data.owners}
                onCreated={(id) => { setFormOpen(false); setFormPrefill(null); setOpenId(id); setSheetOpen(true) }}
            />
        </Page>
    )
}
