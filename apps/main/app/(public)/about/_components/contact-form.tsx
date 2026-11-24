"use client"

import { useState, useTransition, type FormEvent, type ReactNode } from "react"
import { CheckCircle2 } from "lucide-react"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/ui/select"
import { Spinner } from "@repo/ui/components/ui/spinner"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { PillButton } from "@/components/brand/pill-button"
import { DISPLAY } from "@/components/brand/type"
import { submitContactMessage } from "@/actions/contact.action"
import { CONTACT_MESSAGE_MAX, CONTACT_TOPICS, contactSchema, type ContactTopic } from "@/schemas/contact"

type Errors = Partial<Record<"name" | "email" | "topic" | "message" | "form", string>>

/** The contact form: name, email, topic, message, plus a hidden honeypot. Checked here and again on the server. */
export function ContactForm() {
    const [topic, setTopic] = useState<ContactTopic | "">("")
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
            <div className="grid gap-5 sm:grid-cols-2">
                <Field id="contact-name" label="Name" error={errors.name}>
                    <Input id="contact-name" name="name" autoComplete="name" required aria-invalid={!!errors.name} aria-describedby={errors.name ? "contact-name-error" : undefined} />
                </Field>
                <Field id="contact-email" label="Email" error={errors.email}>
                    <Input id="contact-email" name="email" type="email" autoComplete="email" required aria-invalid={!!errors.email} aria-describedby={errors.email ? "contact-email-error" : undefined} />
                </Field>
            </div>
            <Field id="contact-topic" label="Topic" error={errors.topic}>
                <Select value={topic} onValueChange={(v) => setTopic(v as ContactTopic)}>
                    <SelectTrigger id="contact-topic" aria-invalid={!!errors.topic} className="w-full">
                        <SelectValue placeholder="What is it about?" />
                    </SelectTrigger>
                    <SelectContent>
                        {CONTACT_TOPICS.map((t) => (
                            <SelectItem key={t} value={t}>
                                {t}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </Field>
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
