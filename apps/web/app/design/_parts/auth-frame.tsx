"use client"

import { ArrowLeft, Check } from "lucide-react"
import { useState } from "react"
import { cn } from "@repo/ui/lib/utils"
import { ONBOARDING, WELCOME_CREDITS } from "@repo/boli"
import { CodeTag } from "../_components/board"
import { PillButton } from "../_components/pill-button"
import { QuietInput } from "../_components/quiet-input"
import { Segmented } from "../_components/segmented"
import { DhakaStrip } from "./dhaka-strip"
import { ThreadLockup } from "./logo-final"
import { ValleyHero } from "../_art/valley/valley"
import { R2Head } from "./r2-head"
import { useSky } from "./sky"
import { sans, serif } from "./t1"

type Screen = "signin" | "signup" | "welcome"

function GoogleG() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden className="size-4">
            <path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.8h3.6c2.1-1.9 3.3-4.8 3.3-8.1Z" />
            <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.9A11 11 0 0 0 12 23Z" />
            <path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7H2.1a11 11 0 0 0 0 9.9l3.7-2.8Z" />
            <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.6l3.2-3.2A11 11 0 0 0 2.1 7l3.7 2.9C6.7 7.3 9.1 5.4 12 5.4Z" />
        </svg>
    )
}

function Divider() {
    return (
        <div className="flex items-center gap-3 text-xs text-boli-muted">
            <span className="h-px flex-1 bg-boli-line" />
            or with email
            <span className="h-px flex-1 bg-boli-line" />
        </div>
    )
}

function SignIn() {
    return (
        <div className="grid gap-5">
            <div>
                <h3 className="text-[40px] leading-[1.02] text-boli-ink" style={serif(360, 144, "-0.035em")}>
                    Welcome back
                </h3>
                <p className="mt-2 text-sm text-boli-text">Sign in to Kura and your API keys.</p>
            </div>
            <PillButton variant="secondary" size="lg" className="w-full">
                <GoogleG /> Continue with Google
            </PillButton>
            <Divider />
            <QuietInput label="Email" type="email" placeholder="you@example.com" autoComplete="off" />
            <QuietInput label="Password" type="password" placeholder="Your password" autoComplete="off" />
            <PillButton size="lg" className="w-full">
                Sign in
            </PillButton>
            <p className="text-center text-sm text-boli-muted">
                New here? <span className="cursor-pointer text-boli-ink underline decoration-1 underline-offset-4">Create an account</span>
            </p>
        </div>
    )
}

function SignUp() {
    const checks = [
        { label: "8+ characters", ok: true },
        { label: "A number", ok: true },
        { label: "Upper and lower case", ok: false },
    ]
    return (
        <div className="grid gap-5">
            <div>
                <h3 className="text-[40px] leading-[1.02] text-boli-ink" style={serif(360, 144, "-0.035em")}>
                    Create your account
                </h3>
                <p className="mt-2 text-sm text-boli-text">{WELCOME_CREDITS} free credits once you verify your email.</p>
            </div>
            <PillButton variant="secondary" size="lg" className="w-full">
                <GoogleG /> Sign up with Google
            </PillButton>
            <Divider />
            <QuietInput label="Email" type="email" placeholder="you@example.com" autoComplete="off" />
            <div className="grid gap-2">
                <QuietInput label="Password" type="password" placeholder="Choose a password" autoComplete="off" />
                <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    {checks.map((c) => (
                        <li key={c.label} className={cn("inline-flex items-center gap-1", c.ok ? "text-boli-ink" : "text-boli-muted")}>
                            <Check aria-hidden strokeWidth={2} className={cn("size-3", !c.ok && "opacity-30")} />
                            {c.label}
                        </li>
                    ))}
                </ul>
            </div>
            <PillButton size="lg" className="w-full">
                Create account
            </PillButton>
            <p className="text-center text-xs leading-5 text-boli-muted">
                By creating an account you accept the <span className="underline underline-offset-4">Terms</span> and <span className="underline underline-offset-4">Privacy</span>.
            </p>
        </div>
    )
}

function Welcome() {
    const sky = useSky()
    const [picked, setPicked] = useState<string[]>(["Chatbot or assistant"])
    return (
        <div className="grid gap-5">
            <div>
                <p className="text-xs text-boli-muted">Step 1 of 4</p>
                <div className="mt-2 flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                        <span key={i} className="h-1 flex-1 rounded-full" style={{ background: i === 0 ? sky.fill : "#e6e1db" }} />
                    ))}
                </div>
                <h3 className="mt-5 text-[40px] leading-[1.02] text-boli-ink" style={serif(360, 144, "-0.035em")}>
                    What will you build?
                </h3>
                <p className="mt-2 text-sm text-boli-text">Pick any that fit. It shapes the examples you see first.</p>
            </div>
            <div className="flex flex-wrap gap-2">
                {ONBOARDING.build.map((b) => {
                    const on = picked.includes(b)
                    return (
                        <PillButton
                            key={b}
                            size="sm"
                            variant={on ? "primary" : "secondary"}
                            aria-pressed={on}
                            onClick={() => setPicked((p) => (on ? p.filter((x) => x !== b) : [...p, b]))}
                        >
                            {b}
                        </PillButton>
                    )
                })}
            </div>
            <div className="flex items-center justify-between pt-2">
                <PillButton variant="ghost">
                    <ArrowLeft aria-hidden strokeWidth={1.75} /> Back
                </PillButton>
                <PillButton>Continue</PillButton>
            </div>
        </div>
    )
}

export function AuthFrame({ n = "04" }: { n?: string }) {
    const sky = useSky()
    const [screen, setScreen] = useState<Screen>("signin")
    return (
        <section id="screens-auth" className="grid scroll-mt-28 gap-8">
            <R2Head
                n={n}
                title="Auth - sign in, sign up, onboarding"
                line="Split screen. Left: logo, the form, a slim Dhaka band along the bottom. Right: the golden-hour valley (P1-V3, portrait crop) and one line over its sky - nothing else, as calm as a sign-in should be. Light only (public page)."
                codes="A1"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <CodeTag code="A1" />
                    <p className="text-sm text-boli-text">The form switches; the right side never changes</p>
                </div>
                <Segmented
                    label="Auth screen"
                    size="sm"
                    value={screen}
                    onValueChange={setScreen}
                    options={[
                        { value: "signin", label: "Sign in" },
                        { value: "signup", label: "Sign up" },
                        { value: "welcome", label: "Onboarding" },
                    ]}
                />
            </div>
            <div className="grid min-h-[720px] overflow-hidden rounded-3xl border border-boli-line bg-boli-ground md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]" style={sans()}>
                <div className="flex min-w-0 flex-col bg-boli-ground">
                    <div className="px-8 pt-7 sm:px-12">
                        <ThreadLockup code="R2" size={26} />
                    </div>
                    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-12">
                        {screen === "signin" ? <SignIn /> : screen === "signup" ? <SignUp /> : <Welcome />}
                    </div>
                    <DhakaStrip sky={sky} scale={2} />
                </div>
                <div className="relative hidden min-w-0 p-3 md:block">
                    <div className="relative h-full overflow-hidden rounded-[20px]" style={{ background: "#b1a0cc" }}>
                        <ValleyHero variant="gold" crop="portrait" preserve="xMidYMax slice" className="absolute inset-0 block h-full w-full" />
                        <p className="pointer-events-none absolute inset-x-0 top-14 px-8 text-center text-[32px] leading-tight text-boli-ink" style={serif(380, 96, "-0.025em")}>
                            {WELCOME_CREDITS} free credits.
                            <br />
                            Ask the way you talk.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    )
}
