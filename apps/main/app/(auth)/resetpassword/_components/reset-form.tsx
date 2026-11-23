"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@repo/auth/client"
import { clientErrorMessage } from "@repo/auth/errors"
import {
    AuthTitle, Field, Footnote, Notice, PasswordChecklist, PasswordInput, PrimaryButton, StatusMark, TextLink, passwordMeetsRules,
} from "@repo/auth/ui"
import { AUTH_ROUTES } from "@/lib/auth-routes"

export function ResetForm({ token }: { token: string | null }) {
    const router = useRouter()
    const [password, setPassword] = React.useState("")
    const [confirm, setConfirm] = React.useState("")
    const [busy, setBusy] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    if (!token) {
        return (
            <div>
                <StatusMark kind="error" />
                <AuthTitle title="That link did not work" sub="Reset links work once and for one hour. Ask for a new one." />
                <PrimaryButton type="button" onClick={() => router.push(AUTH_ROUTES.forgotPassword)}>Get a new link</PrimaryButton>
                <Footnote>
                    <p className="text-center"><TextLink href={AUTH_ROUTES.signIn}>Back to log in</TextLink></p>
                </Footnote>
            </div>
        )
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        if (!passwordMeetsRules(password)) return setError("The password needs 8 characters, a number, and upper and lower case letters.")
        if (password !== confirm) return setError("The two passwords are not the same.")
        setBusy(true)
        const { error: err } = await authClient.resetPassword({ newPassword: password, token: token ?? "" })
        if (err) {
            setBusy(false)
            setError(clientErrorMessage(err))
            return
        }
        // Every session was signed out by the reset; sign in with the new password.
        router.push(`${AUTH_ROUTES.signIn}?reset=1`)
    }

    return (
        <div>
            <StatusMark kind="key" />
            <AuthTitle title="Choose a new password" sub="You will be signed out everywhere else." />
            {error && <Notice tone="error">{error}</Notice>}
            <form onSubmit={onSubmit} className="space-y-4">
                <Field label="New password" htmlFor="password">
                    <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="new-password" placeholder="Choose a password" autoFocus />
                    <PasswordChecklist value={password} />
                </Field>
                <Field label="Confirm new password" htmlFor="confirm">
                    <PasswordInput id="confirm" value={confirm} onChange={setConfirm} autoComplete="new-password" />
                </Field>
                <PrimaryButton loading={busy} disabled={!passwordMeetsRules(password) || confirm.length === 0}>Save new password</PrimaryButton>
            </form>
        </div>
    )
}
