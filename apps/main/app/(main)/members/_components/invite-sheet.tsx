"use client"

import * as React from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@repo/brand/loaders/spinners"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@repo/ui/components/ui/sheet"
import { toast } from "@repo/ui/components/ui/toast"
import { DEFAULT_INVITE_ACCESS, WORKSPACE_INVITE_DAYS, type WorkspaceAccess } from "@repo/boli/workspace-access"
import { inviteMember } from "@/actions/workspace.action"
import type { InviteResult } from "@/types/workspace"
import { AccessEditor } from "./access-editor"
import { MEMBERS_KEY } from "./member-bits"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Invite someone by email with their product access. The form wraps the scroller AND the footer, so Send never scrolls
 * away. Values reset in `onExitComplete`, after the slide-out. `onSent` gets the result (the link to share by hand when
 * the email could not be sent).
 */
export function InviteSheet({ workspaceName, open, onOpenChange, onSent }: {
    workspaceName: string
    open: boolean
    onOpenChange: (open: boolean) => void
    onSent: (result: InviteResult) => void
}) {
    const queryClient = useQueryClient()
    const [email, setEmail] = React.useState("")
    const [access, setAccess] = React.useState<WorkspaceAccess>(DEFAULT_INVITE_ACCESS)

    const reset = () => { setEmail(""); setAccess(DEFAULT_INVITE_ACCESS) }

    const invite = useMutation({
        mutationFn: async () => {
            const r = await inviteMember({ email: email.trim().toLowerCase(), access })
            if (!r.success) throw new Error(r.error ?? "The invitation could not be sent.")
            return r.data
        },
        onSuccess: async (result) => {
            if (result.emailed) toast.success("Invitation sent", { description: `${result.invitation.email} gets a link to join.` })
            else toast.success("Invitation saved", { description: "The email could not be sent. Copy the link and share it yourself." })
            onSent(result)
            onOpenChange(false)
            await queryClient.invalidateQueries({ queryKey: MEMBERS_KEY })
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "The invitation could not be sent."),
    })

    const valid = EMAIL_RE.test(email.trim())

    return (
        <Sheet open={open} onOpenChange={onOpenChange} onExitComplete={reset}>
            <SheetContent side="right" className="flex w-full flex-col gap-4">
                <SheetHeader>
                    <SheetTitle>Invite to {workspaceName}</SheetTitle>
                    <SheetDescription>They get an email with a link to join. It works for {WORKSPACE_INVITE_DAYS} days.</SheetDescription>
                </SheetHeader>
                <form
                    className="flex min-h-0 flex-1 flex-col gap-4"
                    onSubmit={(e) => { e.preventDefault(); if (valid && !invite.isPending) invite.mutate() }}
                >
                    <ScrollArea orientation="vertical" className="-mx-6 min-h-0 flex-1">
                        <div className="flex flex-col gap-4 px-6 pb-2">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="invite-email">Email</Label>
                                <Input id="invite-email" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" className="h-9 text-sm" required />
                                <p className="text-xs text-neutral-600 dark:text-neutral-400">They sign in or create an account with this address to accept.</p>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Product access</h3>
                                <p className="text-xs text-neutral-600 dark:text-neutral-400">What they can open once they join. Everyone spends the workspace&apos;s credits. You can change it later.</p>
                                <AccessEditor idPrefix="invite" value={access} onChange={setAccess} />
                            </div>
                        </div>
                    </ScrollArea>
                    <SheetFooter>
                        <Button type="button" variant="outline" className="cursor-pointer" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={!valid || invite.isPending} className="cursor-pointer gap-2">
                            {invite.isPending ? <InlineLoader size={14} label="Sending" /> : null}
                            Send invitation
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    )
}
