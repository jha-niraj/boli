"use client"

import * as React from "react"
import { MoveRight } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Label } from "@repo/ui/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/ui/select"
import { InlineLoader } from "@repo/brand/loaders/spinners"
import { claimJawafBot, markClaimOpened } from "@/actions/jawaf/claim.action"
import { ROUTES } from "@/lib/navigation"

/** Stamps "Link opened" once, after the page loaded (a POST - the render itself never writes). */
export function MarkOpened({ token }: { token: string }) {
    const sent = React.useRef(false)
    React.useEffect(() => {
        if (sent.current) return
        sent.current = true
        void markClaimOpened(token).catch(() => undefined)
    }, [token])
    return null
}

/** Pick one of the person's own workspaces (when they own several), then move the bot; a hard navigation to Jawaf. */
export function ClaimForm({ token, botName, workspaces, email }: {
    token: string
    botName: string
    workspaces: { id: string; name: string; isPersonal: boolean }[]
    email: string
}) {
    const [workspaceId, setWorkspaceId] = React.useState(() => (workspaces.find((w) => w.isPersonal) ?? workspaces[0])?.id ?? "")
    const [pending, setPending] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    async function claim() {
        if (!workspaceId) return
        setPending(true)
        setError(null)
        const r = await claimJawafBot({ token, workspaceId })
        if (!r.success) {
            setError(r.error ?? "The bot could not be moved. Try again.")
            setPending(false)
            return
        }
        window.location.assign(ROUTES.jawaf)
    }

    if (!workspaces.length) {
        return <p className="text-sm text-neutral-600">You are signed in as {email}, but you do not own a workspace yet. Open Boli once, then come back to this link.</p>
    }

    return (
        <div className="space-y-4">
            <p className="text-sm text-neutral-600">Signed in as <span className="font-medium text-neutral-900">{email}</span>.</p>
            {workspaces.length > 1 ? (
                <div className="space-y-1.5">
                    <Label htmlFor="claim-workspace">Move it to</Label>
                    <Select value={workspaceId} onValueChange={setWorkspaceId}>
                        <SelectTrigger id="claim-workspace" className="h-10 w-full cursor-pointer"><SelectValue placeholder="Choose a workspace" /></SelectTrigger>
                        <SelectContent emptyMessage="You do not own a workspace">
                            {workspaces.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            ) : null}
            <Button type="button" className="h-10 cursor-pointer gap-2 px-5" disabled={pending || !workspaceId} onClick={() => void claim()}>
                {pending ? <InlineLoader size={14} label="Moving" /> : <MoveRight className="h-4 w-4" />}
                Move {botName} to my workspace
            </Button>
            {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
        </div>
    )
}
