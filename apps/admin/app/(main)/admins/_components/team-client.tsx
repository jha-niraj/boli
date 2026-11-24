"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Copy, MailPlus, Shield, ShieldCheck, Timer, Trash2, UserPlus, Users } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { ConfirmPopover } from "@repo/ui/components/ui/confirm-popover"
import { BoliEmpty } from "@/components/empty/boli-empty"
import { Page, type PageAction } from "@repo/ui/components/ui/page"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/ui/table"
import { toast } from "@repo/ui/components/ui/toast"
import { useUrlTab } from "@repo/ui/hooks/use-url-tab"
import { cn } from "@repo/ui/lib/utils"
import { getAdminUsers, getPendingInvitations, revokeInvitation } from "@/actions/admin.action"
import { useAdminAccess } from "@/context/admin-access-context"
import { formatAdminRole } from "@/lib/permissions"
import type { AdminInvitationRow, AdminUser } from "@/types/admin"
import { ADMIN_KEYS, formatDate, PersonAvatar, Pill, StatusDot } from "./admin-bits"
import { AdminSheet } from "./admin-sheet"
import { InviteSheet } from "./invite-sheet"
import { TeamSkeleton } from "./team-skeleton"

const TABS = ["team", "invitations"] as const
type Tab = (typeof TABS)[number]

async function fetchTeam(): Promise<AdminUser[]> {
    const r = await getAdminUsers()
    if (!r.success) throw new Error(r.error ?? "Could not load the team")
    return r.data ?? []
}

async function fetchInvitations(): Promise<AdminInvitationRow[]> {
    const r = await getPendingInvitations()
    if (!r.success) throw new Error(r.error ?? "Could not load invitations")
    return r.data ?? []
}

/**
 * The team: admins and pending invitations, as two tabs on the right of the header (`?tab=`). Simple shadcn tables -
 * the lists are short and need no sorting or column picking. A row opens the keep-open admin sheet.
 */
export function TeamClient({ initialTeam, initialInvitations, initialTab }: {
    initialTeam?: AdminUser[]
    initialInvitations?: AdminInvitationRow[]
    initialTab?: string | string[]
}) {
    const queryClient = useQueryClient()
    const { isSuperAdmin } = useAdminAccess()
    const [tab, setTab] = useUrlTab(TABS, initialTab, "team")
    const [inviteOpen, setInviteOpen] = React.useState(false)
    const [selectedId, setSelectedId] = React.useState<string | null>(null)
    const [sheetOpen, setSheetOpen] = React.useState(false)

    const team = useQuery({ queryKey: ADMIN_KEYS.team, queryFn: fetchTeam, initialData: initialTeam })
    const invites = useQuery({ queryKey: ADMIN_KEYS.invitations, queryFn: fetchInvitations, initialData: initialInvitations })

    const revoke = useMutation({
        mutationFn: async (id: string) => {
            const r = await revokeInvitation(id)
            if (!r.success) throw new Error(r.error ?? "Could not revoke the invitation")
        },
        onSuccess: async () => {
            toast.success("Invitation revoked")
            await queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.all })
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not revoke the invitation"),
    })

    if (team.isPending || invites.isPending) return <TeamSkeleton />

    const admins = team.data ?? []
    const pending = invites.data ?? []
    const selected = admins.find((a) => a.id === selectedId) ?? null
    const now = Date.now()
    const expiringSoon = pending.filter((p) => new Date(p.expiresAt).getTime() - now < 2 * 24 * 60 * 60 * 1000).length

    const actions: PageAction[] = isSuperAdmin
        ? [{ key: "invite", label: "Invite admin", icon: <UserPlus className="h-4 w-4" />, primary: true, onClick: () => setInviteOpen(true), keepSheetOpen: true }]
        : []

    const copy = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text)
            toast.success("Copied")
        } catch {
            toast.error("Could not copy - select the code and copy it yourself")
        }
    }

    return (
        <Page
            title="Admins"
            description="Who can use this console, and the invitations still waiting."
            icon={<Shield />}
            tabs={[
                { value: "team", label: `Team (${admins.length})`, icon: <Users /> },
                { value: "invitations", label: `Invitations (${pending.length})`, icon: <MailPlus /> },
            ]}
            tab={tab}
            onTabChange={(v) => setTab(v as Tab)}
            actions={actions}
        >
            <StatBand
                items={[
                    { icon: Users, label: "Admins", value: admins.length },
                    { icon: ShieldCheck, label: "Active", value: admins.filter((a) => a.status === "ACTIVE").length, hint: `of ${admins.length}` },
                    { icon: Shield, label: "Super admins", value: admins.filter((a) => a.adminRole === "SUPER_ADMIN").length },
                    { icon: Timer, label: "Pending invitations", value: pending.length, hint: expiringSoon ? `${expiringSoon} expire within 2 days` : undefined, tone: expiringSoon ? "amber" : undefined },
                ]}
            />

            {tab === "team" ? (
                admins.length === 0 ? (
                    <BoliEmpty kind="keys" framed title="No admins yet" description="Invite someone to help run the console." />
                ) : (
                    <ScrollArea orientation="both" className="rounded-xl ring-1 ring-neutral-200 dark:ring-neutral-800" viewportClassName="max-h-[40rem]">
                        <div className="min-w-[44rem]">
                            <Table scroller="parent">
                                <TableHeader sticky>
                                    <TableRow>
                                        <TableHead>Admin</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Last sign-in</TableHead>
                                        <TableHead pin="end" className="w-24 text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {admins.map((a) => (
                                        <TableRow
                                            key={a.id}
                                            data-sheet-keep-open=""
                                            data-state={sheetOpen && selectedId === a.id ? "selected" : undefined}
                                            onClick={() => { setSelectedId(a.id); setSheetOpen(true) }}
                                            className="cursor-pointer"
                                        >
                                            <TableCell>
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <PersonAvatar name={a.name} email={a.email} image={a.image} />
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">{a.name || "No name"}</p>
                                                        <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{a.email}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell><Pill>{formatAdminRole(a.adminRole)}</Pill></TableCell>
                                            <TableCell><StatusDot status={a.status} /></TableCell>
                                            <TableCell className="text-neutral-600 dark:text-neutral-400">{a.lastLoginAt ? formatDate(a.lastLoginAt, true) : "Never"}</TableCell>
                                            <TableCell pin="end" className="text-right">
                                                <Button size="sm" variant="outline" className="cursor-pointer rounded-xl" data-sheet-keep-open=""
                                                    onClick={(e) => { e.stopPropagation(); setSelectedId(a.id); setSheetOpen(true) }}>
                                                    Manage
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </ScrollArea>
                )
            ) : pending.length === 0 ? (
                <BoliEmpty kind="notifications" framed title="No pending invitations" description="Invitations you send show here until they are used." />
            ) : (
                <ScrollArea orientation="both" className="rounded-xl ring-1 ring-neutral-200 dark:ring-neutral-800" viewportClassName="max-h-[40rem]">
                    <div className="min-w-[44rem]">
                        <Table scroller="parent">
                            <TableHeader sticky>
                                <TableRow>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Expires</TableHead>
                                    <TableHead pin="end" className="w-28 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pending.map((inv) => {
                                    const soon = new Date(inv.expiresAt).getTime() - now < 2 * 24 * 60 * 60 * 1000
                                    return (
                                        <TableRow key={inv.id}>
                                            <TableCell>
                                                <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">{inv.email}</p>
                                                {inv.name ? <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{inv.name}</p> : null}
                                            </TableCell>
                                            <TableCell><Pill>{formatAdminRole(inv.adminRole)}</Pill></TableCell>
                                            <TableCell>
                                                <Button size="sm" variant="ghost" className="cursor-pointer gap-1.5 rounded-xl font-mono text-xs" onClick={() => copy(inv.code)} title="Copy the code">
                                                    {inv.code} <Copy className="h-3.5 w-3.5" />
                                                </Button>
                                            </TableCell>
                                            <TableCell className={cn("text-neutral-600 dark:text-neutral-400", soon && "text-amber-700 dark:text-amber-400")}>
                                                {formatDate(inv.expiresAt)}
                                            </TableCell>
                                            <TableCell pin="end" className="text-right">
                                                {isSuperAdmin ? (
                                                    <ConfirmPopover
                                                        title="Revoke this invitation?"
                                                        description={`The link sent to ${inv.email} stops working.`}
                                                        confirmLabel="Revoke"
                                                        onConfirm={() => revoke.mutateAsync(inv.id)}
                                                    >
                                                        <Button size="sm" variant="outline" className="cursor-pointer gap-1.5 rounded-xl">
                                                            <Trash2 className="h-3.5 w-3.5" /> Revoke
                                                        </Button>
                                                    </ConfirmPopover>
                                                ) : null}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </ScrollArea>
            )}

            <AdminSheet
                admin={selected}
                open={sheetOpen && !!selected}
                onOpenChange={setSheetOpen}
                onExitComplete={() => setSelectedId(null)}
            />
            <InviteSheet open={inviteOpen} onOpenChange={setInviteOpen} />
        </Page>
    )
}
