"use client"

import * as React from "react"
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Bot, Inbox, MessageSquareText, Star } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import type { ChipFilterField, ChipFilterValues } from "@repo/ui/components/ui/chip-filters"
import { ListPagination } from "@repo/ui/components/ui/list-pagination"
import { ListToolbar } from "@repo/ui/components/ui/list-toolbar"
import { Page } from "@repo/ui/components/ui/page"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { Switch } from "@repo/ui/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/ui/table"
import { toast } from "@repo/ui/components/ui/toast"
import { useDebounce } from "@repo/ui/hooks/use-debounce"
import { cn } from "@repo/ui/lib/utils"
import { getContactMessages, getFeedbackList, getInboxStats, setContactHandled, setFeedbackHandled } from "@/actions/inbox.action"
import { BoliEmpty } from "@/components/empty/boli-empty"
import { fmtDateTime, fmtNumber } from "@/components/admin-format"
import { useAdminAccess } from "@/context/admin-access-context"
import {
    DEFAULT_INBOX_FILTERS, INBOX_STATUS_LABELS, INBOX_STATUSES, INBOX_TOPIC_LABELS, INBOX_TOPICS, INBOX_WINDOW_LABELS, INBOX_WINDOWS, JAWAF_PILOT_TOPIC,
    type InboxContactRow, type InboxFeedbackRow, type InboxFilters, type InboxPage, type InboxStats, type InboxStatus, type InboxTab, type InboxWindow,
} from "@/types/inbox"
import { Pill } from "../../../admins/_components/admin-bits"
import { ContactSheet } from "./contact-sheet"
import { FeedbackSheet } from "./feedback-sheet"
import { businessTypeLabel, HandledWord, INBOX_KEYS, Stars } from "./inbox-bits"
import { INBOX_DESCRIPTION, INBOX_TITLE, InboxSkeleton } from "./inbox-skeleton"

const STATUS_FIELD: ChipFilterField = { key: "status", label: "Status", options: INBOX_STATUSES.map((s) => ({ value: s, label: INBOX_STATUS_LABELS[s] })) }
const WINDOW_FIELD: ChipFilterField = { key: "window", label: "Date", options: INBOX_WINDOWS.map((w) => ({ value: w, label: INBOX_WINDOW_LABELS[w] })) }
const TOPIC_FIELD: ChipFilterField = { key: "topic", label: "Topic", options: INBOX_TOPICS.map((t) => ({ value: t, label: INBOX_TOPIC_LABELS[t] ?? t })) }
const MESSAGE_FIELDS = [TOPIC_FIELD, STATUS_FIELD, WINDOW_FIELD]
const FEEDBACK_FIELDS = [STATUS_FIELD, WINDOW_FIELD]

const DEFAULT_VALUES: ChipFilterValues = { status: DEFAULT_INBOX_FILTERS.status }

function isStatus(v: string | undefined): v is InboxStatus {
    return INBOX_STATUSES.some((s) => s === v)
}
function isWindow(v: string | undefined): v is InboxWindow {
    return INBOX_WINDOWS.some((w) => w === v)
}

function toFilters(values: ChipFilterValues, search: string): InboxFilters {
    return {
        search: search || undefined,
        topic: values.topic || undefined,
        status: isStatus(values.status) ? values.status : undefined,
        window: isWindow(values.window) ? values.window : undefined,
    }
}

function isDefault(values: ChipFilterValues, search: string): boolean {
    return !search && values.status === DEFAULT_INBOX_FILTERS.status && !values.topic && !values.window
}

/** One list's toolbar state: search (debounced), chip values and the page, which resets when a filter changes. */
function useListState() {
    const [search, setSearch] = React.useState("")
    const [values, setValuesRaw] = React.useState<ChipFilterValues>(DEFAULT_VALUES)
    const [page, setPage] = React.useState(1)
    const debounced = useDebounce(search.trim(), 300)
    React.useEffect(() => { setPage(1) }, [debounced])
    const setValues = (next: ChipFilterValues) => { setValuesRaw(next); setPage(1) }
    return { search, setSearch, debounced, values, setValues, page, setPage }
}

const TABLE_CARD = "rounded-xl ring-1 ring-neutral-200 dark:ring-neutral-800"
const MUTED = "text-sm text-neutral-600 dark:text-neutral-400"

/**
 * Communications > Inbox. Two tabs synced to ?tab= without a navigation: Contact messages (the site's /contact form;
 * Jawaf pilot requests carry the business fields and a Create demo link) and Feedback (the app's Feedback popover,
 * with ratings). Both open on "Not handled"; a row opens the keep-open right sheet and pressing another row swaps it.
 * Marking handled needs `communications` write.
 */
export function InboxView({ initialTab = "messages", initialStats, initialMessages, initialFeedback }: {
    initialTab?: InboxTab
    initialStats?: InboxStats
    initialMessages?: InboxPage<InboxContactRow>
    initialFeedback?: InboxPage<InboxFeedbackRow>
}) {
    const queryClient = useQueryClient()
    const { can } = useAdminAccess()
    const canWrite = can("communications", "write")
    const [tab, setTab] = React.useState<InboxTab>(initialTab)
    const msg = useListState()
    const fb = useListState()

    const [contactRow, setContactRow] = React.useState<InboxContactRow | null>(null)
    const [contactOpen, setContactOpen] = React.useState(false)
    const [feedbackRow, setFeedbackRow] = React.useState<InboxFeedbackRow | null>(null)
    const [feedbackOpen, setFeedbackOpen] = React.useState(false)

    const msgFilters = toFilters(msg.values, msg.debounced)
    const fbFilters = toFilters(fb.values, fb.debounced)
    const msgFirst = msg.page === 1 && isDefault(msg.values, msg.debounced)
    const fbFirst = fb.page === 1 && isDefault(fb.values, fb.debounced)

    const stats = useQuery({
        queryKey: INBOX_KEYS.stats,
        queryFn: async () => {
            const r = await getInboxStats()
            if (!r.success) throw new Error(r.error ?? "Could not load the figures")
            return r.data
        },
        initialData: initialStats,
    })
    const messages = useQuery({
        queryKey: INBOX_KEYS.messages(msg.page, msgFilters),
        queryFn: async () => {
            const r = await getContactMessages(msgFilters, msg.page)
            if (!r.success) throw new Error(r.error ?? "Could not load messages")
            return r.data
        },
        initialData: msgFirst ? initialMessages : undefined,
        placeholderData: keepPreviousData,
    })
    const feedback = useQuery({
        queryKey: INBOX_KEYS.feedback(fb.page, fbFilters),
        queryFn: async () => {
            const r = await getFeedbackList(fbFilters, fb.page)
            if (!r.success) throw new Error(r.error ?? "Could not load feedback")
            return r.data
        },
        initialData: fbFirst ? initialFeedback : undefined,
        placeholderData: keepPreviousData,
        enabled: tab === "feedback" || fbFirst,
    })

    const contactHandled = useMutation({
        mutationFn: async ({ row, handled }: { row: InboxContactRow; handled: boolean }) => {
            const r = await setContactHandled({ id: row.id, handled })
            if (!r.success) throw new Error(r.error ?? "Could not save that.")
            return { row, handled }
        },
        onSuccess: async ({ row, handled }) => {
            toast.success(handled ? "Marked handled" : "Marked not handled")
            setContactRow((cur) => (cur && cur.id === row.id ? { ...cur, handledAt: handled ? new Date().toISOString() : null, handledByName: handled ? cur.handledByName : null } : cur))
            await queryClient.invalidateQueries({ queryKey: INBOX_KEYS.all })
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save that."),
    })
    const feedbackHandled = useMutation({
        mutationFn: async ({ row, handled }: { row: InboxFeedbackRow; handled: boolean }) => {
            const r = await setFeedbackHandled({ id: row.id, handled })
            if (!r.success) throw new Error(r.error ?? "Could not save that.")
            return { row, handled }
        },
        onSuccess: async ({ row, handled }) => {
            toast.success(handled ? "Marked handled" : "Marked not handled")
            setFeedbackRow((cur) => (cur && cur.id === row.id ? { ...cur, handledAt: handled ? new Date().toISOString() : null, handledByName: handled ? cur.handledByName : null } : cur))
            await queryClient.invalidateQueries({ queryKey: INBOX_KEYS.all })
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save that."),
    })

    const changeTab = (next: string) => {
        const t: InboxTab = next === "feedback" ? "feedback" : "messages"
        setTab(t)
        // Data is already in the browser: update the URL without a navigation.
        const url = new URL(window.location.href)
        if (t === "messages") url.searchParams.delete("tab")
        else url.searchParams.set("tab", t)
        window.history.replaceState(window.history.state, "", url.toString())
    }

    const active = tab === "messages" ? messages : feedback
    if (!active.data && active.isPending) return <InboxSkeleton />

    const s = stats.data
    const openContact = (row: InboxContactRow) => { setContactRow(row); setContactOpen(true) }
    const openFeedback = (row: InboxFeedbackRow) => { setFeedbackRow(row); setFeedbackOpen(true) }
    const pilotsOnly = () => {
        changeTab("messages")
        msg.setValues({ topic: JAWAF_PILOT_TOPIC, status: "open" })
    }

    return (
        <Page
            title={INBOX_TITLE}
            description={INBOX_DESCRIPTION}
            icon={<Inbox />}
            tabs={[{ value: "messages", label: "Contact messages" }, { value: "feedback", label: "Feedback" }]}
            tab={tab}
            onTabChange={changeTab}
        >
            <StatBand
                items={[
                    { icon: Inbox, label: "Messages", value: s ? fmtNumber(s.openMessages) : "-", hint: "not handled" },
                    { icon: Bot, label: "Jawaf pilot", value: s ? fmtNumber(s.openPilots) : "-", hint: "requests waiting", onClick: pilotsOnly },
                    { icon: MessageSquareText, label: "Feedback", value: s ? fmtNumber(s.openFeedback) : "-", hint: "not handled", onClick: () => changeTab("feedback") },
                    {
                        icon: Star,
                        label: "Rating",
                        value: s ? (s.avgRating30d != null ? `${s.avgRating30d.toFixed(1)} / 5` : "No ratings yet") : "-",
                        hint: s && s.rated30d > 0 ? `${fmtNumber(s.rated30d)} rated, last 30 days` : "last 30 days",
                    },
                ]}
            />

            {tab === "messages" ? (
                <div className="flex min-w-0 flex-col gap-3">
                    <ListToolbar
                        search={msg.search}
                        onSearchChange={msg.setSearch}
                        searchPlaceholder="Search name, email, business"
                        searchLabel="Search contact messages"
                        fields={MESSAGE_FIELDS}
                        values={msg.values}
                        onValuesChange={msg.setValues}
                        resultCount={messages.data?.total ?? 0}
                        noun={["message", "messages"]}
                    />
                    {(messages.data?.items.length ?? 0) === 0 && !messages.isFetching ? (
                        <BoliEmpty
                            kind={msgFirst ? "notifications" : "search"}
                            framed
                            title={msgFirst ? "Nothing waiting" : "No messages"}
                            description={msgFirst ? "Every contact message is handled. New ones from the site show here." : "Change the search or a filter."}
                            action={msgFirst ? (
                                <Button variant="outline" className="cursor-pointer rounded-xl" onClick={() => msg.setValues({})}>Show handled too</Button>
                            ) : undefined}
                        />
                    ) : (
                        <div data-sheet-keep-open="" className={cn("min-w-0 transition-opacity", messages.isPlaceholderData && "opacity-60")}>
                            <ScrollArea orientation="both" viewportClassName="max-h-[40rem]" className={TABLE_CARD}>
                                <div className="min-w-[860px]">
                                    <Table scroller="parent">
                                        <TableHeader sticky>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>From</TableHead>
                                                <TableHead>Topic</TableHead>
                                                <TableHead>About</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead pin="end"><span className="sr-only">Open</span></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {messages.data?.items.map((m) => (
                                                <TableRow key={m.id} className="cursor-pointer" data-state={contactOpen && contactRow?.id === m.id ? "selected" : undefined} onClick={() => openContact(m)}>
                                                    <TableCell className={cn("whitespace-nowrap", MUTED)}>{fmtDateTime(m.createdAt)}</TableCell>
                                                    <TableCell className="max-w-[220px]">
                                                        <p className="truncate text-sm text-neutral-900 dark:text-white">{m.name}</p>
                                                        <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{m.email}</p>
                                                    </TableCell>
                                                    <TableCell><Pill>{INBOX_TOPIC_LABELS[m.topic ?? ""] ?? m.topic ?? "No topic"}</Pill></TableCell>
                                                    <TableCell className="max-w-[320px]">
                                                        {m.pilot ? (
                                                            <>
                                                                <p className="truncate text-sm text-neutral-900 dark:text-white">{m.pilot.businessName}</p>
                                                                <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{[businessTypeLabel(m), m.pilot.city].filter(Boolean).join(" - ")}</p>
                                                            </>
                                                        ) : (
                                                            <p className="truncate text-sm text-neutral-700 dark:text-neutral-300">{m.message}</p>
                                                        )}
                                                    </TableCell>
                                                    <TableCell><HandledWord handledAt={m.handledAt} /></TableCell>
                                                    <TableCell pin="end" className="text-right">
                                                        <Button size="sm" variant="outline" className="cursor-pointer rounded-xl" data-sheet-keep-open=""
                                                            onClick={(e) => { e.stopPropagation(); openContact(m) }}>
                                                            Open
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                    <ListPagination page={msg.page} totalPages={messages.data?.pages ?? 1} totalItems={messages.data?.total} itemNoun="messages" onPageChange={msg.setPage} disabled={messages.isFetching} />
                </div>
            ) : (
                <div className="flex min-w-0 flex-col gap-3">
                    <ListToolbar
                        search={fb.search}
                        onSearchChange={fb.setSearch}
                        searchPlaceholder="Search message, email, page"
                        searchLabel="Search feedback"
                        fields={FEEDBACK_FIELDS}
                        values={fb.values}
                        onValuesChange={fb.setValues}
                        resultCount={feedback.data?.total ?? 0}
                        noun={["message", "messages"]}
                    />
                    {(feedback.data?.items.length ?? 0) === 0 && !feedback.isFetching ? (
                        <BoliEmpty
                            kind={fbFirst ? "notifications" : "search"}
                            framed
                            title={fbFirst ? "Nothing waiting" : "No feedback"}
                            description={fbFirst ? "Every piece of feedback is handled. New ones from the app show here." : "Change the search or a filter."}
                            action={fbFirst ? (
                                <Button variant="outline" className="cursor-pointer rounded-xl" onClick={() => fb.setValues({})}>Show handled too</Button>
                            ) : undefined}
                        />
                    ) : (
                        <div data-sheet-keep-open="" className={cn("min-w-0 transition-opacity", feedback.isPlaceholderData && "opacity-60")}>
                            <ScrollArea orientation="both" viewportClassName="max-h-[40rem]" className={TABLE_CARD}>
                                <div className="min-w-[860px]">
                                    <Table scroller="parent">
                                        <TableHeader sticky>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>From</TableHead>
                                                <TableHead>Rating</TableHead>
                                                <TableHead>Message</TableHead>
                                                <TableHead>Page</TableHead>
                                                <TableHead pin="end">Handled</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {feedback.data?.items.map((f) => {
                                                const saving = feedbackHandled.isPending && feedbackHandled.variables?.row.id === f.id
                                                return (
                                                    <TableRow key={f.id} className="cursor-pointer" data-state={feedbackOpen && feedbackRow?.id === f.id ? "selected" : undefined} onClick={() => openFeedback(f)}>
                                                        <TableCell className={cn("whitespace-nowrap", MUTED)}>{fmtDateTime(f.createdAt)}</TableCell>
                                                        <TableCell className="max-w-[220px]">
                                                            <p className="truncate text-sm text-neutral-900 dark:text-white">{f.userName || (f.userEmail ? "No name" : "Account deleted")}</p>
                                                            <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{f.userEmail ?? "-"}</p>
                                                        </TableCell>
                                                        <TableCell><Stars rating={f.rating} /></TableCell>
                                                        <TableCell className="max-w-[320px]"><p className="truncate text-sm text-neutral-700 dark:text-neutral-300">{f.message}</p></TableCell>
                                                        <TableCell className="max-w-[180px]"><p className="truncate font-mono text-xs text-neutral-600 dark:text-neutral-400">{f.page ?? "-"}</p></TableCell>
                                                        <TableCell pin="end" onClick={(e) => e.stopPropagation()}>
                                                            {canWrite ? (
                                                                <Switch
                                                                    checked={!!f.handledAt}
                                                                    disabled={saving}
                                                                    onCheckedChange={(on) => feedbackHandled.mutate({ row: f, handled: on })}
                                                                    aria-label={f.handledAt ? "Mark not handled" : "Mark handled"}
                                                                    className="cursor-pointer"
                                                                    data-sheet-keep-open=""
                                                                />
                                                            ) : (
                                                                <HandledWord handledAt={f.handledAt} />
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                    <ListPagination page={fb.page} totalPages={feedback.data?.pages ?? 1} totalItems={feedback.data?.total} itemNoun="feedback messages" onPageChange={fb.setPage} disabled={feedback.isFetching} />
                </div>
            )}

            <ContactSheet
                row={contactRow}
                open={contactOpen && !!contactRow}
                onOpenChange={setContactOpen}
                onExitComplete={() => setContactRow(null)}
                canWrite={canWrite}
                pending={contactHandled.isPending}
                onSetHandled={(row, handled) => contactHandled.mutate({ row, handled })}
            />
            <FeedbackSheet
                row={feedbackRow}
                open={feedbackOpen && !!feedbackRow}
                onOpenChange={setFeedbackOpen}
                onExitComplete={() => setFeedbackRow(null)}
                canWrite={canWrite}
                pending={feedbackHandled.isPending}
                onSetHandled={(row, handled) => feedbackHandled.mutate({ row, handled })}
            />
        </Page>
    )
}
