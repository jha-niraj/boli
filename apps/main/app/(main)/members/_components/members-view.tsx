"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Copy, RotateCw, UserPlus, X } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { ConfirmPopover } from "@repo/ui/components/ui/confirm-popover"
import { InlineLoader } from "@repo/brand/loaders/spinners"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { Page, type PageAction } from "@repo/ui/components/ui/page"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { toast } from "@repo/ui/components/ui/toast"
import { cn } from "@repo/ui/lib/utils"
import { accessSummary } from "@repo/boli/workspace-access"
import { leaveWorkspace, listMembers, renameWorkspace, resendInvitation, revokeInvitation } from "@/actions/workspace.action"
import { formatDay } from "@/lib/platform-display"
import type { InviteResult, MembersData } from "@/types/workspace"
import { InviteSheet } from "./invite-sheet"
import { MemberSheet } from "./member-sheet"
import { MEMBERS_DESCRIPTION, MEMBERS_TITLE } from "./members-skeleton"
import { MEMBERS_KEY, PersonAvatar, RolePill } from "./member-bits"

const CARD = "min-w-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"

/**
 * /members: the current workspace's name, its members (divider rows; a row opens the keep-open member sheet, and
 * pressing another row swaps it) and its pending invitations (resend / revoke inline - one-line items). The owner
 * invites from the header; a member sees the list read-only and can leave.
 */
export function MembersView({ initialData }: { initialData: MembersData }) {
    const queryClient = useQueryClient()
    const router = useRouter()
    const [inviteOpen, setInviteOpen] = React.useState(false)
    const [selectedId, setSelectedId] = React.useState<string | null>(null)
    const [sheetOpen, setSheetOpen] = React.useState(false)
    const [shareLink, setShareLink] = React.useState<{ email: string; url: string } | null>(null)

    const { data } = useQuery({
        queryKey: MEMBERS_KEY,
        queryFn: async () => {
            const r = await listMembers()
            if (!r.success) throw new Error(r.error ?? "The members could not be loaded.")
            return r.data
        },
        initialData,
    })

    const [name, setName] = React.useState(data.workspace.name)
    React.useEffect(() => { setName(data.workspace.name) }, [data.workspace.name])

    const isOwner = data.viewerRole === "owner"
    const selected = data.members.find((m) => m.id === selectedId) ?? null

    const afterInvite = (result: InviteResult) => {
        if (!result.emailed) setShareLink({ email: result.invitation.email, url: result.joinUrl })
    }

    const rename = useMutation({
        mutationFn: async () => {
            const r = await renameWorkspace({ name })
            if (!r.success) throw new Error(r.error ?? "The name could not be saved.")
        },
        onSuccess: async () => {
            toast.success("Saved")
            await queryClient.invalidateQueries({ queryKey: MEMBERS_KEY })
            router.refresh()
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "The name could not be saved."),
    })

    const resend = useMutation({
        mutationFn: async (id: string) => {
            const r = await resendInvitation(id)
            if (!r.success) throw new Error(r.error ?? "The invitation could not be sent again.")
            return r.data
        },
        onSuccess: async (result) => {
            if (result.emailed) toast.success("Invitation sent again", { description: "The earlier link no longer works." })
            else toast.success("New link made", { description: "The email could not be sent. Copy the link and share it yourself." })
            afterInvite(result)
            await queryClient.invalidateQueries({ queryKey: MEMBERS_KEY })
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "The invitation could not be sent again."),
    })

    const revoke = useMutation({
        mutationFn: async (id: string) => {
            const r = await revokeInvitation(id)
            if (!r.success) throw new Error(r.error ?? "The invitation could not be cancelled.")
        },
        onSuccess: async () => {
            toast.success("Invitation cancelled")
            await queryClient.invalidateQueries({ queryKey: MEMBERS_KEY })
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "The invitation could not be cancelled."),
    })

    const leave = useMutation({
        mutationFn: async () => {
            const r = await leaveWorkspace(data.workspace.id)
            if (!r.success) throw new Error(r.error ?? "You could not leave the workspace.")
        },
        onSuccess: async () => {
            toast.success(`You left ${data.workspace.name}`)
            await queryClient.invalidateQueries({ queryKey: MEMBERS_KEY })
            router.refresh()
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "You could not leave the workspace."),
    })

    async function copy(text: string) {
        try {
            await navigator.clipboard.writeText(text)
            toast.success("Link copied")
        } catch {
            toast.error("Copying is blocked in this browser. Select the link and copy it.")
        }
    }

    const openMember = (id: string) => { setSelectedId(id); setSheetOpen(true) }

    const actions: PageAction[] = isOwner
        ? [{ key: "invite", label: "Invite member", icon: <UserPlus className="h-3.5 w-3.5" />, primary: true, keepSheetOpen: true, onClick: () => setInviteOpen(true) }]
        : []

    const nameDirty = name.trim() !== data.workspace.name && name.trim().length > 0

    return (
        <Page title={MEMBERS_TITLE} description={MEMBERS_DESCRIPTION} width="reading" actions={actions}>
            <div className="flex min-w-0 flex-col gap-4 pb-6">
                {/* The workspace itself: one field, edited inline by the owner. */}
                <section className={cn(CARD, "px-4 py-3")}>
                    {isOwner ? (
                        <form
                            className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end"
                            onSubmit={(e) => { e.preventDefault(); if (nameDirty && !rename.isPending) rename.mutate() }}
                        >
                            <div className="flex min-w-0 flex-1 flex-col gap-1">
                                <Label htmlFor="workspace-name" className="text-xs font-normal text-neutral-600 dark:text-neutral-400">Workspace name</Label>
                                <Input id="workspace-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} className="h-9 text-sm" />
                            </div>
                            <Button type="submit" size="sm" disabled={!nameDirty || rename.isPending} className="shrink-0 cursor-pointer gap-2">
                                {rename.isPending ? <InlineLoader size={14} label="Saving" /> : null}
                                Save name
                            </Button>
                        </form>
                    ) : (
                        <div className="flex min-w-0 items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-xs text-neutral-600 dark:text-neutral-400">Workspace</p>
                                <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">{data.workspace.name}</p>
                            </div>
                            <ConfirmPopover
                                title={`Leave ${data.workspace.name}?`}
                                description="You lose access to its products and credits. The owner can invite you again."
                                confirmLabel="Leave"
                                destructive
                                onConfirm={() => leave.mutateAsync()}
                                disabled={leave.isPending}
                                align="end"
                            >
                                <Button type="button" size="sm" variant="outline" className="shrink-0 cursor-pointer gap-2" disabled={leave.isPending}>
                                    {leave.isPending ? <InlineLoader size={14} label="Leaving" /> : null}
                                    Leave workspace
                                </Button>
                            </ConfirmPopover>
                        </div>
                    )}
                </section>

                {shareLink ? (
                    <section className="flex min-w-0 flex-col gap-2 rounded-2xl border border-neutral-200 bg-boli-sky-wash px-4 py-3 dark:border-neutral-800">
                        <div className="flex min-w-0 items-start justify-between gap-3">
                            <p className="min-w-0 text-sm text-neutral-800 dark:text-neutral-200">
                                Share this link with <span className="font-medium">{shareLink.email}</span>. It is shown once and works for 7 days.
                            </p>
                            <Button type="button" variant="ghost" size="icon" aria-label="Hide the link" className="-mr-2 -mt-1 shrink-0 cursor-pointer" onClick={() => setShareLink(null)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex min-w-0 items-center gap-2">
                            <code className="min-w-0 flex-1 truncate rounded-lg bg-white px-2 py-1.5 font-mono text-xs text-neutral-800 dark:bg-neutral-900 dark:text-neutral-200">{shareLink.url}</code>
                            <Button type="button" size="sm" variant="outline" className="shrink-0 cursor-pointer gap-1.5" onClick={() => void copy(shareLink.url)}>
                                <Copy className="h-3.5 w-3.5" /> Copy
                            </Button>
                        </div>
                    </section>
                ) : null}

                <section className="flex min-w-0 flex-col gap-2">
                    <h2 className="text-base font-semibold text-neutral-900 dark:text-white">People ({data.members.length})</h2>
                    <div className={CARD}>
                        <ScrollArea orientation="vertical" className="min-w-0" viewportClassName="max-h-[44rem]">
                            <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                                {data.members.map((m) => (
                                    <div
                                        key={m.id}
                                        role="button"
                                        tabIndex={0}
                                        data-sheet-keep-open=""
                                        data-state={sheetOpen && selectedId === m.id ? "selected" : undefined}
                                        onClick={() => openMember(m.id)}
                                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openMember(m.id) } }}
                                        className="flex h-16 min-w-0 cursor-pointer items-center gap-3 px-4 outline-none transition-colors hover:bg-neutral-50 focus-visible:bg-neutral-50 data-[state=selected]:bg-boli-sky-wash dark:hover:bg-neutral-800/50 dark:focus-visible:bg-neutral-800/50"
                                    >
                                        <PersonAvatar name={m.name} email={m.email} image={m.image} />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">
                                                {m.name || m.email}
                                                {m.isYou ? <span className="ml-1.5 text-xs font-normal text-neutral-600 dark:text-neutral-400">(you)</span> : null}
                                            </p>
                                            <p className="truncate text-xs text-neutral-600 dark:text-neutral-400">{m.email}</p>
                                        </div>
                                        <p className="hidden min-w-0 max-w-[14rem] truncate text-xs text-neutral-600 sm:block dark:text-neutral-400">
                                            {accessSummary({ role: m.role, access: m.access })}
                                        </p>
                                        <RolePill role={m.role} />
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </section>

                {data.invitations.length > 0 ? (
                    <section className="flex min-w-0 flex-col gap-2">
                        <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Waiting to join ({data.invitations.length})</h2>
                        <div className={CARD}>
                            <ScrollArea orientation="vertical" className="min-w-0" viewportClassName="max-h-[28rem]">
                                <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                                    {data.invitations.map((inv) => (
                                        <div key={inv.id} className="flex min-h-16 min-w-0 flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-3">
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">{inv.email}</p>
                                                <p className="truncate text-xs text-neutral-600 dark:text-neutral-400">
                                                    {accessSummary({ role: "member", access: inv.access })}
                                                    {" - "}
                                                    {inv.expired ? "Link expired" : `Link works until ${formatDay(inv.expiresAt)}`}
                                                </p>
                                            </div>
                                            {isOwner ? (
                                                <div className="flex shrink-0 items-center gap-1.5">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        className="cursor-pointer gap-1.5"
                                                        disabled={resend.isPending && resend.variables === inv.id}
                                                        onClick={() => resend.mutate(inv.id)}
                                                    >
                                                        {resend.isPending && resend.variables === inv.id ? <InlineLoader size={14} label="Sending" /> : <RotateCw className="h-3.5 w-3.5" />}
                                                        Resend
                                                    </Button>
                                                    <ConfirmPopover
                                                        title="Cancel this invitation?"
                                                        description={`The link sent to ${inv.email} stops working.`}
                                                        confirmLabel="Cancel invitation"
                                                        cancelLabel="Keep"
                                                        destructive
                                                        onConfirm={() => revoke.mutateAsync(inv.id)}
                                                        align="end"
                                                    >
                                                        <Button type="button" size="sm" variant="ghost" className="cursor-pointer" disabled={revoke.isPending && revoke.variables === inv.id}>
                                                            Cancel
                                                        </Button>
                                                    </ConfirmPopover>
                                                </div>
                                            ) : (
                                                <span className="shrink-0 text-xs text-neutral-600 dark:text-neutral-400">Invited {formatDay(inv.lastSentAt)}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    </section>
                ) : null}

                {isOwner && data.members.length === 1 && data.invitations.length === 0 ? (
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">
                        Only you so far. Invite people to share this workspace&apos;s credits, keys and products, each with their own access.
                    </p>
                ) : null}
            </div>

            <MemberSheet
                member={selected}
                canManage={isOwner}
                open={sheetOpen && !!selected}
                onOpenChange={setSheetOpen}
                onExitComplete={() => setSelectedId(null)}
            />
            <InviteSheet workspaceName={data.workspace.name} open={inviteOpen} onOpenChange={setInviteOpen} onSent={afterInvite} />
        </Page>
    )
}
