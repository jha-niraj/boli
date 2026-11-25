"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Bot, CirclePause, MessageSquare, Radio } from "lucide-react"
import { formatMicroCredits } from "@repo/billing/plans"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { Page } from "@repo/ui/components/ui/page"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/ui/select"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/ui/table"
import { useDebounce } from "@repo/ui/hooks/use-debounce"
import { BoliEmpty } from "@/components/empty/boli-empty"
import { TableCard } from "@/components/table-card"
import { useAdminAccess } from "@/context/admin-access-context"
import { getJawafBots } from "@/actions/jawaf/bots.action"
import type { BotsData } from "@/types/jawaf"
import { BotState, fmtDate, fmtInt, JAWAF_KEYS } from "../../_components/jawaf-bits"
import { BotSheet } from "./bot-sheet"
import { BOTS_DESCRIPTION, BOTS_TITLE } from "./bots-skeleton"

type Kind = "all" | "house" | "customer" | "paused"

/**
 * All bots across every workspace (plan/admin/jawaf/admin-v1.md). Customer bots show NUMBERS ONLY (pages, files,
 * answers and answer rate this Nepal month, credits used, last active) - never a question or an answer. A row opens
 * the bot's sheet (swaps on another row) with the tools.
 */
export function BotsView({ initialData, mainUrl, openBotId }: { initialData: BotsData; mainUrl: string; openBotId: string | null }) {
    const { can } = useAdminAccess()
    const [kind, setKind] = React.useState<Kind>("all")
    const [search, setSearch] = React.useState("")
    const q = useDebounce(search.trim().toLowerCase(), 200)
    const [openId, setOpenId] = React.useState<string | null>(openBotId)
    const [sheetOpen, setSheetOpen] = React.useState(!!openBotId)

    const bots = useQuery({
        queryKey: JAWAF_KEYS.bots,
        queryFn: async () => {
            const r = await getJawafBots()
            if (!r.success) throw new Error(r.error ?? "Could not load the bots")
            return r.data
        },
        initialData,
    })
    const all = bots.data.rows
    const rows = all.filter((b) => {
        if (kind === "house" && !b.house) return false
        if (kind === "customer" && b.house) return false
        if (kind === "paused" && !b.paused) return false
        return !q || [b.name, b.slug, b.workspaceName].some((v) => v.toLowerCase().includes(q))
    })
    const live = all.filter((b) => b.status === "live" && !b.paused).length
    const paused = all.filter((b) => b.paused).length
    const answers = all.reduce((n, b) => n + b.answers, 0)
    const open = (id: string) => { setOpenId(id); setSheetOpen(true) }

    return (
        <Page title={BOTS_TITLE} description={BOTS_DESCRIPTION} icon={<Bot />}>
            <StatBand
                items={[
                    { key: "bots", icon: Bot, label: "Bots", value: fmtInt(all.length), hint: `${fmtInt(all.filter((b) => b.house).length)} demos` },
                    { key: "live", icon: Radio, label: "Live", value: fmtInt(live), hint: "answering visitors" },
                    { key: "paused", icon: CirclePause, label: "Paused", value: fmtInt(paused), tone: paused ? ("amber" as const) : undefined, onClick: () => setKind((k) => (k === "paused" ? "all" : "paused")), active: kind === "paused" },
                    { key: "answers", icon: MessageSquare, label: "Answers", value: fmtInt(answers), hint: "this month, Nepal time" },
                ]}
            />
            <div className="flex min-w-0 items-center gap-2">
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search bot or workspace" aria-label="Search bots" className="h-9 min-w-0 flex-1 rounded-xl sm:max-w-xs" />
                <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
                    <SelectTrigger size="sm" className="w-[140px] cursor-pointer rounded-xl" aria-label="Which bots"><SelectValue /></SelectTrigger>
                    <SelectContent emptyMessage="No filters">
                        <SelectItem value="all">All bots</SelectItem>
                        <SelectItem value="house">Demos</SelectItem>
                        <SelectItem value="customer">Customers</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            {rows.length === 0 ? (
                <BoliEmpty kind={all.length ? "search" : "conversations"} framed title={all.length ? "No bots match" : "No bots yet"} description={all.length ? "Change the search or the filter." : "Bots made in any workspace show here."} />
            ) : (
                <div data-sheet-keep-open="" className="min-w-0">
                    <TableCard minWidth="min-w-[62rem]">
                        <Table scroller="parent">
                            <TableHeader sticky>
                                <TableRow>
                                    <TableHead>Bot</TableHead>
                                    <TableHead>Workspace</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Pages</TableHead>
                                    <TableHead className="text-right">Files</TableHead>
                                    <TableHead className="text-right">Answers this month</TableHead>
                                    <TableHead className="text-right">Answered this month</TableHead>
                                    <TableHead className="text-right">Credits this month</TableHead>
                                    <TableHead>Last visit</TableHead>
                                    <TableHead pin="end"><span className="sr-only">Open</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((b) => (
                                    <TableRow key={b.id} data-sheet-keep-open="" className="cursor-pointer" data-state={sheetOpen && openId === b.id ? "selected" : undefined} onClick={() => open(b.id)}>
                                        <TableCell className="max-w-[220px]">
                                            <p className="truncate text-sm text-neutral-900 dark:text-white">{b.name}</p>
                                            <p className="truncate font-mono text-xs text-neutral-500 dark:text-neutral-400">/j/{b.slug}</p>
                                        </TableCell>
                                        <TableCell className="max-w-[200px]">
                                            <p className="truncate text-sm text-neutral-800 dark:text-neutral-200">{b.workspaceName}</p>
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400">{b.house ? "Demo" : "Customer"}</p>
                                        </TableCell>
                                        <TableCell><BotState bot={b} /></TableCell>
                                        <TableCell className="text-right text-sm tabular-nums">{fmtInt(b.pages)}</TableCell>
                                        <TableCell className="text-right text-sm tabular-nums">{fmtInt(b.files)}</TableCell>
                                        <TableCell className="text-right text-sm tabular-nums text-neutral-900 dark:text-white">{fmtInt(b.answers)}</TableCell>
                                        <TableCell className="text-right text-sm tabular-nums">{b.answerRate === null ? "-" : `${b.answerRate}%`}</TableCell>
                                        <TableCell className="text-right text-sm tabular-nums">{formatMicroCredits(b.creditsUsedMicro)}</TableCell>
                                        <TableCell className="whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-400">{b.lastActiveAt ? fmtDate(b.lastActiveAt, true) : "No visits"}</TableCell>
                                        <TableCell pin="end" className="text-right">
                                            <Button size="sm" variant="outline" className="cursor-pointer rounded-xl" data-sheet-keep-open="" onClick={(e) => { e.stopPropagation(); open(b.id) }}>Open</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableCard>
                </div>
            )}
            <BotSheet botId={openId} open={sheetOpen && !!openId} onOpenChange={setSheetOpen} onExitComplete={() => setOpenId(null)} mainUrl={mainUrl} canWrite={can("jawaf", "write")} />
        </Page>
    )
}
