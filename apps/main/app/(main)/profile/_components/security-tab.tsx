"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { PasswordChecklist, PasswordInput, passwordMeetsRules } from "@repo/auth/ui"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { Label } from "@repo/ui/components/ui/label"
import { Switch } from "@repo/ui/components/ui/switch"
import { toast } from "@repo/ui/components/ui/toast"
import { changePassword, setPassword } from "@/actions/profile.action"
import { Section } from "./section"

export function SecurityTabPanel({ hasPassword, providers }: { hasPassword: boolean; providers: string[] }) {
    return (
        <>
            {hasPassword ? <ChangePasswordSection /> : <SetPasswordSection />}
            <MethodsSection hasPassword={hasPassword} google={providers.includes("google")} />
        </>
    )
}

function ChangePasswordSection() {
    const [current, setCurrent] = React.useState("")
    const [next, setNext] = React.useState("")
    const [confirm, setConfirm] = React.useState("")
    const [signOutOthers, setSignOutOthers] = React.useState(true)
    const [busy, setBusy] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        if (next.length < 8) return setError("Use at least 8 characters for the new password.")
        if (next !== confirm) return setError("The two new passwords are not the same.")
        setBusy(true)
        const res = await changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: signOutOthers })
        setBusy(false)
        if (!res.success) return setError(res.error ?? "Could not change the password.")
        setCurrent("")
        setNext("")
        setConfirm("")
        toast.success(signOutOthers ? "Password changed - other devices signed out" : "Password changed")
    }

    return (
        <form onSubmit={onSubmit}>
            <Section
                title="Password"
                description="We email you whenever it changes."
                footer={
                    <Button type="submit" size="sm" disabled={busy || !current || !passwordMeetsRules(next)} className="gap-1.5">
                        {busy && <InlineLoader size={14} className="text-current" />}
                        Change password
                    </Button>
                }
            >
                <div className="space-y-4">
                    {error && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{error}</p>}
                    <div className="space-y-1.5">
                        <Label htmlFor="pw-current">Current password</Label>
                        <PasswordInput id="pw-current" value={current} onChange={setCurrent} />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="pw-new">New password</Label>
                        <PasswordInput id="pw-new" value={next} onChange={setNext} autoComplete="new-password" placeholder="At least 8 characters" />
                        <PasswordChecklist value={next} />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="pw-confirm">Confirm new password</Label>
                        <PasswordInput id="pw-confirm" value={confirm} onChange={setConfirm} autoComplete="new-password" />
                    </div>
                    <label htmlFor="pw-others" className="flex cursor-pointer items-center justify-between gap-3 text-sm text-neutral-800 dark:text-neutral-200">
                        Sign out my other devices
                        <Switch id="pw-others" checked={signOutOthers} onCheckedChange={setSignOutOthers} />
                    </label>
                </div>
            </Section>
        </form>
    )
}

function SetPasswordSection() {
    const router = useRouter()
    const [next, setNext] = React.useState("")
    const [confirm, setConfirm] = React.useState("")
    const [busy, setBusy] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        if (next.length < 8) return setError("Use at least 8 characters for the password.")
        if (next !== confirm) return setError("The two passwords are not the same.")
        setBusy(true)
        const res = await setPassword({ newPassword: next })
        setBusy(false)
        if (!res.success) return setError(res.error ?? "Could not set the password.")
        toast.success("Password set - you can now sign in with it")
        router.refresh()
    }

    return (
        <form onSubmit={onSubmit}>
            <Section
                title="Set a password"
                description="You sign in with Google or an email code. Add a password to sign in with your email too."
                footer={
                    <Button type="submit" size="sm" disabled={busy || !passwordMeetsRules(next)} className="gap-1.5">
                        {busy && <InlineLoader size={14} className="text-current" />}
                        Set password
                    </Button>
                }
            >
                <div className="space-y-4">
                    {error && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{error}</p>}
                    <div className="space-y-1.5">
                        <Label htmlFor="pw-set">Password</Label>
                        <PasswordInput id="pw-set" value={next} onChange={setNext} autoComplete="new-password" placeholder="At least 8 characters" />
                        <PasswordChecklist value={next} />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="pw-set-confirm">Confirm password</Label>
                        <PasswordInput id="pw-set-confirm" value={confirm} onChange={setConfirm} autoComplete="new-password" />
                    </div>
                </div>
            </Section>
        </form>
    )
}

function MethodsSection({ hasPassword, google }: { hasPassword: boolean; google: boolean }) {
    const rows = [
        { label: "Email and password", on: hasPassword },
        { label: "Google", on: google },
        { label: "Email code", on: true },
    ]
    return (
        <Section title="Ways to sign in" description="An email code always works for a confirmed email.">
            <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {rows.map((r) => (
                    <li key={r.label} className="flex items-center justify-between gap-3 py-2.5 text-sm first:pt-0 last:pb-0">
                        <span className="text-neutral-900 dark:text-white">{r.label}</span>
                        <span className="text-neutral-600 dark:text-neutral-400">{r.on ? "On" : "Not set up"}</span>
                    </li>
                ))}
            </ul>
        </Section>
    )
}
