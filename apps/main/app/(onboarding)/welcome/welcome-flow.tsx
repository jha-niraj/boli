"use client"

import * as React from "react"
import { ArrowLeft, ArrowRight, Check, KeyRound, MessagesSquare } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@repo/ui/components/ui/radio-group"
import { cn } from "@repo/ui/lib/utils"
import { finishOnboarding, saveOnboardingAnswers, saveWelcomeName } from "@/actions/onboarding.action"
import { BRAND, KURA, ONBOARDING, WELCOME_CREDITS } from "@/lib/boli"
import { ROUTES } from "@/lib/navigation"
import { ONBOARDING_OTHER_MAX, type OnboardingPicks } from "@/lib/settings-values"

export interface WelcomeData {
    name: string
    email: string
    preferredName: string | null
    build: OnboardingPicks
    languages: OnboardingPicks
    role: OnboardingPicks
    teamSize: OnboardingPicks
}

const STEP_COUNT = 4
const OTHER = "__other__"

/** A multi-select answer while it is being edited: the picks, whether "Other" is on, and its text. */
interface MultiState {
    picks: string[]
    otherOn: boolean
    other: string
}

const toMulti = (p: OnboardingPicks): MultiState => ({ picks: p.picks, otherOn: Boolean(p.other), other: p.other ?? "" })
const fromMulti = (m: MultiState): OnboardingPicks => ({ picks: m.picks, other: m.otherOn && m.other.trim() ? m.other.trim() : null })
const multiAnswered = (m: MultiState) => m.picks.length > 0 || (m.otherOn && m.other.trim().length > 0)
const multiValid = (m: MultiState) => !m.otherOn || m.other.trim().length > 0

function firstName(name: string): string {
    return name.trim().split(/\s+/)[0] ?? ""
}

/**
 * Four steps, one per screen (plan Q14): name and what to call you, what you will build, your users' languages, role
 * and team size. Every step offers choices plus "Other"; steps 2-4 can be skipped. Each Continue saves its own step, so
 * leaving half way keeps what was done. The finish screen shows the free credits and the two ways in.
 */
export function WelcomeFlow({ data }: { data: WelcomeData }) {
    const [step, setStep] = React.useState(0)
    const [finished, setFinished] = React.useState(false)
    const [busy, setBusy] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    // Step 1
    const [name, setName] = React.useState(data.name)
    const initialCall = data.preferredName ?? firstName(data.name)
    const [callPick, setCallPick] = React.useState<string>(() => {
        const options = callOptions(data.name)
        return options.includes(initialCall) ? initialCall : initialCall ? OTHER : options[0] ?? OTHER
    })
    const [callOther, setCallOther] = React.useState(() => (callOptions(data.name).includes(initialCall) ? "" : initialCall))

    // Steps 2-4
    const [build, setBuild] = React.useState<MultiState>(() => toMulti(data.build))
    const [languages, setLanguages] = React.useState<MultiState>(() => toMulti(data.languages))
    const [role, setRole] = React.useState<string>(() => data.role.picks[0] ?? (data.role.other ? OTHER : ""))
    const [roleOther, setRoleOther] = React.useState(data.role.other ?? "")
    const [teamSize, setTeamSize] = React.useState<string>(data.teamSize.picks[0] ?? "")

    const nameOptions = callOptions(name)
    // Editing the name can retire the picked chip (the old first name): fall back to the new first name.
    const call = callPick === OTHER || nameOptions.includes(callPick) ? callPick : (nameOptions[0] ?? OTHER)
    const callName = call === OTHER ? callOther.trim() : call

    const canContinue =
        step === 0 ? name.trim().length > 0 && callName.length > 0
        : step === 1 ? multiAnswered(build) && multiValid(build)
        : step === 2 ? multiAnswered(languages) && multiValid(languages)
        : (role !== "" || teamSize !== "") && (role !== OTHER || roleOther.trim().length > 0)

    function go(to: number) {
        setError(null)
        setStep(Math.max(0, Math.min(STEP_COUNT - 1, to)))
    }

    async function finish(): Promise<boolean> {
        const res = await finishOnboarding()
        if (!res.success) {
            setError(res.error ?? "Could not finish. Try again.")
            return false
        }
        setFinished(true)
        return true
    }

    async function onContinue() {
        setError(null)
        setBusy(true)
        try {
            if (step === 0) {
                const res = await saveWelcomeName({ name, preferredName: callName })
                if (!res.success) return setError(res.error ?? "Could not save your name.")
                setName(res.data.name)
            } else if (step === 1) {
                const res = await saveOnboardingAnswers({ answers: { build: fromMulti(build) } })
                if (!res.success) return setError(res.error ?? "Could not save that.")
            } else if (step === 2) {
                const res = await saveOnboardingAnswers({ answers: { languages: fromMulti(languages) } })
                if (!res.success) return setError(res.error ?? "Could not save that.")
            } else {
                const res = await saveOnboardingAnswers({
                    answers: {
                        role: role === OTHER ? { picks: [], other: roleOther.trim() || null } : { picks: role ? [role] : [], other: null },
                        teamSize: { picks: teamSize ? [teamSize] : [], other: null },
                    },
                })
                if (!res.success) return setError(res.error ?? "Could not save that.")
                await finish()
                return
            }
            go(step + 1)
        } finally {
            setBusy(false)
        }
    }

    async function onSkip() {
        if (step < STEP_COUNT - 1) return go(step + 1)
        setError(null)
        setBusy(true)
        try {
            await finish()
        } finally {
            setBusy(false)
        }
    }

    if (finished) return <FinishScreen />

    return (
        <section className="rounded-3xl border border-boli-line bg-card shadow-[0_20px_50px_-30px_rgba(20,20,20,0.35)] dark:border-neutral-800">
            <div className="px-6 pt-6 sm:px-8 sm:pt-7">
                <Progress step={step} />
            </div>

            <form
                className="flex flex-col"
                onSubmit={(e) => {
                    e.preventDefault()
                    if (canContinue && !busy) void onContinue()
                }}
            >
                <div className="min-h-[22rem] px-6 py-6 sm:px-8">
                    {step === 0 && (
                        <div className="space-y-6">
                            <StepHead title={`Welcome to ${BRAND.name}`} line="Start with your name. It is how your account and your receipts read." />
                            <div className="space-y-1.5">
                                <Label htmlFor="welcome-name">Your name</Label>
                                <Input id="welcome-name" value={name} maxLength={80} autoComplete="name" autoFocus onChange={(e) => setName(e.target.value)} className="h-10" />
                            </div>
                            <fieldset className="space-y-2.5">
                                <legend className="mb-2.5 text-sm font-medium">What should we call you?</legend>
                                <div role="radiogroup" aria-label="What should we call you" className="flex flex-wrap gap-2">
                                    {nameOptions.map((o) => (
                                        <Chip key={o} on={call === o} onClick={() => setCallPick(o)} role="radio">{o}</Chip>
                                    ))}
                                    <Chip on={call === OTHER} onClick={() => setCallPick(OTHER)} role="radio">Other</Chip>
                                </div>
                                {call === OTHER && (
                                    <OtherInput id="welcome-call" label="What should we call you" value={callOther} onChange={setCallOther} placeholder="A nickname, a short name" max={40} />
                                )}
                            </fieldset>
                        </div>
                    )}

                    {step === 1 && (
                        <MultiStep
                            title="What will you build?"
                            line="Pick any that fit. It helps us shape Kura and the docs."
                            options={ONBOARDING.build}
                            state={build}
                            onChange={setBuild}
                            otherPlaceholder="Tell us in a few words"
                        />
                    )}

                    {step === 2 && (
                        <MultiStep
                            title="Which languages do your users write in?"
                            line="Pick all that apply. Boli is tuned for English, Romanized Nepali and the mix."
                            options={ONBOARDING.languages}
                            state={languages}
                            onChange={setLanguages}
                            otherPlaceholder="Maithili, Newari, Hindi..."
                        />
                    )}

                    {step === 3 && (
                        <div className="space-y-6">
                            <StepHead title="A little about you" line="Your role and the size of your team." />
                            <div className="space-y-2.5">
                                <p id="welcome-role-label" className="text-sm font-medium">Your role</p>
                                <RadioGroup value={role} onValueChange={setRole} aria-labelledby="welcome-role-label" className="grid gap-2 sm:grid-cols-2">
                                    {[...ONBOARDING.roles, OTHER].map((r) => (
                                        <Label
                                            key={r}
                                            htmlFor={`role-${r}`}
                                            className="flex h-11 cursor-pointer items-center gap-3 rounded-xl border border-boli-line px-3.5 text-sm font-normal transition-colors hover:bg-boli-ground has-[[data-state=checked]]:border-foreground has-[[data-state=checked]]:bg-boli-ground dark:border-neutral-800 dark:hover:bg-neutral-900 dark:has-[[data-state=checked]]:border-white dark:has-[[data-state=checked]]:bg-neutral-900"
                                        >
                                            <RadioGroupItem id={`role-${r}`} value={r} />
                                            {r === OTHER ? "Other" : r}
                                        </Label>
                                    ))}
                                </RadioGroup>
                                {role === OTHER && (
                                    <OtherInput id="welcome-role-other" label="Your role" value={roleOther} onChange={setRoleOther} placeholder="Your role" />
                                )}
                            </div>
                            <div className="space-y-2.5">
                                <p className="text-sm font-medium">Team size</p>
                                <div role="radiogroup" aria-label="Team size" className="flex flex-wrap gap-2">
                                    {ONBOARDING.teamSizes.map((t) => (
                                        <Chip key={t} role="radio" on={teamSize === t} onClick={() => setTeamSize(teamSize === t ? "" : t)}>{t}</Chip>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {error && <p role="alert" className="mt-5 text-sm text-rose-700 dark:text-rose-300">{error}</p>}
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-boli-line px-6 py-4 sm:px-8 dark:border-neutral-800">
                    <Button type="button" variant="ghost" size="sm" className={cn("gap-1.5", step === 0 && "invisible")} disabled={busy} onClick={() => go(step - 1)}>
                        <ArrowLeft className="h-3.5 w-3.5" /> Back
                    </Button>
                    <div className="flex items-center gap-2">
                        {step > 0 && (
                            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void onSkip()}>
                                Skip
                            </Button>
                        )}
                        <Button type="submit" size="sm" className="gap-1.5 px-4" disabled={busy || !canContinue}>
                            {busy && <InlineLoader size={14} className="text-current" />}
                            {step === STEP_COUNT - 1 ? "Finish" : "Continue"}
                            {!busy && <ArrowRight className="h-3.5 w-3.5" />}
                        </Button>
                    </div>
                </div>
            </form>
        </section>
    )
}

/** First name and the full name when they differ. */
function callOptions(name: string): string[] {
    const full = name.replace(/\s+/g, " ").trim()
    const first = firstName(full)
    return [...new Set([first, full].filter(Boolean))]
}

/** A thin bar in four parts and "Step n of 4". The current part and the ones before it are filled. */
function Progress({ step }: { step: number }) {
    return (
        <div>
            <div className="flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={STEP_COUNT} aria-valuenow={step + 1} aria-label="Onboarding progress">
                {Array.from({ length: STEP_COUNT }, (_, i) => (
                    <span key={i} className={cn("h-1 flex-1 rounded-full transition-colors duration-300", i <= step ? "bg-boli-crimson" : "bg-boli-sand dark:bg-neutral-800")} />
                ))}
            </div>
            <p className="mt-2.5 text-xs text-muted-foreground">Step {step + 1} of {STEP_COUNT}</p>
        </div>
    )
}

function StepHead({ title, line }: { title: string; line: string }) {
    return (
        <div>
            <h1 className="font-serif text-3xl leading-tight tracking-tight text-foreground sm:text-[2.125rem]">{title}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{line}</p>
        </div>
    )
}

function Chip({ on, onClick, role, children }: { on: boolean; onClick: () => void; role?: "radio"; children: React.ReactNode }) {
    return (
        <Button
            type="button"
            variant="outline"
            size="sm"
            role={role}
            aria-checked={role === "radio" ? on : undefined}
            aria-pressed={role === "radio" ? undefined : on}
            onClick={onClick}
            className={cn(
                "h-9 gap-1.5 px-4 font-normal",
                on && "border-foreground bg-foreground text-background hover:bg-foreground/90 hover:text-background",
            )}
        >
            {on && <Check className="h-3.5 w-3.5" />}
            {children}
        </Button>
    )
}

function OtherInput({ id, label, value, onChange, placeholder, max = ONBOARDING_OTHER_MAX }: {
    id: string
    label: string
    value: string
    onChange: (v: string) => void
    placeholder: string
    max?: number
}) {
    return (
        <div className="pt-1 animate-in fade-in-0 slide-in-from-top-1 duration-200">
            <Label htmlFor={id} className="sr-only">{label}</Label>
            <Input id={id} value={value} maxLength={max} autoFocus placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="h-10 max-w-sm" />
        </div>
    )
}

function MultiStep({ title, line, options, state, onChange, otherPlaceholder }: {
    title: string
    line: string
    options: readonly string[]
    state: MultiState
    onChange: (s: MultiState) => void
    otherPlaceholder: string
}) {
    const toggle = (v: string) =>
        onChange({ ...state, picks: state.picks.includes(v) ? state.picks.filter((x) => x !== v) : [...state.picks, v] })
    return (
        <div className="space-y-6">
            <StepHead title={title} line={line} />
            <div className="space-y-2.5">
                <div role="group" aria-label={title} className="flex flex-wrap gap-2">
                    {options.map((o) => (
                        <Chip key={o} on={state.picks.includes(o)} onClick={() => toggle(o)}>{o}</Chip>
                    ))}
                    <Chip on={state.otherOn} onClick={() => onChange({ ...state, otherOn: !state.otherOn })}>Other</Chip>
                </div>
                {state.otherOn && (
                    <OtherInput id={`${title}-other`.replace(/\W+/g, "-").toLowerCase()} label={`${title} - other`} value={state.other} onChange={(other) => onChange({ ...state, other })} placeholder={otherPlaceholder} />
                )}
            </div>
        </div>
    )
}

function FinishScreen() {
    return (
        <section className="rounded-3xl border border-boli-line bg-card px-6 py-10 text-center shadow-[0_20px_50px_-30px_rgba(20,20,20,0.35)] sm:px-10 dark:border-neutral-800">
            <p className="font-serif text-7xl leading-none text-boli-crimson-ink dark:text-boli-crimson">{WELCOME_CREDITS}</p>
            <h1 className="mt-4 font-serif text-3xl leading-tight tracking-tight text-foreground">You have {WELCOME_CREDITS} free credits</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                1 credit is Rs 1 and they never expire. Spend them in {KURA.name} or through the API - the price is the same.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-2.5 sm:flex-row">
                <Button asChild className="h-10 gap-2 px-5">
                    <AppLink href={ROUTES.kura}><MessagesSquare className="h-4 w-4" />Open {KURA.name}</AppLink>
                </Button>
                <Button asChild variant="outline" className="h-10 gap-2 px-5">
                    <AppLink href={ROUTES.keys}><KeyRound className="h-4 w-4" />Create an API key</AppLink>
                </Button>
            </div>
        </section>
    )
}
