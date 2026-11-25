"use client"

import { useState, useTransition, type FormEvent, type ReactNode } from "react"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { ComboSelect } from "@repo/ui/components/ui/combo-select"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { Spinner } from "@repo/ui/components/ui/spinner"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { PillButton } from "@repo/brand/pill-button"
import { DISPLAY } from "@repo/brand/type"
import { JAWAF_BUSINESS_TYPE_INFO, JAWAF_BUSINESS_TYPES, jawafSectorOptions, type JawafBusinessType } from "@repo/boli/jawaf"
import { nepalCityOptions } from "@repo/core/geo/nepal"
import { submitContactMessage } from "@/actions/contact.action"
import {
    CONTACT_BUSINESS_MAX, CONTACT_CITY_MAX, CONTACT_MESSAGE_MAX, CONTACT_SECTOR_MAX, CONTACT_TOPICS, CONTACT_WEBSITE_MAX, contactSchema, JAWAF_PILOT_TOPIC, type ContactInput, type ContactTopic,
} from "@/schemas/contact"

const FIELDS = ["name", "email", "topic", "message", "businessName", "businessWebsite", "businessType", "city", "sector", "phone"] as const
type FieldKey = (typeof FIELDS)[number]
type Errors = Partial<Record<FieldKey | "form", string>>

const CITY_OPTIONS = nepalCityOptions()
const BUSINESS_TYPE_OPTIONS = JAWAF_BUSINESS_TYPES.map((t) => ({ value: t, label: JAWAF_BUSINESS_TYPE_INFO[t].label }))
const SECTOR_OPTIONS = jawafSectorOptions()

function isField(k: unknown): k is FieldKey {
    return FIELDS.some((f) => f === k)
}

/** One line under each topic, so people pick the right one. */
const TOPIC_HINT: Record<ContactTopic, string> = {
    API: "Keys, errors, models",
    Jawaf: "Join the pilot for your business",
    Billing: "Credits, eSewa, Khalti",
    Enterprise: "Volumes, invoices",
    Partnership: "Build something together",
    Press: "Stories and interviews",
    Other: "Anything else",
}
const TOPIC_OPTIONS = CONTACT_TOPICS.map((t) => ({ value: t, label: t, hint: TOPIC_HINT[t] }))

/**
 * The contact form (/contact): the topic first (pill choices), then name, email and message, plus a hidden honeypot.
 * The Jawaf topic also asks what a demo bot needs - business name, website, kind of business, city and phone - so the
 * admin can build the demo straight from the request (plan/admin/jawaf/admin-v1.md, Inbox).
 * Checked here and again on the server (actions/contact.action.ts keeps the honeypot and the hourly limit).
 */
export function ContactForm({ initialTopic }: { initialTopic?: ContactTopic }) {
    const [topic, setTopic] = useState<ContactTopic | "">(initialTopic ?? "")
    const [businessType, setBusinessType] = useState<JawafBusinessType | "">("")
    const [city, setCity] = useState("")
    const [sector, setSector] = useState("")
    const [message, setMessage] = useState("")
    const pilot = topic === JAWAF_PILOT_TOPIC
    const [errors, setErrors] = useState<Errors>({})
    const [sent, setSent] = useState(false)
    const [pending, startTransition] = useTransition()

    function onSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const form = new FormData(e.currentTarget)
        const text = (k: string) => String(form.get(k) ?? "")
        const input: ContactInput = {
            name: text("name"),
            email: text("email"),
            topic: topic as ContactTopic,
            message,
            website: text("website"),
            ...(pilot
                ? {
                      businessName: text("businessName"),
                      businessWebsite: text("businessWebsite"),
                      businessType: businessType || undefined,
                      city,
                      sector,
                      phone: text("phone"),
                  }
                : {}),
        }
        const parsed = contactSchema.safeParse(input)
        if (!parsed.success) {
            const next: Errors = {}
            for (const issue of parsed.error.issues) {
                const key = issue.path[0]
                if (isField(key) && !next[key]) next[key] = issue.message
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
            const next: Errors = { form: res.error }
            for (const k of FIELDS) if (fe[k]) next[k] = fe[k]
            setErrors(next)
        })
    }

    if (sent) {
        return (
            <div role="status" className="rounded-3xl border border-boli-line bg-white p-8 text-center font-sans">
                <CheckCircle2 className="mx-auto h-8 w-8 text-boli-sky-ink" strokeWidth={1.5} aria-hidden />
                <p className="mt-4 text-3xl leading-tight text-boli-ink" style={DISPLAY.h3}>
                    Dhanyabad. Message received.
                </p>
                <p className="mt-2 text-sm text-boli-text">
                    {pilot ? "We will build a demo bot from your website and send you the link to try it." : "We read every message and reply by email."}
                </p>
            </div>
        )
    }

    return (
        <form onSubmit={onSubmit} noValidate className="relative space-y-5 rounded-3xl border border-boli-line bg-white p-5 font-sans sm:p-8">
            {/* A selector, not a wall of pills (owner, 2026-11-25): each topic keeps its one-line hint. */}
            <Field id="contact-topic" label="What is it about?" error={errors.topic}>
                <ComboSelect
                    id="contact-topic"
                    value={topic}
                    onValueChange={(v) => setTopic(v as typeof topic)}
                    options={TOPIC_OPTIONS}
                    placeholder="Choose a topic"
                    searchPlaceholder="Search topics"
                    emptyMessage="No topic matches"
                    className="bg-white"
                    aria-invalid={!!errors.topic}
                    aria-describedby={errors.topic ? "contact-topic-error" : undefined}
                />
            </Field>
            {pilot ? (
                <PilotFields
                    errors={errors}
                    businessType={businessType}
                    onBusinessType={setBusinessType}
                    city={city}
                    onCity={setCity}
                    sector={sector}
                    onSector={setSector}
                />
            ) : null}
            <div className="grid gap-5 sm:grid-cols-2">
                <Field id="contact-name" label="Name" error={errors.name}>
                    <Input id="contact-name" name="name" autoComplete="name" required aria-invalid={!!errors.name} aria-describedby={errors.name ? "contact-name-error" : undefined} />
                </Field>
                <Field id="contact-email" label="Email" error={errors.email}>
                    <Input id="contact-email" name="email" type="email" autoComplete="email" required aria-invalid={!!errors.email} aria-describedby={errors.email ? "contact-email-error" : undefined} />
                </Field>
            </div>

            <Field id="contact-message" label={pilot ? "What should the bot answer?" : "Message"} error={errors.message} hint={`${message.length.toLocaleString()} / ${CONTACT_MESSAGE_MAX.toLocaleString()}`}>
                <Textarea
                    id="contact-message"
                    name="message"
                    rows={6}
                    value={message}
                    maxLength={CONTACT_MESSAGE_MAX}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={pilot ? "The questions customers ask you most - fees, timings, prices, delivery - and anything we should know." : undefined}
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

/**
 * The Jawaf pilot's extra fields: what a demo bot needs. Business name, kind and city are required; website and phone
 * are optional (a website makes the demo better, a phone makes the reply faster).
 */
function PilotFields({ errors, businessType, onBusinessType, city, onCity, sector, onSector }: {
    errors: Errors
    businessType: JawafBusinessType | ""
    onBusinessType: (t: JawafBusinessType) => void
    city: string
    onCity: (v: string) => void
    sector: string
    onSector: (v: string) => void
}) {
    const invalid = (k: FieldKey) => ({ "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `contact-${k}-error` : undefined })
    return (
        <section aria-labelledby="contact-pilot-title" className="space-y-5 rounded-2xl border border-boli-line bg-boli-ground p-4 sm:p-5">
            <div>
                <p id="contact-pilot-title" className="text-[22px] leading-tight text-boli-ink" style={DISPLAY.card}>
                    For your demo bot
                </p>
                <p className="mt-1 text-sm text-boli-text">We build a demo from your website, free, and send you the link to try.</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
                <Field id="contact-businessName" label="Business name" error={errors.businessName}>
                    <Input id="contact-businessName" name="businessName" autoComplete="organization" maxLength={CONTACT_BUSINESS_MAX} required className="bg-white" {...invalid("businessName")} />
                </Field>
                <Field id="contact-businessWebsite" label="Website" hint="Optional" error={errors.businessWebsite}>
                    <Input
                        id="contact-businessWebsite"
                        name="businessWebsite"
                        type="url"
                        inputMode="url"
                        autoComplete="url"
                        placeholder="example.com.np"
                        maxLength={CONTACT_WEBSITE_MAX}
                        className="bg-white"
                        {...invalid("businessWebsite")}
                    />
                </Field>
            </div>
            <Field id="contact-businessType" label="What kind of business?" error={errors.businessType}>
                <ComboSelect
                    id="contact-businessType"
                    value={businessType}
                    onValueChange={(v) => onBusinessType(v as JawafBusinessType)}
                    options={BUSINESS_TYPE_OPTIONS}
                    placeholder="Choose the kind of business"
                    searchPlaceholder="Search"
                    emptyMessage="No match"
                    className="bg-white"
                    {...invalid("businessType")}
                />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
                <Field id="contact-city" label="City" error={errors.city}>
                    <ComboSelect
                        id="contact-city"
                        value={city}
                        onValueChange={onCity}
                        options={CITY_OPTIONS}
                        allowOther
                        otherMaxLength={CONTACT_CITY_MAX}
                        placeholder="Choose your city"
                        searchPlaceholder="Search cities or districts"
                        emptyMessage="No city matches"
                        otherPlaceholder="Your town and district"
                        className="bg-white"
                        {...invalid("city")}
                    />
                </Field>
                <Field id="contact-sector" label="Sector" hint="Optional" error={errors.sector}>
                    <ComboSelect
                        id="contact-sector"
                        value={sector}
                        onValueChange={onSector}
                        options={SECTOR_OPTIONS}
                        allowOther
                        otherMaxLength={CONTACT_SECTOR_MAX}
                        placeholder="Choose a sector"
                        searchPlaceholder="Search sectors"
                        emptyMessage="No sector matches"
                        otherPlaceholder="What your business does"
                        className="bg-white"
                        {...invalid("sector")}
                    />
                </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
                <Field id="contact-phone" label="Phone" hint="Optional, helps us reach you faster" error={errors.phone}>
                    <Input id="contact-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="98XXXXXXXX" maxLength={20} className="bg-white" {...invalid("phone")} />
                </Field>
            </div>
        </section>
    )
}

/** A radio group of pills: arrow keys move between them, the chosen one is ink. Used for the topic and the business kind. */
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
