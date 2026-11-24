"use client"

import { Repeat } from "lucide-react"
import { useSignOut } from "@repo/auth/client"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@/components/loaders/spinners"
import { ROUTES } from "@/lib/navigation"

/** St3's primary: sign out of this account and land on sign-in, to come back in as someone else. */
export function SwitchAccountButton() {
    const { signOut, pending } = useSignOut({ signInPath: ROUTES.signIn })
    return (
        <Button type="button" className="h-10 cursor-pointer gap-2 px-5" disabled={pending} onClick={() => void signOut()}>
            {pending ? <InlineLoader size={14} label="Signing out" /> : <Repeat className="h-4 w-4" />}
            Switch account
        </Button>
    )
}
