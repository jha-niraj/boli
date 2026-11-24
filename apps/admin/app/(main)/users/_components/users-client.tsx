"use client"

import * as React from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useTable, type ColumnDef } from "@tanstack/react-table"
import { Columns3, ListFilter, MailCheck, Search, UserCheck, UserPlus, Users } from "lucide-react"
import {
    DataGrid, DataGridContainer, dataGridFeatures, type DataGridFeatures,
} from "@repo/ui/components/reui/data-grid/data-grid"
import { DataGridColumnHeader } from "@repo/ui/components/reui/data-grid/data-grid-column-header"
import { DataGridColumnVisibility } from "@repo/ui/components/reui/data-grid/data-grid-column-visibility"
import { DataGridScrollArea } from "@repo/ui/components/reui/data-grid/data-grid-scroll-area"
import { DataGridTable } from "@repo/ui/components/reui/data-grid/data-grid-table"
import { Filters } from "@repo/ui/components/reui/filters/filters"
import { countFilterRules } from "@repo/ui/components/reui/filters/filters-query"
import type { FilterQuery } from "@repo/ui/components/reui/filters/filters-types"
import { Button } from "@repo/ui/components/ui/button"
import { BoliEmpty } from "@/components/empty/boli-empty"
import { Input } from "@repo/ui/components/ui/input"
import { ListPagination } from "@repo/ui/components/ui/list-pagination"
import { Page } from "@repo/ui/components/ui/page"
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/ui/popover"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { useDebounce } from "@repo/ui/hooks/use-debounce"
import { cn } from "@repo/ui/lib/utils"
import { getUsers, getUserStats } from "@/actions/user.action"
import type { UserListPage, UserRow, UserStats } from "@/types/admin"
import { formatDate, PersonAvatar, Pill } from "../../admins/_components/admin-bits"
import { UserSheet } from "./user-sheet"
import { UsersSkeleton } from "./users-skeleton"
import { EMPTY_USER_QUERY, resolveUserFilters, USER_FILTER_FIELDS, USER_KEYS, USERS_PAGE_SIZE } from "./users-query"

/** Row height and header height the bounded grid is sized from (a list ceiling of about 12 rows). */
const ROW_H = 52
const HEAD_H = 41
const MAX_H = 640

/**
 * Users - a server-paginated list on the ReUI DataGrid (sortable headers, column picker, the actions column pinned
 * to the end) inside a bounded scroll area, with ReUI Filters chips in the toolbar. Search stays outside the filters;
 * on a phone the chips move into one "Filters" button. Search and chips go to the server action; sorting sorts the
 * page that is loaded. A row opens the keep-open user sheet.
 */
export function UsersClient({ initialList, initialStats }: { initialList?: UserListPage; initialStats?: UserStats }) {
    const [page, setPage] = React.useState(1)
    const [search, setSearch] = React.useState("")
    const debounced = useDebounce(search.trim(), 300)
    const [query, setQuery] = React.useState<FilterQuery>(EMPTY_USER_QUERY)
    const filters = React.useMemo(() => resolveUserFilters(query), [query])
    const filterKey = JSON.stringify(filters)
    const [selected, setSelected] = React.useState<UserRow | null>(null)
    const [sheetOpen, setSheetOpen] = React.useState(false)

    // A new search or a new chip starts again on page 1.
    React.useEffect(() => { setPage(1) }, [debounced, filterKey])

    const isFirst = page === 1 && debounced === "" && filterKey === "{}"
    const list = useQuery({
        queryKey: USER_KEYS.list(page, debounced, filters),
        queryFn: async () => {
            const r = await getUsers(page, USERS_PAGE_SIZE, debounced, undefined, filters)
            if (!r.success || !r.data) throw new Error(r.error ?? "Could not load users")
            return r.data
        },
        initialData: isFirst ? initialList : undefined,
        placeholderData: keepPreviousData,
    })
    const stats = useQuery({
        queryKey: USER_KEYS.stats,
        queryFn: async () => {
            const r = await getUserStats()
            if (!r.success || !r.data) throw new Error(r.error ?? "Could not load the counts")
            return r.data
        },
        initialData: initialStats,
    })

    const rows = React.useMemo(() => list.data?.items ?? [], [list.data])

    const columns = React.useMemo<ColumnDef<DataGridFeatures, UserRow>[]>(() => [
        {
            id: "user",
            accessorFn: (r) => r.name || r.email,
            header: ({ column }) => <DataGridColumnHeader column={column} title="User" />,
            cell: ({ row }) => (
                <div className="flex min-w-0 items-center gap-3">
                    <PersonAvatar name={row.original.name} email={row.original.email} image={row.original.image} />
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">{row.original.name || "No name"}</p>
                        <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{row.original.email}</p>
                    </div>
                </div>
            ),
            size: 300,
            enableHiding: false,
            meta: { headerTitle: "User" },
        },
        {
            id: "role",
            accessorFn: (r) => r.role,
            header: ({ column }) => <DataGridColumnHeader column={column} title="Role" />,
            cell: ({ row }) => <Pill>{row.original.role === "ADMIN" ? "Admin" : "User"}</Pill>,
            size: 110,
            meta: { headerTitle: "Role" },
        },
        {
            id: "status",
            accessorFn: (r) => (r.isActive ? "Active" : "Inactive"),
            header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
            cell: ({ row }) => (
                <span className="inline-flex items-center gap-1.5 text-sm text-neutral-700 dark:text-neutral-300">
                    <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", row.original.isActive ? "bg-emerald-500" : "bg-neutral-400")} />
                    {row.original.isActive ? "Active" : "Inactive"}
                </span>
            ),
            size: 120,
            meta: { headerTitle: "Status" },
        },
        {
            id: "verified",
            accessorFn: (r) => (r.emailVerified ? "Verified" : "Not verified"),
            header: ({ column }) => <DataGridColumnHeader column={column} title="Email" />,
            cell: ({ row }) => <span className="text-sm text-neutral-700 dark:text-neutral-300">{row.original.emailVerified ? "Verified" : "Not verified"}</span>,
            size: 130,
            meta: { headerTitle: "Email" },
        },
        {
            id: "joined",
            accessorFn: (r) => new Date(r.createdAt).getTime(),
            header: ({ column }) => <DataGridColumnHeader column={column} title="Joined" />,
            cell: ({ row }) => <span className="text-sm text-neutral-600 dark:text-neutral-400">{formatDate(row.original.createdAt)}</span>,
            size: 130,
            meta: { headerTitle: "Joined" },
        },
        {
            id: "actions",
            header: () => <span className="sr-only">Actions</span>,
            cell: ({ row }) => (
                <Button
                    size="sm"
                    variant="outline"
                    className="cursor-pointer rounded-xl"
                    data-sheet-keep-open=""
                    onClick={(e) => { e.stopPropagation(); setSelected(row.original); setSheetOpen(true) }}
                >
                    Open
                </Button>
            ),
            size: 90,
            enableSorting: false,
            enableHiding: false,
            meta: { headerTitle: "Actions" },
        },
    ], [])

    const table = useTable({
        features: dataGridFeatures,
        columns,
        data: rows,
        getRowId: (r: UserRow) => r.id,
        // The server pages the list; the grid's own pagination is off.
        manualPagination: true,
        initialState: { columnPinning: { start: [], end: ["actions"] } },
    })

    if (!list.data && list.isPending) return <UsersSkeleton />

    const total = list.data?.total ?? 0
    const pages = list.data?.pages ?? 1
    const s = stats.data
    const chipCount = countFilterRules(query)
    const height = Math.min(MAX_H, HEAD_H + Math.max(rows.length, 1) * ROW_H + 12)
    const filtering = debounced !== "" || chipCount > 0

    const filtersBar = (
        <Filters fields={USER_FILTER_FIELDS} query={query} onQueryChange={(q) => setQuery(q)} variant="basic" size="sm" showClear />
    )

    return (
        <Page
            title="Users"
            description="Everyone with an account. Press a row to see the details."
            icon={<Users />}
        >
            <StatBand
                items={[
                    { icon: Users, label: "Users", value: s ? s.total.toLocaleString() : "-", hint: "all time" },
                    { icon: UserCheck, label: "Active", value: s ? s.active.toLocaleString() : "-", hint: s ? `of ${s.total.toLocaleString()}` : undefined },
                    { icon: MailCheck, label: "Email verified", value: s ? s.verified.toLocaleString() : "-", progress: s && s.total > 0 ? Math.round((s.verified / s.total) * 100) : undefined },
                    { icon: UserPlus, label: "New", value: s ? s.newLast30.toLocaleString() : "-", hint: "last 30 days" },
                ]}
            />

            <DataGrid
                table={table}
                recordCount={total}
                onRowClick={(r: UserRow) => { setSelected(r); setSheetOpen(true) }}
                emptyMessage={filtering ? "No users match these filters." : "No users yet."}
                tableLayout={{
                    headerSticky: true,
                    headerBackground: true,
                    columnsPinnable: true,
                    columnsVisibility: true,
                    width: "fixed",
                }}
            >
                <div className="flex min-w-0 flex-col gap-3">
                    {/* Toolbar: search, then filters, then the column picker. One row on a phone: search + one menu. */}
                    <div className="flex min-w-0 items-center gap-2">
                        <div className="relative min-w-0 flex-1 sm:max-w-xs">
                            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search name or email"
                                aria-label="Search users"
                                className="h-9 rounded-xl pl-9"
                            />
                        </div>
                        <div className="hidden min-w-0 flex-1 sm:block">{filtersBar}</div>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="cursor-pointer gap-1.5 rounded-xl sm:hidden" aria-label="Filters">
                                    <ListFilter className="h-4 w-4" />
                                    {chipCount > 0 ? <span className="tabular-nums">{chipCount}</span> : null}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-[min(92vw,22rem)]">
                                <p className="mb-2 text-xs font-medium text-neutral-600 dark:text-neutral-400">Filters</p>
                                {filtersBar}
                            </PopoverContent>
                        </Popover>
                        <DataGridColumnVisibility
                            table={table}
                            trigger={(
                                <Button variant="outline" size="sm" className="shrink-0 cursor-pointer gap-1.5 rounded-xl" aria-label="Columns">
                                    <Columns3 className="h-4 w-4" />
                                    <span className="hidden md:inline">Columns</span>
                                </Button>
                            )}
                        />
                    </div>

                    {rows.length === 0 && !list.isFetching ? (
                        <BoliEmpty
                            kind={filtering ? "search" : "usage"}
                            framed
                            title={filtering ? "No users match" : "No users yet"}
                            description={filtering ? "Change the search or remove a filter." : "People who sign up show here."}
                        />
                    ) : (
                        // The whole grid keeps an open user sheet open: a press on another row swaps it.
                        <div data-sheet-keep-open="" className={cn("min-w-0 transition-opacity", list.isPlaceholderData && "opacity-60")}>
                            <DataGridContainer className="rounded-xl ring-1 ring-neutral-200 dark:ring-neutral-800">
                                <DataGridScrollArea style={{ height }}>
                                    <DataGridTable />
                                </DataGridScrollArea>
                            </DataGridContainer>
                        </div>
                    )}

                    <ListPagination
                        page={page}
                        totalPages={pages}
                        totalItems={total}
                        itemNoun="users"
                        onPageChange={setPage}
                        disabled={list.isFetching}
                    />
                </div>
            </DataGrid>

            <UserSheet
                row={selected}
                open={sheetOpen && !!selected}
                onOpenChange={setSheetOpen}
                onExitComplete={() => setSelected(null)}
            />
        </Page>
    )
}
