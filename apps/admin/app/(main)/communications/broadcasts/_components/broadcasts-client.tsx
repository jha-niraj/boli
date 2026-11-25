"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowRight, FilePen, FlaskConical, Mail, Plus, Radio, Save, Search, Send, Trash2 } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { ConfirmPopover } from "@repo/ui/components/ui/confirm-popover"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { InlineNote } from "@repo/ui/components/ui/inline-note"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { Page } from "@repo/ui/components/ui/page"
import { RelativeTime } from "@repo/ui/components/ui/relative-time"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/ui/select"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/ui/table"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { toast } from "@repo/ui/components/ui/toast"
import { useUrlTab } from "@repo/ui/hooks/use-url-tab"
import { TABLE_CARD, TABLE_EDGES } from "@/components/table-card"
import { createBroadcast, deleteBroadcast, getBroadcasts, sendTestBroadcastEmail, updateBroadcast } from "@/actions/broadcasts.action"
import { DetailRow, SideSheet } from "@/components/side-sheet"
import { fmtDateTime, fmtNumber } from "@/components/admin-format"
import { useAdminAccess } from "@/context/admin-access-context"
import { BROADCAST_TONES, type BroadcastInput, type BroadcastStatus, type PlatformBroadcast } from "@/types/communications"
import { BoliEmpty } from "@/components/empty/boli-empty"

type Data = { broadcasts: PlatformBroadcast[]; total: number }
const KEY = ["communications", "broadcasts"] as const
const TABS = ["all", "drafts", "sent"] as const
type Tab = (typeof TABS)[number]
const STATUS_LABEL: Record<BroadcastStatus, string> = { DRAFT: "Draft", SENT: "Sent", SCHEDULED: "Scheduled", FAILED: "Failed" }
const toneLabel = (v: string) => BROADCAST_TONES.find((t) => t.value === v)?.label ?? v
const EMPTY: BroadcastInput = { subject: "", content: "", type: "info", actionUrl: "", actionLabel: "" }
const NEW = "__new__"

const toInput = (b: PlatformBroadcast): BroadcastInput => ({
    subject: b.subject, content: b.content, type: b.type, actionUrl: b.actionUrl ?? "", actionLabel: b.actionLabel ?? "",
})

export function BroadcastsClient({ initial, initialTab, initialOpen }: { initial: Data; initialTab?: string; initialOpen: string | null }) {
    const queryClient = useQueryClient()
    const { can } = useAdminAccess()
    const canWrite = can("communications", "write")
    const canDelete = can("communications", "delete")
    const { data } = useQuery({
        queryKey: KEY,
        initialData: initial,
        queryFn: async () => {
            const res = await getBroadcasts()
            if (!res.success) throw new Error(res.error)
            return res.data
        },
    })
    const [tab, setTab] = useUrlTab(TABS, initialTab, "all")
    const [search, setSearch] = React.useState("")
    const [openId, setOpenId] = React.useState<string | null>(() => (initialOpen && initial.broadcasts.some((b) => b.id === initialOpen) ? initialOpen : null))
    const [draft, setDraft] = React.useState<BroadcastInput>(() => {
        const b = initial.broadcasts.find((x) => x.id === initialOpen)
        return b ? toInput(b) : EMPTY
    })
    const editing = openId && openId !== NEW ? data.broadcasts.find((b) => b.id === openId) ?? null : null
    const locked = !canWrite || editing?.status === "SENT"

    const openRow = (b: PlatformBroadcast) => { setDraft(toInput(b)); setOpenId(b.id) }
    const openNew = () => { setDraft(EMPTY); setOpenId(NEW) }
    const close = () => setOpenId(null)

    const counts = React.useMemo(() => ({
        drafts: data.broadcasts.filter((b) => b.status === "DRAFT").length,
        sent: data.broadcasts.filter((b) => b.status === "SENT").length,
        emails: data.broadcasts.reduce((n, b) => n + b.sentCount, 0),
    }), [data.broadcasts])
    const rows = React.useMemo(() => {
        const q = search.trim().toLowerCase()
        return data.broadcasts.filter((b) =>
            (tab === "all" || (tab === "drafts" ? b.status === "DRAFT" : b.status === "SENT")) && (!q || b.subject.toLowerCase().includes(q)))
    }, [data.broadcasts, tab, search])

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ["communications"] })

    const save = useMutation({
        mutationFn: async () => {
            const res = openId && openId !== NEW ? await updateBroadcast(openId, draft) : await createBroadcast(draft)
            if (!res.success) throw new Error(res.error)
            return res.data
        },
        onSuccess: async (saved) => {
            await invalidate()
            setOpenId(saved.id)
            toast.success("Draft saved")
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Could not save"),
    })
    const test = useMutation({
        mutationFn: async () => {
            const res = await sendTestBroadcastEmail(draft)
            if (!res.success) throw new Error(res.error)
            return res.data
        },
        onSuccess: (r) => r.skipped
            ? toast.info("Email is not set up here", { description: "RESEND_API_KEY is empty, so the test was printed to the server log instead." })
            : toast.success(`Test sent to ${r.sentTo}`),
        onError: (err) => toast.error(err instanceof Error ? err.message : "Could not send the test"),
    })
    const runDelete = async (id: string) => {
        const res = await deleteBroadcast(id)
        if (!res.success) { toast.error(res.error); throw new Error(res.error) }
        close()
        await invalidate()
        toast.success("Deleted")
    }

    return (
        <Page
            title="Broadcasts"
            icon={<Radio />}
            description="Email messages written for every user"
            tabs={[
                { value: "all", label: `All (${fmtNumber(data.broadcasts.length)})` },
                { value: "drafts", label: "Drafts" },
                { value: "sent", label: "Sent" },
            ]}
            tab={tab}
            onTabChange={(v) => setTab(v as Tab)}
            actions={canWrite ? [{ key: "new", label: "New broadcast", icon: <Plus className="h-4 w-4" />, onClick: openNew, primary: true, keepSheetOpen: true }] : undefined}
        >
            <StatBand
                size="sm"
                items={[
                    { icon: FilePen, label: "Drafts", value: fmtNumber(counts.drafts), onClick: () => setTab("drafts"), active: tab === "drafts" },
                    { icon: Send, label: "Sent", value: fmtNumber(counts.sent), onClick: () => setTab("sent"), active: tab === "sent" },
                    { icon: Mail, label: "Emails delivered", value: fmtNumber(counts.emails), hint: "all time" },
                ]}
            />
            <div className="relative w-full max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by subject" aria-label="Search broadcasts" className="pl-9" />
            </div>
            <div className={TABLE_CARD}>
                <ScrollArea orientation="both" viewportClassName="max-h-[44rem]">
                    <div className={`min-w-[760px] ${TABLE_EDGES}`}>
                        <Table scroller="parent">
                            <TableHeader sticky>
                                <TableRow>
                                    <TableHead>Subject</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Delivered</TableHead>
                                    <TableHead>Updated</TableHead>
                                    <TableHead pin="end" className="w-px"><span className="sr-only">Open</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="whitespace-normal">
                                            <BoliEmpty
                                                kind={search ? "search" : "notifications"}
                                                compact
                                                title={search ? "No broadcast matches that search" : data.broadcasts.length === 0 ? "No broadcasts yet" : "None in this tab"}
                                                description={search ? "Change the search or pick another tab." : "Broadcasts you write show here."}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ) : rows.map((b) => (
                                    <TableRow key={b.id} data-sheet-keep-open="" data-state={openId === b.id ? "selected" : undefined} onClick={() => openRow(b)} className="cursor-pointer">
                                        <TableCell className="max-w-[24rem]">
                                            <p className="truncate font-medium text-neutral-900 dark:text-white">{b.subject}</p>
                                            <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{toneLabel(b.type)}</p>
                                        </TableCell>
                                        <TableCell className={b.status === "FAILED" ? "text-rose-700 dark:text-rose-400" : ""}>{STATUS_LABEL[b.status]}</TableCell>
                                        <TableCell className="text-right tabular-nums">{b.status === "SENT" ? fmtNumber(b.sentCount) : "-"}</TableCell>
                                        <TableCell className="whitespace-nowrap text-neutral-600 dark:text-neutral-400"><RelativeTime value={b.updatedAt} /></TableCell>
                                        <TableCell pin="end">
                                            <Button size="sm" variant="ghost" className="cursor-pointer" data-sheet-keep-open="" aria-label={`Open ${b.subject}`}
                                                onClick={(e) => { e.stopPropagation(); openRow(b) }}>
                                                <ArrowRight className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </ScrollArea>
            </div>

            <SideSheet
                open={openId !== null}
                onOpenChange={(o) => { if (!o) close() }}
                onExitComplete={() => setDraft(EMPTY)}
                size="lg"
                title={openId === NEW ? "New broadcast" : editing?.subject || "Broadcast"}
                description={editing ? `${STATUS_LABEL[editing.status]} - last changed ${fmtDateTime(editing.updatedAt)}` : "Saved as a draft; send a test to yourself first"}
                onSubmit={locked ? undefined : () => save.mutate()}
                footer={locked ? undefined : (
                    <>
                        {editing && canDelete && (
                            <ConfirmPopover title="Delete this draft?" description="This can't be undone." onConfirm={() => runDelete(editing.id)} align="start" side="top">
                                <Button type="button" variant="ghost" className="cursor-pointer gap-2 text-rose-700 hover:text-rose-800 sm:mr-auto dark:text-rose-400"><Trash2 className="h-4 w-4" />Delete</Button>
                            </ConfirmPopover>
                        )}
                        <Button type="button" variant="outline" className="cursor-pointer gap-2" disabled={test.isPending} onClick={() => test.mutate()}>
                            {test.isPending ? <InlineLoader size={14} label="Sending" /> : <FlaskConical className="h-4 w-4" />}
                            Send me a test
                        </Button>
                        <Button type="submit" className="cursor-pointer gap-2" disabled={save.isPending}>
                            {save.isPending ? <InlineLoader size={14} label="Saving" /> : <Save className="h-4 w-4" />}
                            Save draft
                        </Button>
                    </>
                )}
            >
                {locked && editing ? (
                    <>
                        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                            <DetailRow label="Status">{STATUS_LABEL[editing.status]}</DetailRow>
                            <DetailRow label="Tone">{toneLabel(editing.type)}</DetailRow>
                            <DetailRow label="Delivered">{editing.status === "SENT" ? `${fmtNumber(editing.sentCount)} of ${fmtNumber(editing.recipientCount)}` : "Not sent"}</DetailRow>
                            <DetailRow label="Sent">{editing.sentAt ? fmtDateTime(editing.sentAt) : "-"}</DetailRow>
                            {editing.actionUrl && <DetailRow label="Button">{editing.actionLabel || "Open"} - {editing.actionUrl}</DetailRow>}
                        </div>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-800 dark:text-neutral-200">{editing.content}</p>
                    </>
                ) : (
                    <>
                        <InlineNote>Sending to every user is a long job (batched, retried, one unsubscribe link per person). Sending to everyone is not built yet: save a draft, or send a test to yourself.</InlineNote>
                        <div className="space-y-1.5">
                            <Label htmlFor="br-subject">Subject</Label>
                            <Input id="br-subject" value={draft.subject} onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))} placeholder="The email's subject line" maxLength={200} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Tone</Label>
                            <Select value={draft.type} onValueChange={(v) => setDraft((d) => ({ ...d, type: v as BroadcastInput["type"] }))}>
                                <SelectTrigger className="w-full cursor-pointer"><SelectValue /></SelectTrigger>
                                <SelectContent>{BROADCAST_TONES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="br-content">Message</Label>
                            <Textarea id="br-content" value={draft.content} onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))} placeholder="Write the email. A blank line starts a new paragraph." className="min-h-40 field-sizing-content" />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="br-label">Button label <span className="font-normal text-neutral-500">(optional)</span></Label>
                                <Input id="br-label" value={draft.actionLabel ?? ""} onChange={(e) => setDraft((d) => ({ ...d, actionLabel: e.target.value }))} placeholder="Open" />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="br-url">Button link</Label>
                                <Input id="br-url" type="url" value={draft.actionUrl ?? ""} onChange={(e) => setDraft((d) => ({ ...d, actionUrl: e.target.value }))} placeholder="https://" />
                            </div>
                        </div>
                    </>
                )}
            </SideSheet>
        </Page>
    )
}
