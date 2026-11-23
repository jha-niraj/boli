"use client"

import * as React from "react"
import { authClient } from "@repo/auth/client"
import { clientErrorMessage } from "@repo/auth/errors"
import { AuthTitle, Field, Footnote, Notice, PrimaryButton, SecondaryButton, StatusMark, TextLink, authInputCls } from "@repo/auth/ui"
import { Input } from "@repo/ui/components/ui/input"
import { AUTH_ROUTES } from "@/lib/auth-routes"

/** Asks for a reset link. The answer never says whether the address has an account (no account enumeration). */
export function ForgotForm({ initialEmail }: { initialEmail: string }) {
    const [email, setEmail] = React.useState(initialEmail)
    const [sentTo, setSentTo] = React.useState<string | null>(null)
    const [busy, setBusy] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    async function onSubmit(e?: React.FormEvent) {
        e?.preventDefault()
        setError(null)
        const to = (sentTo ?? email).trim()
        setBusy(true)
        const { error: err } = await authClient.requestPasswordReset({ email: to, redirectTo: AUTH_ROUTES.resetPassword })
        setBusy(false)
        if (err) {
            setError(clientErrorMessage(err))
            return
        }
        setSentTo(to)
    }

    if (sentTo) {
        return (
            <div>
                <StatusMark kind="mail" />
                <AuthTitle
                    title="Check your inbox"
                    sub={<>If an account exists for <span className="font-medium text-neutral-900 dark:text-white">{sentTo}</span>, a link to choose a new password is on its way. It works for one hour.</>}
                />
                {error && <Notice tone="error">{error}</Notice>}
                <SecondaryButton onClick={() => onSubmit()} loading={busy}>Send the link again</SecondaryButton>
                <Footnote>
                    <p className="text-center">Remembered it? <TextLink href={AUTH_ROUTES.signIn}>Back to log in</TextLink></p>
                </Footnote>
            </div>
        )
    }

    return (
        <div>
            <AuthTitle title="Reset your password" sub="Enter your email and we will send you a link to choose a new one." />
            {error && <Notice tone="error">{error}</Notice>}
            <form onSubmit={onSubmit} className="space-y-4">
                <Field label="Email" htmlFor="email">
                    <Input id="email" type="email" autoComplete="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} className={authInputCls} placeholder="you@example.com" />
                </Field>
                <PrimaryButton loading={busy}>Send reset link</PrimaryButton>
            </form>
            <Footnote>
                <p className="text-center">Remembered it? <TextLink href={AUTH_ROUTES.signIn}>Back to log in</TextLink></p>
            </Footnote>
        </div>
    )
}
