"use client"

import * as React from "react"
import { Check, Repeat } from "lucide-react"
import { useSignOut } from "@repo/auth/client"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@repo/brand/loaders/spinners"
import { acceptInvitation } from "@/actions/workspace.action"
import { ROUTES } from "@/lib/navigation"

/** Accept, then a hard navigation to Home in the joined workspace (the action set the workspace cookie). */
export function AcceptInvitation({ token, workspaceName }: { token: string; workspaceName: string }) {
    const [pending, setPending] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    async function accept() {
        setPending(true)
        setError(null)
        const r = await acceptInvitation(token)
        if (!r.success) {
            setError(r.error ?? "The invitation could not be accepted. Try again.")
            setPending(false)
            return
        }
        window.location.assign(ROUTES.dashboard)
    }

    return (
        <div className="space-y-3">
            <Button type="button" className="h-10 cursor-pointer gap-2 px-5" disabled={pending} onClick={() => void accept()}>
                {pending ? <InlineLoader size={14} label="Joining" /> : <Check className="h-4 w-4" />}
                Join {workspaceName}
            </Button>
            {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
        </div>
    )
}

/** Signed in as another address: sign out and come back here through sign-in (returnTo keeps the invitation). */
export function SwitchToInvitedAccount({ signInPath }: { signInPath: string }) {
    const { signOut, pending } = useSignOut({ signInPath })
    return (
        <Button type="button" variant="outline" className="h-10 cursor-pointer gap-2 px-5" disabled={pending} onClick={() => void signOut()}>
            {pending ? <InlineLoader size={14} label="Signing out" /> : <Repeat className="h-4 w-4" />}
            Switch account
        </Button>
    )
}
