"use client"

import * as React from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@repo/ui/components/ui/button"
import { ConfirmPopover } from "@repo/ui/components/ui/confirm-popover"
import { InlineLoader } from "@repo/brand/loaders/spinners"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@repo/ui/components/ui/sheet"
import { toast } from "@repo/ui/components/ui/toast"
import { formatWorkspaceRole, NO_ACCESS, type WorkspaceAccess } from "@repo/boli/workspace-access"
import { removeMember, updateMemberAccess } from "@/actions/workspace.action"
import { formatDay } from "@/lib/platform-display"
import type { MemberRow } from "@/types/workspace"
import { AccessEditor } from "./access-editor"
import { MEMBERS_KEY, PersonAvatar, RolePill } from "./member-bits"

/**
 * One member in the keep-open right sheet (non-modal). Rows that open it carry `data-sheet-keep-open`, so pressing
 * another row SWAPS the sheet to that member. The draft resets when the member changes; the parent clears its
 * selection in `onExitComplete`. Only the owner edits, and never the owner row (an owner has everything).
 */
export function MemberSheet({ member, canManage, open, onOpenChange, onExitComplete }: {
    member: MemberRow | null
    canManage: boolean
    open: boolean
    onOpenChange: (open: boolean) => void
    onExitComplete?: () => void
}) {
    const queryClient = useQueryClient()
    const [access, setAccess] = React.useState<WorkspaceAccess>(NO_ACCESS)

    const memberId = member?.id
    React.useEffect(() => {
        if (member) setAccess(member.access)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [memberId])

    const save = useMutation({
        mutationFn: async () => {
            if (!member) return
            const r = await updateMemberAccess({ memberId: member.id, access })
            if (!r.success) throw new Error(r.error ?? "The access could not be saved.")
        },
        onSuccess: async () => {
            toast.success("Saved")
            await queryClient.invalidateQueries({ queryKey: MEMBERS_KEY })
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "The access could not be saved."),
    })

    const remove = useMutation({
        mutationFn: async () => {
            if (!member) return
            const r = await removeMember(member.id)
            if (!r.success) throw new Error(r.error ?? "The member could not be removed.")
        },
        onSuccess: async () => {
            toast.success("Member removed")
            onOpenChange(false)
            await queryClient.invalidateQueries({ queryKey: MEMBERS_KEY })
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "The member could not be removed."),
    })

    const isOwnerRow = member?.role === "owner"
    const editable = canManage && !!member && !isOwnerRow
    const dirty = !!member && JSON.stringify(access) !== JSON.stringify(member.access)

    return (
        <Sheet open={open} onOpenChange={onOpenChange} onExitComplete={onExitComplete}>
            <SheetContent side="right" className="flex w-full flex-col gap-4">
                <SheetHeader>
                    <SheetTitle className="truncate">{member?.name || member?.email || "Member"}</SheetTitle>
                    <SheetDescription className="truncate">{member?.email}</SheetDescription>
                </SheetHeader>
                {member ? (
                    <ScrollArea orientation="vertical" className="-mx-6 min-h-0 flex-1">
                        <div className="flex flex-col gap-4 px-6 pb-2">
                            <div className="flex min-w-0 items-center gap-3">
                                <PersonAvatar name={member.name} email={member.email} image={member.image} className="h-10 w-10" />
                                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                    <RolePill role={member.role} />
                                    <span className="text-xs text-neutral-600 dark:text-neutral-400">Joined {formatDay(member.joinedAt)}</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Product access</h3>
                                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                                    {isOwnerRow
                                        ? `${formatWorkspaceRole("owner")}: every product, plus billing, members and deleting.`
                                        : editable ? "What this person can open in the workspace. Credits are shared." : "Only the owner can change access."}
                                </p>
                                <AccessEditor idPrefix={`member-${member.id}`} value={access} onChange={editable ? setAccess : undefined} />
                            </div>
                        </div>
                    </ScrollArea>
                ) : null}
                {editable && member ? (
                    <SheetFooter>
                        <ConfirmPopover
                            title={`Remove ${member.name || member.email}?`}
                            description="They lose access to this workspace at once. Keys they created keep working until you revoke them."
                            confirmLabel="Remove"
                            destructive
                            onConfirm={() => remove.mutateAsync()}
                            disabled={remove.isPending}
                            side="top"
                        >
                            <Button type="button" variant="outline" className="mr-auto cursor-pointer" disabled={remove.isPending}>
                                {remove.isPending ? <InlineLoader size={14} label="Removing" /> : null}
                                Remove
                            </Button>
                        </ConfirmPopover>
                        <Button type="button" disabled={!dirty || save.isPending} onClick={() => save.mutate()} className="cursor-pointer gap-2">
                            {save.isPending ? <InlineLoader size={14} label="Saving" /> : null}
                            Save changes
                        </Button>
                    </SheetFooter>
                ) : null}
            </SheetContent>
        </Sheet>
    )
}
