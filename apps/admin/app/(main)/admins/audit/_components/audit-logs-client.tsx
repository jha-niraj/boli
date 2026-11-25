"use client"

import * as React from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useTable, type ColumnDef } from "@tanstack/react-table"
import { Activity, ArrowRight, Columns3, Search, SlidersHorizontal } from "lucide-react"
import {
    DataGrid, DataGridContainer, dataGridFeatures, type DataGridFeatures,
} from "@repo/ui/components/reui/data-grid/data-grid"
import { DataGridColumnHeader } from "@repo/ui/components/reui/data-grid/data-grid-column-header"
import { DataGridColumnVisibility } from "@repo/ui/components/reui/data-grid/data-grid-column-visibility"
import { DataGridScrollArea } from "@repo/ui/components/reui/data-grid/data-grid-scroll-area"
import { DataGridTable } from "@repo/ui/components/reui/data-grid/data-grid-table"
import {
    Filters, FiltersRow, countFilterRules, createFilterQuery, createFilterRule,
    type FilterField, type FilterQuery,
} from "@repo/ui/components/reui/filters/filters"
import { Badge } from "@repo/ui/components/ui/badge"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { Page } from "@repo/ui/components/ui/page"
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/ui/popover"
import { RelativeTime } from "@repo/ui/components/ui/relative-time"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/ui/select"
import { matchesFilterQuery } from "@repo/ui/lib/filter-match"
import { cn } from "@repo/ui/lib/utils"
import { getAuditLogsFiltered, type AdminListItem, type AuditLogWithAdmin } from "@/actions/admin.action"
import { DetailRow, SideSheet } from "@/components/side-sheet"
import { BoliEmpty } from "@/components/empty/boli-empty"
import { fmtDateTime, fmtNumber, humanize } from "@/components/admin-format"
import { formatAdminRole } from "@/lib/navigation"
import { AUDIT_LIMIT, AUDIT_WINDOWS, auditWindowFrom, type AuditWindow } from "./audit-window"
import { AuditLogsSkeleton } from "./audit-logs-skeleton"
import { TABLE_CARD, TABLE_EDGES } from "@/components/table-card"

type LogsData = { logs: AuditLogWithAdmin[]; total: number }

const MODULES = ["admin_management", "users", "analytics", "communications", "system"] as const
const ROW_H = 44
const HEAD_H = 40
const MAX_BODY = 704 // 44rem - the list ceiling; past it the grid scrolls inside

const iso = (v: Date | string) => (typeof v === "string" ? v : v.toISOString())
const adminLabel = (log: AuditLogWithAdmin) => log.adminUser?.name || log.adminUser?.email || "Unknown admin"

/** Reads one filter field off a row, for `matchesFilterQuery`. The admin field matches the admin's id. */
function readField(log: AuditLogWithAdmin, field: string): unknown {
    switch (field) {
        case "admin": return log.adminId ?? null
        case "module": return log.module
        case "action": return log.action
        default: return null
    }
}

function writeUrl(params: Record<string, string | null>) {
    const url = new URL(window.location.href)
    for (const [k, v] of Object.entries(params)) {
        if (v == null) url.searchParams.delete(k)
        else url.searchParams.set(k, v)
    }
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`)
}

export const AUDIT_DESCRIPTION = "Every admin action, newest first. Kept for 90 days."
const DESCRIPTION = AUDIT_DESCRIPTION

export function AuditLogsClient({ initialWindow, initialLogs, admins, initialAdminFilter }: {
    initialWindow: AuditWindow
    initialLogs: LogsData
    admins: AdminListItem[]
    initialAdminFilter: string | null
}) {
    const [window_, setWindow] = React.useState<AuditWindow>(initialWindow)
    const { data, isFetching, isPending } = useQuery({
        queryKey: ["audit", "logs", window_],
        initialData: window_ === initialWindow ? initialLogs : undefined,
        placeholderData: keepPreviousData,
        queryFn: async (): Promise<LogsData> => {
            const res = await getAuditLogsFiltered({ from: auditWindowFrom(window_), limit: AUDIT_LIMIT })
            if (!res.success || !res.data) throw new Error(res.error ?? "Could not load the audit log")
            return res.data
        },
    })

    const [search, setSearch] = React.useState("")
    const [query, setQuery] = React.useState<FilterQuery<string>>(() =>
        createFilterQuery<string>(initialAdminFilter && admins.some((a) => a.id === initialAdminFilter)
            ? [createFilterRule<string>({ id: "admin-from-url", path: ["admin"], operator: "is", value: initialAdminFilter })]
            : []))

    const logs = data?.logs ?? []
    const actions = React.useMemo(() => Array.from(new Set(logs.map((l) => l.action))).sort(), [logs])
    const fields = React.useMemo<FilterField<string>[]>(() => [
        {
            id: "admin", label: "Admin", type: "select", searchable: admins.length > 8,
            options: admins.map((a) => ({ value: a.id, label: a.name || a.email || a.id })),
        },
        { id: "module", label: "Area", type: "select", options: MODULES.map((m) => ({ value: m, label: humanize(m) })) },
        { id: "action", label: "Action", type: "select", options: actions.map((a) => ({ value: a, label: humanize(a) })) },
    ], [admins, actions])

    const rows = React.useMemo(() => {
        const q = search.trim().toLowerCase()
        return logs.filter((log) =>
            matchesFilterQuery(query, (f) => readField(log, f))
            && (!q || [log.description, log.resourceType, log.resourceId, adminLabel(log), log.adminUser?.email]
                .some((v) => v?.toLowerCase().includes(q))))
    }, [logs, query, search])

    // The row whose sheet is open; `shown` keeps the content while the sheet slides out.
    const [openId, setOpenId] = React.useState<string | null>(null)
    const [shown, setShown] = React.useState<AuditLogWithAdmin | null>(null)
    const open = React.useCallback((log: AuditLogWithAdmin) => { setShown(log); setOpenId(log.id) }, [])

    const columns = React.useMemo<ColumnDef<DataGridFeatures, AuditLogWithAdmin>[]>(() => [
        {
            id: "when",
            accessorFn: (r) => new Date(iso(r.createdAt)).getTime(),
            header: ({ column }) => <DataGridColumnHeader column={column} title="When" />,
            cell: ({ row }) => <RelativeTime value={iso(row.original.createdAt)} className="whitespace-nowrap text-neutral-600 dark:text-neutral-400" />,
            size: 130,
            enableHiding: false,
            meta: { headerTitle: "When" },
        },
        {
            id: "admin",
            accessorFn: (r) => adminLabel(r),
            header: ({ column }) => <DataGridColumnHeader column={column} title="Admin" />,
            cell: ({ row }) => (
                <span className="block min-w-0">
                    <span className="block truncate font-medium text-neutral-900 dark:text-white">{adminLabel(row.original)}</span>
                    {row.original.adminRole && <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">{formatAdminRole(row.original.adminRole)}</span>}
                </span>
            ),
            size: 200,
            meta: { headerTitle: "Admin" },
        },
        {
            id: "action",
            accessorFn: (r) => r.action,
            header: ({ column }) => <DataGridColumnHeader column={column} title="Action" />,
            cell: ({ row }) => <span className={cn("whitespace-nowrap", row.original.action.toUpperCase() === "DELETE" && "text-rose-700 dark:text-rose-400")}>{humanize(row.original.action)}</span>,
            size: 110,
            meta: { headerTitle: "Action" },
        },
        {
            id: "module",
            accessorFn: (r) => r.module,
            header: ({ column }) => <DataGridColumnHeader column={column} title="Area" />,
            cell: ({ row }) => <span className="whitespace-nowrap">{humanize(row.original.module)}</span>,
            size: 150,
            meta: { headerTitle: "Area" },
        },
        {
            id: "description",
            accessorFn: (r) => r.description ?? "",
            header: ({ column }) => <DataGridColumnHeader column={column} title="What happened" />,
            cell: ({ row }) => <span className="block truncate">{row.original.description || "-"}</span>,
            size: 320,
            enableSorting: false,
            meta: { headerTitle: "What happened" },
        },
        {
            id: "resource",
            accessorFn: (r) => r.resourceType ?? "",
            header: ({ column }) => <DataGridColumnHeader column={column} title="Record" />,
            cell: ({ row }) => (
                <span className="block truncate text-neutral-600 dark:text-neutral-400">
                    {row.original.resourceType ?? "-"}{row.original.resourceId ? ` ${row.original.resourceId.slice(0, 8)}` : ""}
                </span>
            ),
            size: 160,
            meta: { headerTitle: "Record" },
        },
        {
            id: "open",
            header: () => <span className="sr-only">Open</span>,
            cell: ({ row }) => (
                <Button size="sm" variant="ghost" className="h-7 cursor-pointer px-2" data-sheet-keep-open="" aria-label="Open entry"
                    onClick={(e) => { e.stopPropagation(); open(row.original) }}>
                    <ArrowRight className="h-4 w-4" />
                </Button>
            ),
            size: 52,
            enableSorting: false,
            enableHiding: false,
            meta: { headerTitle: "Open" },
        },
    ], [open])

    const table = useTable({
        features: dataGridFeatures,
        columns,
        data: rows,
        getRowId: (r: AuditLogWithAdmin) => r.id,
        manualPagination: true,
        initialState: { columnPinning: { start: [], end: ["open"] }, sorting: [{ id: "when", desc: true }] },
    })

    const ruleCount = countFilterRules(query)
    const height = Math.min(MAX_BODY, HEAD_H + Math.max(rows.length, 3) * ROW_H + 12)
    const windowLabel = AUDIT_WINDOWS.find((w) => w.value === window_)?.label ?? ""

    const filterBar = (
        <Filters<string> fields={fields} query={query} onQueryChange={(q) => setQuery(q)} size="sm" variant="basic">
            <FiltersRow showClear />
        </Filters>
    )

    return (
        <Page
            title="Audit log"
            icon={<Activity />}
            description={DESCRIPTION}
            extra={(
                <Select
                    value={window_}
                    onValueChange={(v) => {
                        const next = v as AuditWindow
                        setWindow(next)
                        writeUrl({ window: next === "30d" ? null : next })
                    }}
                >
                    <SelectTrigger className="w-[150px] cursor-pointer sm:w-[170px]" aria-label="Time window"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {AUDIT_WINDOWS.map((w) => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}
                    </SelectContent>
                </Select>
            )}
        >
            {isPending && !data ? <AuditLogsSkeleton rowsOnly /> : (
                <>
                    {/* Toolbar: search, then filters, then the column menu. On a phone: search + one Filters button. */}
                    <div className="flex min-w-0 items-center gap-2">
                        <div className="relative min-w-0 flex-1 sm:max-w-xs sm:flex-none">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search entries" aria-label="Search the audit log" className="w-full pl-9 sm:w-72" />
                        </div>
                        <div className="hidden min-w-0 flex-1 sm:block">{filterBar}</div>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="shrink-0 cursor-pointer gap-2 sm:hidden">
                                    <SlidersHorizontal className="h-4 w-4" />
                                    Filters{ruleCount > 0 ? ` (${ruleCount})` : ""}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-[min(92vw,22rem)]">{filterBar}</PopoverContent>
                        </Popover>
                    </div>
                    <p className={cn("text-xs text-neutral-600 transition-opacity dark:text-neutral-400", isFetching && "opacity-60")}>
                        {fmtNumber(rows.length)} {rows.length === 1 ? "entry" : "entries"} shown - {windowLabel.toLowerCase()}
                        {data && data.total > logs.length ? `, newest ${fmtNumber(logs.length)} of ${fmtNumber(data.total)} loaded` : ""}
                    </p>
                    <div className={cn("min-w-0 transition-opacity", isFetching && "opacity-60")}>
                        <DataGrid
                            table={table}
                            recordCount={rows.length}
                            onRowClick={open}
                            emptyMessage={logs.length === 0 ? "Nothing recorded in this window." : "No entry matches these filters."}
                            tableLayout={{ dense: true, headerSticky: true, headerBackground: true, columnsPinnable: true, columnsVisibility: true, width: "fixed" }}
                        >
                            <div className="mb-2 hidden justify-end sm:flex">
                                <DataGridColumnVisibility
                                    table={table}
                                    trigger={<Button variant="ghost" size="sm" className="cursor-pointer gap-2"><Columns3 className="h-4 w-4" />Columns</Button>}
                                />
                            </div>
                            {rows.length === 0 && !isFetching ? (
                                <BoliEmpty
                                    kind={logs.length === 0 ? "usage" : "search"}
                                    framed
                                    title={logs.length === 0 ? "Nothing recorded yet" : "No entry matches"}
                                    description={logs.length === 0
                                        ? (window_ === "all" ? "Every admin action in the console shows here as it happens." : `No admin action in the ${windowLabel.toLowerCase()}. Pick a longer window.`)
                                        : "Change the search or remove a filter."}
                                />
                            ) : (
                                // data-sheet-keep-open: pressing another row swaps the open sheet instead of closing it.
                                <div data-sheet-keep-open="">
                                    <DataGridContainer className={`${TABLE_CARD} ${TABLE_EDGES}`}>
                                        <DataGridScrollArea style={{ height }}>
                                            <DataGridTable />
                                        </DataGridScrollArea>
                                    </DataGridContainer>
                                </div>
                            )}
                        </DataGrid>
                    </div>
                </>
            )}

            <SideSheet
                open={openId !== null}
                onOpenChange={(o) => { if (!o) setOpenId(null) }}
                onExitComplete={() => setShown(null)}
                title={shown ? adminLabel(shown) : "Entry"}
                description={shown ? fmtDateTime(shown.createdAt) : undefined}
                headerExtra={shown ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                        <Badge variant="outline">{humanize(shown.action)}</Badge>
                        <Badge variant="outline">{humanize(shown.module)}</Badge>
                    </div>
                ) : null}
            >
                {shown && (
                    <>
                        {shown.description && <p className="text-sm leading-relaxed text-neutral-800 dark:text-neutral-200">{shown.description}</p>}
                        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                            <DetailRow label="Admin">{adminLabel(shown)}{shown.adminUser?.email && shown.adminUser.name ? ` (${shown.adminUser.email})` : ""}</DetailRow>
                            {shown.adminRole && <DetailRow label="Role">{formatAdminRole(shown.adminRole)}</DetailRow>}
                            <DetailRow label="Record type">{shown.resourceType ?? "-"}</DetailRow>
                            {shown.resourceId && <DetailRow label="Record id" mono>{shown.resourceId}</DetailRow>}
                            {shown.ipAddress && <DetailRow label="IP address" mono>{shown.ipAddress}</DetailRow>}
                            <DetailRow label="When">{fmtDateTime(shown.createdAt)}</DetailRow>
                        </div>
                        {[["Changes", shown.changes], ["Details", shown.metadata]].map(([label, value]) =>
                            value && typeof value === "object" && Object.keys(value).length > 0 ? (
                                <div key={label as string} className="flex min-w-0 flex-col gap-1.5">
                                    <p className="text-sm font-medium text-neutral-900 dark:text-white">{label as string}</p>
                                    <ScrollArea orientation="vertical" className="rounded-lg bg-neutral-50 dark:bg-neutral-800/60" viewportClassName="max-h-80">
                                        <pre className="whitespace-pre-wrap break-all px-3 py-2.5 font-mono text-xs text-neutral-800 dark:text-neutral-200">
                                            {JSON.stringify(value, null, 2)}
                                        </pre>
                                    </ScrollArea>
                                </div>
                            ) : null)}
                    </>
                )}
            </SideSheet>
        </Page>
    )
}
