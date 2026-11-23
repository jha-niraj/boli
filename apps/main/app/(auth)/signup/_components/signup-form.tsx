"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { signIn, signUp } from "@repo/auth/client"
import { clientErrorMessage } from "@repo/auth/errors"
import {
    AuthTitle, Divider, Field, Footnote, GoogleButton, Notice, PasswordChecklist, PasswordInput, PrimaryButton,
    TermsCheckbox, TextLink, authInputCls, passwordMeetsRules,
} from "@repo/auth/ui"
import type { GoogleMode } from "@repo/auth/google"
import { Input } from "@repo/ui/components/ui/input"
import { AUTH_ROUTES, VERIFIED_CALLBACK } from "@/lib/auth-routes"

const TERMS_FIRST = "Accept the Terms of Service and Privacy Policy first."
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Google first, then email, name and a password with a live checklist, and the required terms box (Sarvam study 1).
 * Create account stays disabled until all of it is valid. Email accounts confirm the address before the first sign-in:
 * on success the person goes to /verifyemail. The acceptance itself is recorded on the first signed-in step of /welcome.
 */
export function SignUpForm({ google, returnTo, initialEmail }: { google: GoogleMode; returnTo: string; initialEmail: string }) {
    const router = useRouter()
    const [name, setName] = React.useState("")
    const [email, setEmail] = React.useState(initialEmail)
    const [password, setPassword] = React.useState("")
    const [agreed, setAgreed] = React.useState(false)
    const [busy, setBusy] = React.useState<null | "form" | "google">(null)
    const [error, setError] = React.useState<string | null>(null)

    const valid = EMAIL_SHAPE.test(email.trim()) && name.trim().length > 0 && passwordMeetsRules(password) && agreed

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        if (!agreed) return setError(TERMS_FIRST)
        if (!passwordMeetsRules(password)) return setError("The password needs 8 characters, a number, and upper and lower case letters.")
        setBusy("form")
        const to = email.trim()
        const { error: err } = await signUp.email({ name: name.trim(), email: to, password, callbackURL: VERIFIED_CALLBACK })
        if (err) {
            setBusy(null)
            setError(clientErrorMessage(err))
            return
        }
        router.push(`${AUTH_ROUTES.verifyEmail}?email=${encodeURIComponent(to)}`)
    }

    async function onGoogle() {
        setError(null)
        if (!agreed) return setError(TERMS_FIRST)
        setBusy("google")
        const { error: err } = await signIn.social({
            provider: "google",
            callbackURL: returnTo,
            errorCallbackURL: `${AUTH_ROUTES.signIn}?returnTo=${encodeURIComponent(returnTo)}`,
        })
        if (err) {
            setBusy(null)
            setError(clientErrorMessage(err))
        }
    }

    return (
        <div>
            <AuthTitle title="Create your account" sub="It takes a minute. We will confirm your email." />
            {error && <Notice tone="error">{error}</Notice>}

            {google !== "off" && (
                <>
                    <GoogleButton onClick={onGoogle} loading={busy === "google"} disabled={busy !== null && busy !== "google"} setup={google === "setup"} />
                    <Divider>OR</Divider>
                </>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
                <Field label="Email" htmlFor="email">
                    <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={authInputCls} placeholder="you@example.com" />
                </Field>
                <Field label="Name" htmlFor="name">
                    <Input id="name" autoComplete="name" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} className={authInputCls} placeholder="Your name" />
                </Field>
                <Field label="Password" htmlFor="password">
                    <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="new-password" placeholder="Choose a password" />
                    <PasswordChecklist value={password} />
                </Field>
                <TermsCheckbox checked={agreed} onChange={(v) => { setAgreed(v); if (v && error === TERMS_FIRST) setError(null) }} terms={AUTH_ROUTES.terms} privacy={AUTH_ROUTES.privacy} />
                <PrimaryButton loading={busy === "form"} disabled={busy !== null || !valid}>Create account</PrimaryButton>
            </form>

            <Footnote>
                <p className="text-center">
                    Already have an account? <TextLink href={AUTH_ROUTES.signIn}>Log in</TextLink>
                </p>
            </Footnote>
        </div>
    )
}
