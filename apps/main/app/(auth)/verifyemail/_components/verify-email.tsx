"use client"

import * as React from "react"
import { authClient } from "@repo/auth/client"
import { clientErrorMessage } from "@repo/auth/errors"
import { AuthTitle, Field, Footnote, Notice, PrimaryButton, SecondaryButton, StatusMark, TextLink, authInputCls } from "@repo/auth/ui"
import { Input } from "@repo/ui/components/ui/input"
import { AUTH_ROUTES, VERIFIED_CALLBACK } from "@/lib/auth-routes"

const RESEND_SECONDS = 30

export function VerifyEmail({ state, error, email: initialEmail, resent, signedIn }: {
    state: "sent" | "done" | "failed"
    error: string | null
    email: string
    resent: boolean
    signedIn: boolean
}) {
    const [email, setEmail] = React.useState(initialEmail)
    const [busy, setBusy] = React.useState(false)
    const [message, setMessage] = React.useState<{ tone: "neutral" | "error"; text: string } | null>(
        resent ? { tone: "neutral", text: "Confirm your email first - we just sent you a new link." } : null,
    )
    const [cooldown, setCooldown] = React.useState(resent ? RESEND_SECONDS : 0)

    React.useEffect(() => {
        if (cooldown <= 0) return
        const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000)
        return () => window.clearTimeout(t)
    }, [cooldown])

    async function resend(e?: React.FormEvent) {
        e?.preventDefault()
        const to = email.trim()
        if (!to) {
            setMessage({ tone: "error", text: "Enter the email you signed up with." })
            return
        }
        setBusy(true)
        const { error: err } = await authClient.sendVerificationEmail({ email: to, callbackURL: VERIFIED_CALLBACK })
        setBusy(false)
        if (err) {
            setMessage({ tone: "error", text: clientErrorMessage(err) })
            return
        }
        setMessage({ tone: "neutral", text: `A new link is on its way to ${to}.` })
        setCooldown(RESEND_SECONDS)
    }

    if (state === "done") {
        return (
            <div>
                <StatusMark kind="done" />
                <AuthTitle title="Email confirmed" sub={signedIn ? "You are signed in and ready to go." : "Log in to carry on."} />
                {signedIn ? (
                    <PrimaryButton type="button" onClick={() => window.location.assign(AUTH_ROUTES.home)}>Continue</PrimaryButton>
                ) : (
                    <PrimaryButton type="button" onClick={() => window.location.assign(AUTH_ROUTES.signIn)}>Log in</PrimaryButton>
                )}
            </div>
        )
    }

    const codeHref = `${AUTH_ROUTES.signIn}?method=code${email ? `&email=${encodeURIComponent(email.trim())}` : ""}`

    return (
        <div>
            <StatusMark kind={state === "failed" ? "error" : "mail"} />
            <AuthTitle
                title={state === "failed" ? "That link did not work" : "Check your inbox"}
                sub={
                    state === "failed"
                        ? "Links work once and for 24 hours. Send yourself a new one."
                        : initialEmail
                            ? <>We sent a confirmation link to <span className="font-medium text-neutral-900 dark:text-white">{initialEmail}</span>. Open it on this device.</>
                            : "We sent you a confirmation link. Open it on this device."
                }
            />
            {state === "failed" && error && !message && <Notice tone="error">{error}</Notice>}
            {message && <Notice tone={message.tone}>{message.text}</Notice>}

            <form onSubmit={resend} className="space-y-4">
                {(!initialEmail || state === "failed") && (
                    <Field label="Email" htmlFor="email">
                        <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={authInputCls} placeholder="you@example.com" />
                    </Field>
                )}
                {state === "failed" ? (
                    <PrimaryButton loading={busy} disabled={cooldown > 0}>{cooldown > 0 ? `Send again in ${cooldown}s` : "Send a new link"}</PrimaryButton>
                ) : (
                    <SecondaryButton type="submit" loading={busy} disabled={cooldown > 0}>{cooldown > 0 ? `Send again in ${cooldown}s` : "Send the link again"}</SecondaryButton>
                )}
            </form>

            <Footnote>
                <p className="text-center">
                    No email? Check spam, or <TextLink href={codeHref}>log in with a code</TextLink> instead.
                </p>
                <p className="mt-3 text-center">
                    Wrong address? <TextLink href={AUTH_ROUTES.signUp}>Start again</TextLink>
                </p>
            </Footnote>
        </div>
    )
}
