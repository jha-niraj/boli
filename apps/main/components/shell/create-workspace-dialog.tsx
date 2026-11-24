"use client"

import * as React from "react"
import { Button } from "@repo/ui/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/components/ui/dialog"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { InlineLoader } from "@repo/brand/loaders/spinners"
import { MAX_OWNED_WORKSPACES } from "@repo/boli/workspace-access"
import { createWorkspace, switchWorkspace } from "@/actions/workspace-switch.action"

/**
 * "Create workspace" from the rail's workspace switcher: a name and Create. The server makes the workspace (you own it,
 * full access, its own credit balance starting at 0 - no welcome credits for extra workspaces; at most
 * MAX_OWNED_WORKSPACES owned), then it becomes the current one and the open product's home reloads in full (the same
 * as a switch, so nothing cached for the old workspace survives). The form resets each time the dialog opens.
 */
export function CreateWorkspaceDialog({ open, onOpenChange, homeHref }: {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** Where to land after the switch (the open product's home, else the overview). */
    homeHref: string
}) {
    const [name, setName] = React.useState("")
    const [pending, setPending] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    React.useEffect(() => {
        if (!open) return
        setName("")
        setError(null)
    }, [open])

    async function submit(e: React.FormEvent) {
        e.preventDefault()
        if (!name.trim() || pending) return
        setPending(true)
        setError(null)
        const created = await createWorkspace(name)
        if (!created.success) {
            setPending(false)
            setError(created.error ?? "The workspace could not be created. Try again.")
            return
        }
        const switched = await switchWorkspace(created.data.id)
        if (!switched.success) {
            setPending(false)
            setError(`${created.data.name} was created, but switching to it failed. Pick it from the workspace menu.`)
            return
        }
        // Stays pending while the page reloads.
        window.location.assign(homeHref)
    }

    return (
        <Dialog open={open} onOpenChange={(next) => { if (!pending) onOpenChange(next) }}>
            <DialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl sm:max-w-md">
                <form onSubmit={submit} className="flex min-w-0 flex-col gap-4">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold">Create workspace</DialogTitle>
                        <DialogDescription className="text-xs">
                            A separate place for a team or a client, with its own credits, keys and chats. You can own up to {MAX_OWNED_WORKSPACES}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="workspace-name" className="text-sm">Name</Label>
                        <Input
                            id="workspace-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Himal Traders"
                            maxLength={60}
                            autoComplete="off"
                            className="h-9 text-sm"
                            autoFocus
                        />
                        {error ? <p className="text-xs text-rose-700 dark:text-rose-400">{error}</p> : null}
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">Starts with 0 credits. Add credits from Billing once you are in it.</p>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={!name.trim() || pending} className="gap-2">
                            {pending ? <InlineLoader size={14} label="Creating" /> : null}
                            Create
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
