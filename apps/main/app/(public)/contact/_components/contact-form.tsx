"use client"

import { useRef, useState, useTransition, type FormEvent, type KeyboardEvent, type ReactNode } from "react"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { Spinner } from "@repo/ui/components/ui/spinner"
import { cn } from "@repo/ui/lib/utils"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { PillButton } from "@/components/brand/pill-button"
import { DISPLAY } from "@/components/brand/type"
import { submitContactMessage } from "@/actions/contact.action"
import { CONTACT_MESSAGE_MAX, CONTACT_TOPICS, contactSchema, type ContactTopic } from "@/schemas/contact"

type Errors = Partial<Record<"name" | "email" | "topic" | "message" | "form", string>>

/** One line under each topic, so people pick the right one. */
const TOPIC_HINT: Record<ContactTopic, string> = {
    API: "Keys, errors, models",
    Billing: "Credits, eSewa, Khalti",
    Enterprise: "Volumes, invoices",
    Partnership: "Build something together",
    Press: "Stories and interviews",
    Other: "Anything else",
}

/**
 * The contact form (/contact): the topic first (pill choices), then name, email and message, plus a hidden honeypot.
 * Checked here and again on the server (actions/contact.action.ts keeps the honeypot and the hourly limit).
 */
export function ContactForm({ initialTopic }: { initialTopic?: ContactTopic }) {
    const [topic, setTopic] = useState<ContactTopic | "">(initialTopic ?? "")
    const [message, setMessage] = useState("")
    const [errors, setErrors] = useState<Errors>({})
    const [sent, setSent] = useState(false)
    const [pending, startTransition] = useTransition()

    function onSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const form = new FormData(e.currentTarget)
        const input = {
            name: String(form.get("name") ?? ""),
            email: String(form.get("email") ?? ""),
            topic: topic as ContactTopic,
            message,
            website: String(form.get("website") ?? ""),
        }
        const parsed = contactSchema.safeParse(input)
        if (!parsed.success) {
            const next: Errors = {}
            for (const issue of parsed.error.issues) {
                const key = issue.path[0]
                if ((key === "name" || key === "email" || key === "topic" || key === "message") && !next[key]) next[key] = issue.message
            }
            setErrors(next)
            return
        }
        setErrors({})
        startTransition(async () => {
            const res = await submitContactMessage(parsed.data)
            if (res.success) {
                setSent(true)
                return
            }
            const fe = res.fieldErrors ?? {}
            setErrors({ name: fe.name, email: fe.email, topic: fe.topic, message: fe.message, form: res.error })
        })
    }

    if (sent) {
        return (
            <div role="status" className="rounded-3xl border border-boli-line bg-white p-8 text-center font-sans">
                <CheckCircle2 className="mx-auto h-8 w-8 text-boli-sky-ink" strokeWidth={1.5} aria-hidden />
                <p className="mt-4 text-3xl leading-tight text-boli-ink" style={DISPLAY.h3}>
                    Dhanyabad. Message received.
                </p>
                <p className="mt-2 text-sm text-boli-text">We read every message and reply by email.</p>
            </div>
        )
    }

    return (
        <form onSubmit={onSubmit} noValidate className="relative space-y-5 rounded-3xl border border-boli-line bg-white p-5 font-sans sm:p-8">
            <TopicChoices value={topic} onChange={setTopic} error={errors.topic} />
            <div className="grid gap-5 sm:grid-cols-2">
                <Field id="contact-name" label="Name" error={errors.name}>
                    <Input id="contact-name" name="name" autoComplete="name" required aria-invalid={!!errors.name} aria-describedby={errors.name ? "contact-name-error" : undefined} />
                </Field>
                <Field id="contact-email" label="Email" error={errors.email}>
                    <Input id="contact-email" name="email" type="email" autoComplete="email" required aria-invalid={!!errors.email} aria-describedby={errors.email ? "contact-email-error" : undefined} />
                </Field>
            </div>

            <Field id="contact-message" label="Message" error={errors.message} hint={`${message.length.toLocaleString()} / ${CONTACT_MESSAGE_MAX.toLocaleString()}`}>
                <Textarea
                    id="contact-message"
                    name="message"
                    rows={6}
                    value={message}
                    maxLength={CONTACT_MESSAGE_MAX}
                    onChange={(e) => setMessage(e.target.value)}
                    aria-invalid={!!errors.message}
                    aria-describedby={errors.message ? "contact-message-error" : undefined}
                    className="min-h-36"
                />
            </Field>
            {/* Honeypot: off-screen and skipped by keyboard and screen readers; people never see it. */}
            <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
                <label htmlFor="contact-website">Website</label>
                <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>
            {errors.form ? (
                <p role="alert" className="text-sm text-boli-crimson-ink">
                    {errors.form}
                </p>
            ) : null}
            <div className="flex flex-col-reverse items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-boli-muted">We use your email only to reply.</p>
                <PillButton type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
                    {pending ? <Spinner className="h-4 w-4" /> : null}
                    {pending ? "Sending" : "Send message"}
                </PillButton>
            </div>
        </form>
    )
}

/** The topics as a radio group of pills: arrow keys move between them, the chosen one is ink. */
function TopicChoices({ value, onChange, error }: { value: ContactTopic | ""; onChange: (t: ContactTopic) => void; error?: string }) {
    const refs = useRef<Record<string, HTMLButtonElement | null>>({})
    function onKey(e: KeyboardEvent<HTMLDivElement>) {
        const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"]
        if (!keys.includes(e.key)) return
        e.preventDefault()
        const i = value ? CONTACT_TOPICS.indexOf(value) : -1
        const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1
        const next = CONTACT_TOPICS[(i + step + CONTACT_TOPICS.length) % CONTACT_TOPICS.length]
        if (!next) return
        onChange(next)
        refs.current[next]?.focus()
    }
    return (
        <fieldset className="space-y-2">
            <legend id="contact-topic-label" className="text-sm text-boli-ink">
                What is it about?
            </legend>
            <div
                role="radiogroup"
                aria-labelledby="contact-topic-label"
                aria-invalid={!!error}
                aria-describedby={error ? "contact-topic-error" : undefined}
                onKeyDown={onKey}
                className="grid grid-cols-2 gap-2 sm:grid-cols-3"
            >
                {CONTACT_TOPICS.map((t, i) => {
                    const on = t === value
                    return (
                        <Button
                            key={t}
                            ref={(el) => {
                                refs.current[t] = el
                            }}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            tabIndex={on || (!value && i === 0) ? 0 : -1}
                            variant="ghost"
                            onClick={() => onChange(t)}
                            className={cn(
                                "h-auto min-h-14 cursor-pointer flex-col items-start justify-center gap-0 border px-5 py-2 text-left font-normal whitespace-normal",
                                on ? "border-boli-ink bg-boli-ink text-white hover:bg-boli-ink hover:text-white" : "border-boli-line bg-white text-boli-ink hover:bg-boli-ground",
                            )}
                        >
                            <span className="text-sm font-[450]">{t}</span>
                            <span className={cn("text-xs", on ? "text-white/70" : "text-boli-muted")}>{TOPIC_HINT[t]}</span>
                        </Button>
                    )
                })}
            </div>
            {error ? (
                <p id="contact-topic-error" className="text-xs text-boli-crimson-ink">
                    {error}
                </p>
            ) : null}
        </fieldset>
    )
}

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: ReactNode }) {
    return (
        <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
                <Label htmlFor={id} className="text-sm text-boli-ink">
                    {label}
                </Label>
                {hint ? <span className="text-xs text-boli-muted">{hint}</span> : null}
            </div>
            {children}
            {error ? (
                <p id={`${id}-error`} className="text-xs text-boli-crimson-ink">
                    {error}
                </p>
            ) : null}
        </div>
    )
}
