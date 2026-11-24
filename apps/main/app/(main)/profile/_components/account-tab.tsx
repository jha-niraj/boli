"use client"

import * as React from "react"
import { LogOut } from "lucide-react"
import { useSignOut } from "@repo/auth/client"
import { Button } from "@repo/ui/components/ui/button"
import { ConfirmPopover } from "@repo/ui/components/ui/confirm-popover"
import { InlineLoader } from "@/components/loaders/spinners"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { toast } from "@repo/ui/components/ui/toast"
import { deleteAccount } from "@/actions/profile.action"
import { Section } from "./section"

export function AccountTabPanel({ email, createdAt }: { email: string; createdAt: string }) {
    const { signOut, pending } = useSignOut({ signInPath: "/signin" })
    const leaving = useSignOut({ signInPath: "/signin?deleted=1" })
    const [typed, setTyped] = React.useState("")
    const matches = typed.trim().toLowerCase() === email.toLowerCase()

    async function onDelete() {
        const res = await deleteAccount(typed)
        if (!res.success) {
            toast.error(res.error ?? "Could not delete the account.")
            throw new Error("delete failed")
        }
        // The session row is gone with the account; this clears the cookies and leaves.
        await leaving.signOut()
    }

    const since = new Date(createdAt).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })

    return (
        <>
            <Section
                title="Sign out"
                description={`Signed in as ${email}. Member since ${since}.`}
                action={
                    <Button type="button" variant="outline" size="sm" className="gap-2" disabled={pending} onClick={() => void signOut()}>
                        {pending ? <InlineLoader size={14} /> : <LogOut className="size-4" />}
                        Sign out of this device
                    </Button>
                }
            />

            <Section title="Delete account" description="Your account and everything in it are deleted for good. This cannot be undone.">
                <div className="space-y-3">
                    <div className="space-y-1.5">
                        <Label htmlFor="delete-confirm">Type your email to confirm</Label>
                        <Input id="delete-confirm" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={email} autoComplete="off" />
                    </div>
                    <ConfirmPopover
                        title="Delete your account for good?"
                        description="Everything you made here is removed. There is no undo."
                        confirmLabel="Delete account"
                        onConfirm={onDelete}
                        disabled={!matches || leaving.pending}
                    >
                        <Button type="button" variant="destructive" size="sm" disabled={!matches || leaving.pending}>Delete my account</Button>
                    </ConfirmPopover>
                </div>
            </Section>
        </>
    )
}
