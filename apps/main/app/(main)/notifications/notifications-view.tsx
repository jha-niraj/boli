"use client"

import * as React from "react"
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, CheckCheck, CheckCircle2, Info, Trash2, XCircle } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { ConfirmPopover } from "@repo/ui/components/ui/confirm-popover"
import { InlineNote } from "@repo/ui/components/ui/inline-note"
import { ListPagination } from "@repo/ui/components/ui/list-pagination"
import { Page } from "@repo/ui/components/ui/page"
import { RelativeTime } from "@repo/ui/components/ui/relative-time"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { toast } from "@repo/ui/components/ui/toast"
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/components/ui/tooltip"
import { cn } from "@repo/ui/lib/utils"
import {
    deleteNotification,
    listNotifications,
    markAllAsRead,
    markAsRead,
    type NotificationPage,
    type NotificationRow,
} from "@/actions/notification.action"
import { BoliEmpty } from "@/components/empty/boli-empty"
import { ROUTES } from "@/lib/navigation"
import { notificationsKey, type NotificationParams } from "./params"
import { NotificationsListSkeleton } from "./notifications-skeleton"

const TYPE_ICON: Record<NotificationRow["type"], { icon: typeof Info; className: string }> = {
    info: { icon: Info, className: "text-neutral-500 dark:text-neutral-400" },
    success: { icon: CheckCircle2, className: "text-emerald-600 dark:text-emerald-400" },
    warning: { icon: AlertTriangle, className: "text-amber-600 dark:text-amber-400" },
    error: { icon: XCircle, className: "text-rose-600 dark:text-rose-400" },
}

/** Tabs and pages are URL state written with history.replaceState; the list refetches under a URL-keyed query. */
export function NotificationsView({ initialParams, initialData, initialError }: {
    initialParams: NotificationParams
    initialData: NotificationPage | null
    initialError: string | null
}) {
    const queryClient = useQueryClient()
    const [params, setParams] = React.useState<NotificationParams>(initialParams)
    const [markingAll, setMarkingAll] = React.useState(false)
    const isInitial = params.filter === initialParams.filter && params.page === initialParams.page

    const query = useQuery({
        queryKey: notificationsKey(params),
        queryFn: async () => {
            const res = await listNotifications(params)
            if (!res.success) throw new Error(res.error)
            return res.data
        },
        initialData: isInitial && initialData ? initialData : undefined,
        placeholderData: keepPreviousData,
    })

    const write = React.useCallback((next: NotificationParams) => {
        setParams(next)
        const url = new URL(window.location.href)
        if (next.filter === "unread") url.searchParams.set("tab", "unread")
        else url.searchParams.delete("tab")
        if (next.page > 1) url.searchParams.set("page", String(next.page))
        else url.searchParams.delete("page")
        window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`)
    }, [])

    const refresh = React.useCallback(() => queryClient.invalidateQueries({ queryKey: ["notifications"] }), [queryClient])

    const data = query.data
    const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
    const unread = data?.unread ?? 0

    // A delete or mark-read can empty the last page; step back to the one that still exists.
    React.useEffect(() => {
        if (data && data.items.length === 0 && params.page > 1 && params.page > totalPages) write({ ...params, page: totalPages })
    }, [data, params, totalPages, write])

    async function onMarkAll() {
        setMarkingAll(true)
        const res = await markAllAsRead()
        setMarkingAll(false)
        if (!res.success) return void toast.error(res.error ?? "Could not mark them read.")
        toast.success("All marked read")
        await refresh()
    }

    async function onMarkOne(n: NotificationRow) {
        if (n.isRead) return
        const res = await markAsRead(n.id)
        if (!res.success) return void toast.error(res.error ?? "Could not mark it read.")
        await refresh()
    }

    async function onDelete(n: NotificationRow) {
        const res = await deleteNotification(n.id)
        if (!res.success) {
            toast.error(res.error ?? "Could not delete it.")
            throw new Error("delete failed")
        }
        toast.success("Deleted")
        await refresh()
    }

    return (
        <Page
            title="Notifications"
            description="Everything the app has told you, newest first."
            body="fill"
            tabs={[
                { value: "all", label: "All" },
                { value: "unread", label: unread > 0 ? `Unread (${unread > 99 ? "99+" : unread})` : "Unread" },
            ]}
            tab={params.filter}
            onTabChange={(v) => write({ filter: v === "unread" ? "unread" : "all", page: 1 })}
            actions={[{
                key: "readall",
                label: "Mark all read",
                icon: <CheckCheck className="h-3.5 w-3.5" />,
                primary: true,
                variant: "outline",
                onClick: () => void onMarkAll(),
                pending: markingAll,
                disabled: unread === 0,
            }]}
        >
            <div className="flex min-w-0 flex-col gap-3">
                {query.isError && data && <InlineNote tone="warning">Could not refresh the list. Showing what was loaded.</InlineNote>}
                {!data ? (
                    initialError && isInitial
                        ? <InlineNote tone="warning">{initialError}</InlineNote>
                        : <NotificationsListSkeleton />
                ) : data.items.length === 0 ? (
                    <BoliEmpty
                        kind="notifications"
                        framed
                        title={params.filter === "unread" ? "You are all caught up" : "No notifications yet"}
                        description={params.filter === "unread" ? "Nothing unread. Read ones are under All." : "The ghanti rings when a payment lands or a key is first used."}
                        action={(
                            <Button asChild size="sm" variant="outline">
                                <AppLink href={ROUTES.settingsNotifications}>Notification settings</AppLink>
                            </Button>
                        )}
                    />
                ) : (
                    <>
                        <div className={cn("min-w-0 rounded-2xl border border-neutral-200 bg-white transition-opacity dark:border-neutral-800 dark:bg-neutral-900", query.isPlaceholderData && "opacity-60")}>
                            <ScrollArea orientation="vertical" viewportClassName="max-h-[44rem]">
                                <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
                                    {data.items.map((n) => (
                                        <NotificationItem key={n.id} n={n} onOpen={() => void onMarkOne(n)} onMarkRead={() => void onMarkOne(n)} onDelete={() => onDelete(n)} />
                                    ))}
                                </ul>
                            </ScrollArea>
                        </div>
                        <ListPagination
                            page={params.page}
                            totalPages={totalPages}
                            totalItems={data.total}
                            itemNoun="notifications"
                            disabled={query.isFetching}
                            onPageChange={(page) => write({ ...params, page })}
                        />
                    </>
                )}
            </div>
        </Page>
    )
}

function NotificationItem({ n, onOpen, onMarkRead, onDelete }: {
    n: NotificationRow
    onOpen: () => void
    onMarkRead: () => void
    onDelete: () => Promise<void>
}) {
    const { icon: Icon, className: iconClass } = TYPE_ICON[n.type]
    const body = (
        <>
            <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", iconClass)} />
            <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                    <p className={cn("truncate text-sm text-neutral-900 dark:text-white", n.isRead ? "font-normal" : "font-semibold")}>{n.title}</p>
                    {!n.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-label="Unread" />}
                </div>
                <p className="mt-0.5 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-300">{n.message}</p>
                <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                    <RelativeTime value={n.createdAt} />
                    {n.actionUrl && <span className="ml-2 font-medium text-neutral-900 dark:text-white">{n.actionLabel ?? "Open"}</span>}
                </p>
            </div>
        </>
    )
    const mainClass = "flex min-w-0 flex-1 items-start gap-3 rounded-xl p-2 text-left"
    const external = n.actionUrl ? /^https?:\/\//.test(n.actionUrl) : false

    return (
        <li className="group flex min-w-0 items-start gap-2 px-2 py-1.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-950/60">
            {n.actionUrl ? (
                external
                    ? <a href={n.actionUrl} target="_blank" rel="noreferrer" onClick={onOpen} className={cn(mainClass, "cursor-pointer")}>{body}</a>
                    : <AppLink href={n.actionUrl} onClick={onOpen} className={cn(mainClass, "cursor-pointer")}>{body}</AppLink>
            ) : (
                <div className={mainClass}>{body}</div>
            )}
            <div className="flex shrink-0 items-center gap-0.5 pt-1.5">
                {!n.isRead && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button type="button" size="icon" variant="ghost" className="h-8 w-8 rounded-full" aria-label="Mark read" onClick={onMarkRead}>
                                <CheckCheck className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Mark read</TooltipContent>
                    </Tooltip>
                )}
                <ConfirmPopover title="Delete this notification?" description="It goes for good." confirmLabel="Delete" onConfirm={onDelete} align="end">
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8 rounded-full" aria-label="Delete">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </ConfirmPopover>
            </div>
        </li>
    )
}
