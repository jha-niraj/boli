"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Archive, ArrowRight, FilePen, Megaphone, Plus, Search, Send, Trash2 } from "lucide-react"
import { Badge } from "@repo/ui/components/ui/badge"
import { Button } from "@repo/ui/components/ui/button"
import { ConfirmPopover } from "@repo/ui/components/ui/confirm-popover"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { Page } from "@repo/ui/components/ui/page"
import { RelativeTime } from "@repo/ui/components/ui/relative-time"
import { RichText } from "@repo/ui/components/ui/rich-text"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/ui/select"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/ui/table"
import { toast } from "@repo/ui/components/ui/toast"
import { useUrlTab } from "@repo/ui/hooks/use-url-tab"
import { TABLE_CARD, TABLE_EDGES } from "@/components/table-card"
import {
    createPlatformAnnouncement, deletePlatformAnnouncement, getPlatformAnnouncements, setPlatformAnnouncementStatus, updatePlatformAnnouncement,
} from "@/actions/announcements.action"
import { RichTextEditor } from "@/components/rich-text-editor"
import { DetailRow, SideSheet } from "@/components/side-sheet"
import { fmtDateTime, fmtNumber } from "@/components/admin-format"
import { useAdminAccess } from "@/context/admin-access-context"
import { BoliEmpty } from "@/components/empty/boli-empty"
import {
    ANNOUNCEMENT_PRIORITIES, ANNOUNCEMENT_TYPES,
    type AnnouncementInput, type AnnouncementStatus, type PlatformAnnouncement,
} from "@/types/communications"

type Data = { announcements: PlatformAnnouncement[]; total: number }
const KEY = ["communications", "announcements"] as const
const TABS = ["all", "published", "drafts", "archived"] as const
type Tab = (typeof TABS)[number]
const TAB_STATUS: Record<Tab, AnnouncementStatus | null> = { all: null, published: "PUBLISHED", drafts: "DRAFT", archived: "ARCHIVED" }
const STATUS_LABEL: Record<AnnouncementStatus, string> = { DRAFT: "Draft", PUBLISHED: "Published", ARCHIVED: "Archived" }
const typeLabel = (v: string) => ANNOUNCEMENT_TYPES.find((t) => t.value === v)?.label ?? v
const priorityLabel = (v: string) => ANNOUNCEMENT_PRIORITIES.find((p) => p.value === v)?.label ?? v

const EMPTY: AnnouncementInput = { title: "", content: "", announcementType: "PLATFORM_NEWS", priority: "NORMAL", targetAudience: "", status: "DRAFT" }
const NEW = "__new__"

function toInput(a: PlatformAnnouncement): AnnouncementInput {
    return {
        title: a.title, content: a.content, announcementType: a.announcementType, priority: a.priority,
        targetAudience: a.targetAudience ?? "", status: a.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
    }
}

export function AnnouncementsClient({ initial, initialTab, initialOpen }: { initial: Data; initialTab?: string; initialOpen: string | null }) {
    const queryClient = useQueryClient()
    const { can } = useAdminAccess()
    const canWrite = can("communications", "write")
    const canDelete = can("communications", "delete")
    const { data } = useQuery({
        queryKey: KEY,
        initialData: initial,
        queryFn: async () => {
            const res = await getPlatformAnnouncements()
            if (!res.success) throw new Error(res.error)
            return res.data
        },
    })
    const [tab, setTab] = useUrlTab(TABS, initialTab, "all")
    const [search, setSearch] = React.useState("")

    // The open sheet: an id, NEW for a new one, or null. `draft` resets in onExitComplete, never on close.
    const [openId, setOpenId] = React.useState<string | null>(() => (initialOpen && initial.announcements.some((a) => a.id === initialOpen) ? initialOpen : null))
    const [draft, setDraft] = React.useState<AnnouncementInput>(() => {
        const a = initial.announcements.find((x) => x.id === initialOpen)
        return a ? toInput(a) : EMPTY
    })
    const editing = openId && openId !== NEW ? data.announcements.find((a) => a.id === openId) ?? null : null

    const openRow = (a: PlatformAnnouncement) => { setDraft(toInput(a)); setOpenId(a.id) }
    const openNew = () => { setDraft(EMPTY); setOpenId(NEW) }
    const close = () => setOpenId(null)

    const counts = React.useMemo(() => {
        const c = { PUBLISHED: 0, DRAFT: 0, ARCHIVED: 0 }
        for (const a of data.announcements) c[a.status] += 1
        return c
    }, [data.announcements])
    const rows = React.useMemo(() => {
        const status = TAB_STATUS[tab]
        const q = search.trim().toLowerCase()
        return data.announcements.filter((a) => (!status || a.status === status) && (!q || a.title.toLowerCase().includes(q)))
    }, [data.announcements, tab, search])

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ["communications"] })

    const save = useMutation({
        mutationFn: async (status: "DRAFT" | "PUBLISHED") => {
            const input = { ...draft, status }
            const res = openId && openId !== NEW ? await updatePlatformAnnouncement(openId, input) : await createPlatformAnnouncement(input)
            if (!res.success) throw new Error(res.error)
            return res.data
        },
        onSuccess: async (saved, status) => {
            await invalidate()
            setOpenId(saved.id)
            toast.success(status === "PUBLISHED" ? "Published" : "Draft saved")
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Could not save"),
    })

    const runStatus = async (id: string, status: AnnouncementStatus) => {
        const res = await setPlatformAnnouncementStatus(id, status)
        if (!res.success) { toast.error(res.error); throw new Error(res.error) }
        await invalidate()
        toast.success(status === "ARCHIVED" ? "Archived" : "Status changed")
    }
    const runDelete = async (id: string) => {
        const res = await deletePlatformAnnouncement(id)
        if (!res.success) { toast.error(res.error); throw new Error(res.error) }
        close()
        await invalidate()
        toast.success("Deleted")
    }

    const sheetOpen = openId !== null
    const readOnly = !canWrite

    return (
        <Page
            title="Announcements"
            icon={<Megaphone />}
            description="Messages shown to everyone in the app"
            tabs={[
                { value: "all", label: `All (${fmtNumber(data.announcements.length)})` },
                { value: "published", label: "Published" },
                { value: "drafts", label: "Drafts" },
                { value: "archived", label: "Archived" },
            ]}
            tab={tab}
            onTabChange={(v) => setTab(v as Tab)}
            actions={canWrite ? [{ key: "new", label: "New announcement", icon: <Plus className="h-4 w-4" />, onClick: openNew, primary: true, keepSheetOpen: true }] : undefined}
        >
            <StatBand
                size="sm"
                items={[
                    { icon: Megaphone, label: "Published", value: fmtNumber(counts.PUBLISHED), onClick: () => setTab("published"), active: tab === "published" },
                    { icon: FilePen, label: "Drafts", value: fmtNumber(counts.DRAFT), onClick: () => setTab("drafts"), active: tab === "drafts" },
                    { icon: Archive, label: "Archived", value: fmtNumber(counts.ARCHIVED), onClick: () => setTab("archived"), active: tab === "archived" },
                ]}
            />
            <div className="relative w-full max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title" aria-label="Search announcements" className="pl-9" />
            </div>
            <div className={TABLE_CARD}>
                <ScrollArea orientation="both" viewportClassName="max-h-[44rem]">
                    <div className={`min-w-[760px] ${TABLE_EDGES}`}>
                        <Table scroller="parent">
                            <TableHeader sticky>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Priority</TableHead>
                                    <TableHead>Status</TableHead>
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
                                                title={search ? "No announcement matches that search" : data.announcements.length === 0 ? "No announcements yet" : "None in this tab"}
                                                description={search ? "Change the search or pick another tab." : "Announcements you write show here."}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ) : rows.map((a) => (
                                    <TableRow
                                        key={a.id}
                                        data-sheet-keep-open=""
                                        data-state={openId === a.id ? "selected" : undefined}
                                        onClick={() => openRow(a)}
                                        className="cursor-pointer"
                                    >
                                        <TableCell className="max-w-[24rem]">
                                            <p className="truncate font-medium text-neutral-900 dark:text-white">{a.title}</p>
                                            <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{typeLabel(a.announcementType)}{a.targetAudience ? ` - ${a.targetAudience}` : ""}</p>
                                        </TableCell>
                                        <TableCell className={a.priority === "URGENT" ? "text-rose-700 dark:text-rose-400" : a.priority === "HIGH" ? "text-amber-700 dark:text-amber-400" : ""}>
                                            {priorityLabel(a.priority)}
                                        </TableCell>
                                        <TableCell>{STATUS_LABEL[a.status]}</TableCell>
                                        <TableCell className="whitespace-nowrap text-neutral-600 dark:text-neutral-400"><RelativeTime value={a.updatedAt} /></TableCell>
                                        <TableCell pin="end">
                                            <Button size="sm" variant="ghost" className="cursor-pointer" data-sheet-keep-open="" aria-label={`Open ${a.title}`}
                                                onClick={(e) => { e.stopPropagation(); openRow(a) }}>
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
                open={sheetOpen}
                onOpenChange={(o) => { if (!o) close() }}
                onExitComplete={() => setDraft(EMPTY)}
                size="lg"
                title={openId === NEW ? "New announcement" : editing?.title || "Announcement"}
                description={editing ? `${STATUS_LABEL[editing.status]} - last changed ${fmtDateTime(editing.updatedAt)}` : "Shown to everyone once published"}
                onSubmit={readOnly ? undefined : () => save.mutate("PUBLISHED")}
                footer={readOnly ? undefined : (
                    <>
                        {editing && canDelete && (
                            <ConfirmPopover title="Delete this announcement?" description="It disappears for everyone. This can't be undone." onConfirm={() => runDelete(editing.id)} align="start" side="top">
                                <Button type="button" variant="ghost" className="cursor-pointer gap-2 text-rose-700 hover:text-rose-800 sm:mr-auto dark:text-rose-400"><Trash2 className="h-4 w-4" />Delete</Button>
                            </ConfirmPopover>
                        )}
                        {editing?.status === "PUBLISHED" && (
                            <ConfirmPopover title="Archive it?" description="People stop seeing it. You can publish it again later." confirmLabel="Archive" destructive={false} onConfirm={() => runStatus(editing.id, "ARCHIVED")} side="top">
                                <Button type="button" variant="outline" className="cursor-pointer gap-2"><Archive className="h-4 w-4" />Archive</Button>
                            </ConfirmPopover>
                        )}
                        {editing?.status !== "PUBLISHED" && (
                            <Button type="button" variant="outline" className="cursor-pointer" disabled={save.isPending} onClick={() => save.mutate("DRAFT")}>Save draft</Button>
                        )}
                        <Button type="submit" className="cursor-pointer gap-2" disabled={save.isPending}>
                            {save.isPending ? <InlineLoader size={14} label="Saving" /> : <Send className="h-4 w-4" />}
                            {editing?.status === "PUBLISHED" ? "Save changes" : "Publish"}
                        </Button>
                    </>
                )}
            >
                {readOnly ? (
                    editing && (
                        <>
                            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                <DetailRow label="Type">{typeLabel(editing.announcementType)}</DetailRow>
                                <DetailRow label="Priority">{priorityLabel(editing.priority)}</DetailRow>
                                <DetailRow label="Audience">{editing.targetAudience || "Everyone"}</DetailRow>
                                <DetailRow label="Published">{editing.publishedAt ? fmtDateTime(editing.publishedAt) : "Not yet"}</DetailRow>
                            </div>
                            <RichText html={editing.content} className="rte-output text-sm" />
                        </>
                    )
                ) : (
                    <>
                        {editing && <div><Badge variant="outline">{STATUS_LABEL[editing.status]}</Badge></div>}
                        <div className="space-y-1.5">
                            <Label htmlFor="ann-title">Title</Label>
                            <Input id="ann-title" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} placeholder="What is it about?" maxLength={200} />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label>Type</Label>
                                <Select value={draft.announcementType} onValueChange={(v) => setDraft((d) => ({ ...d, announcementType: v as AnnouncementInput["announcementType"] }))}>
                                    <SelectTrigger className="w-full cursor-pointer"><SelectValue /></SelectTrigger>
                                    <SelectContent>{ANNOUNCEMENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Priority</Label>
                                <Select value={draft.priority} onValueChange={(v) => setDraft((d) => ({ ...d, priority: v as AnnouncementInput["priority"] }))}>
                                    <SelectTrigger className="w-full cursor-pointer"><SelectValue /></SelectTrigger>
                                    <SelectContent>{ANNOUNCEMENT_PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="ann-audience">Audience note <span className="font-normal text-neutral-500">(optional)</span></Label>
                            <Input id="ann-audience" value={draft.targetAudience ?? ""} onChange={(e) => setDraft((d) => ({ ...d, targetAudience: e.target.value }))} placeholder="Everyone" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Message</Label>
                            <RichTextEditor value={draft.content} onChange={(html) => setDraft((d) => ({ ...d, content: html }))} placeholder="Write the announcement" minHeight="300px" />
                        </div>
                    </>
                )}
            </SideSheet>
        </Page>
    )
}
