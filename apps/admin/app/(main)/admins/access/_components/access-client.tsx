"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Lock, ShieldCheck, ShieldOff, Users } from "lucide-react"
import { BoliEmpty } from "@/components/empty/boli-empty"
import { Page } from "@repo/ui/components/ui/page"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/ui/table"
import { cn } from "@repo/ui/lib/utils"
import { getAdminUsers } from "@/actions/admin.action"
import { ADMIN_MODULES, formatAdminRole } from "@/lib/permissions"
import type { AdminUser } from "@/types/admin"
import { ADMIN_KEYS, PersonAvatar, StatusDot } from "../../_components/admin-bits"
import { AdminSheet } from "../../_components/admin-sheet"
import { levelSummary } from "../../_components/permission-matrix"
import { AccessSkeleton } from "./access-skeleton"

async function fetchTeam(): Promise<AdminUser[]> {
    const r = await getAdminUsers()
    if (!r.success) throw new Error(r.error ?? "Could not load the team")
    return r.data ?? []
}

/**
 * The access matrix: admins down the side, areas across, the strongest level in each cell. Pressing a row opens the
 * same keep-open admin sheet the team list uses, where the checkboxes live - the matrix itself is for reading.
 */
export function AccessClient({ initialTeam }: { initialTeam?: AdminUser[] }) {
    const team = useQuery({ queryKey: ADMIN_KEYS.team, queryFn: fetchTeam, initialData: initialTeam })
    const [selectedId, setSelectedId] = React.useState<string | null>(null)
    const [open, setOpen] = React.useState(false)

    if (team.isPending) return <AccessSkeleton />

    const admins = team.data ?? []
    const selected = admins.find((a) => a.id === selectedId) ?? null
    const members = admins.filter((a) => a.adminRole !== "SUPER_ADMIN")
    const noAccess = members.filter((a) => ADMIN_MODULES.every((m) => (a.permissions[m.id] ?? []).length === 0)).length

    return (
        <Page
            title="Access"
            description="Every admin's access to each area, at a glance. Press a row to change it."
            icon={<Lock />}
        >
            <StatBand
                items={[
                    { icon: Users, label: "Admins", value: admins.length },
                    { icon: ShieldCheck, label: "Super admins", value: admins.length - members.length, hint: "every permission" },
                    { icon: ShieldOff, label: "With no access", value: noAccess, hint: noAccess ? "team members with nothing granted" : undefined, tone: noAccess ? "amber" : undefined },
                ]}
            />
            {admins.length === 0 ? (
                <BoliEmpty kind="keys" framed title="No admins yet" description="Invite admins from the Admins page." />
            ) : (
                <ScrollArea orientation="both" className="rounded-xl ring-1 ring-neutral-200 dark:ring-neutral-800" viewportClassName="max-h-[40rem]">
                    <div className="min-w-[56rem]">
                        <Table scroller="parent">
                            <TableHeader sticky>
                                <TableRow>
                                    <TableHead className="w-64">Admin</TableHead>
                                    <TableHead>Status</TableHead>
                                    {ADMIN_MODULES.map((m) => <TableHead key={m.id}>{m.label}</TableHead>)}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {admins.map((a) => {
                                    const isSuper = a.adminRole === "SUPER_ADMIN"
                                    return (
                                        <TableRow
                                            key={a.id}
                                            data-sheet-keep-open=""
                                            data-state={open && selectedId === a.id ? "selected" : undefined}
                                            onClick={() => { setSelectedId(a.id); setOpen(true) }}
                                            className="cursor-pointer"
                                        >
                                            <TableCell>
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <PersonAvatar name={a.name} email={a.email} image={a.image} />
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">{a.name || a.email}</p>
                                                        <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{formatAdminRole(a.adminRole)}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell><StatusDot status={a.status} /></TableCell>
                                            {ADMIN_MODULES.map((m) => {
                                                const word = isSuper ? "Full" : levelSummary(a.permissions[m.id])
                                                return (
                                                    <TableCell key={m.id} className={cn("text-sm", word === "-" ? "text-neutral-500 dark:text-neutral-500" : "text-neutral-800 dark:text-neutral-200")}>
                                                        {word}
                                                    </TableCell>
                                                )
                                            })}
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </ScrollArea>
            )}
            <AdminSheet admin={selected} open={open && !!selected} onOpenChange={setOpen} onExitComplete={() => setSelectedId(null)} />
        </Page>
    )
}
