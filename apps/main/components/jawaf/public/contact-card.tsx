"use client"

import { useState } from "react"
import { Check, MessageCircle, Phone, Mail } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { DatePicker } from "@repo/ui/components/ui/date-picker"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/ui/select"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { cn } from "@repo/ui/lib/utils"
import { checkContactFields } from "@/schemas/jawaf-public"
import type { JawafPublicCard, JawafPublicContactField } from "@/types/jawaf-public"

/**
 * The contact card under a not-found reply: the fields the owner picked (name + Nepal mobile by default), posted to
 * /j/<slug>/api/contact. Validated here and again on the server (schemas/jawaf-public.ts). A hidden honeypot field
 * catches form bots. Once saved it collapses to one line for the rest of the conversation.
 */

export const ACCENT_BUTTON = "bg-[var(--jawaf-accent)] text-[var(--jawaf-accent-ink)] hover:bg-[var(--jawaf-accent)] hover:opacity-90"

export function ContactCard({
    fields,
    business,
    endpoint,
    conversationId,
    src,
    interest,
    saved,
    onSaved,
}: {
    fields: JawafPublicContactField[]
    business: string
    endpoint: string
    conversationId: string | null
    src: "link" | "qr"
    /** The question that went unanswered (prefills "What are you interested in?"). */
    interest: string
    saved: boolean
    onSaved: () => void
}) {
    const [values, setValues] = useState<Record<string, string>>((): Record<string, string> => (fields.some((f) => f.type === "interest") && interest ? { interest } : {}))
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [formError, setFormError] = useState<string | null>(null)
    const [pending, setPending] = useState(false)
    const [honey, setHoney] = useState("")

    if (saved) {
        return (
            <p className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
                <Check aria-hidden className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                Thanks - {business} has your details and will get back to you.
            </p>
        )
    }

    const set = (id: string, v: string) => {
        setValues((o) => ({ ...o, [id]: v }))
        if (errors[id]) setErrors((e) => ({ ...e, [id]: "" }))
    }

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        const errs = checkContactFields(fields, values)
        setErrors(errs)
        if (Object.values(errs).some(Boolean)) return
        setPending(true)
        setFormError(null)
        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ conversationId, fields: values, website: honey, src }),
            })
            const json = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null
            if (!res.ok || !json?.success) throw new Error(json?.error || "Your details could not be sent. Try again.")
            onSaved()
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "Your details could not be sent. Try again.")
        } finally {
            setPending(false)
        }
    }

    return (
        <form onSubmit={submit} noValidate className="relative flex min-w-0 flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="min-w-0">
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Leave your details</p>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">{business} will call you back with the answer.</p>
            </div>
            {/* Honeypot: hidden from people and screen readers; a form bot fills it. */}
            <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <Input tabIndex={-1} autoComplete="off" name="website" value={honey} onChange={(e) => setHoney(e.target.value)} />
            </div>
            {fields.map((f) => {
                const id = `jc-${f.id}`
                const err = errors[f.id]
                const v = values[f.id] ?? ""
                return (
                    <div key={f.id} className="flex min-w-0 flex-col gap-1.5">
                        <Label htmlFor={id} className="text-xs text-neutral-700 dark:text-neutral-300">
                            {f.label}
                            {f.required ? null : <span className="font-normal text-neutral-500"> (optional)</span>}
                        </Label>
                        {f.type === "interest" ? (
                            <Textarea id={id} rows={2} maxLength={500} value={v} onChange={(e) => set(f.id, e.target.value)} className="min-h-[60px] text-sm [field-sizing:content]" aria-invalid={!!err} />
                        ) : f.type === "select" || f.type === "preferredTime" ? (
                            <Select value={v} onValueChange={(x) => set(f.id, x)}>
                                <SelectTrigger id={id} className="h-10 text-sm" aria-invalid={!!err}>
                                    <SelectValue placeholder="Choose one" />
                                </SelectTrigger>
                                <SelectContent emptyMessage="No options yet">
                                    {f.options.map((o) => (
                                        <SelectItem key={o} value={o}>{o}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : f.type === "date" ? (
                            <DatePicker value={v} onChange={(x) => set(f.id, x)} />
                        ) : (
                            <Input
                                id={id}
                                value={v}
                                onChange={(e) => set(f.id, e.target.value)}
                                aria-invalid={!!err}
                                className="h-10 text-sm"
                                maxLength={f.type === "name" ? 80 : 200}
                                {...(f.type === "phone" ? { inputMode: "tel" as const, autoComplete: "tel", placeholder: "98XXXXXXXX" } : {})}
                                {...(f.type === "email" ? { inputMode: "email" as const, autoComplete: "email", placeholder: "name@example.com" } : {})}
                                {...(f.type === "name" ? { autoComplete: "name" } : {})}
                                {...(f.type === "number" ? { inputMode: "decimal" as const } : {})}
                            />
                        )}
                        {err ? <p className="text-xs text-red-700 dark:text-red-400">{err}</p> : null}
                    </div>
                )
            })}
            {formError ? <p className="text-xs text-red-700 dark:text-red-400">{formError}</p> : null}
            <Button type="submit" disabled={pending} className={cn("h-10 w-full cursor-pointer gap-2", ACCENT_BUTTON)}>
                {pending ? <InlineLoader size={14} label="Sending" /> : null}
                {pending ? "Sending" : "Send my details"}
            </Button>
        </form>
    )
}

/** Out of answers for now (the business's credits - never said): reach the business directly. */
export function ReachUsCard({ business, card, title, line }: { business: string; card: JawafPublicCard; title: string; line: string }) {
    const phone = card.phones[0]
    const email = card.emails[0]
    return (
        <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="min-w-0">
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</p>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">{line}</p>
            </div>
            <div className="flex flex-wrap gap-2">
                {phone ? (
                    <Button asChild className={cn("h-10 cursor-pointer gap-2", ACCENT_BUTTON)}>
                        <a href={`tel:${phone.replace(/[^\d+]/g, "")}`}><Phone aria-hidden className="size-4" /> Call {phone}</a>
                    </Button>
                ) : null}
                {card.whatsapp ? (
                    <Button asChild variant="outline" className="h-10 cursor-pointer gap-2">
                        <a href={`https://wa.me/${card.whatsapp}`} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden className="size-4" /> WhatsApp</a>
                    </Button>
                ) : null}
                {email ? (
                    <Button asChild variant="outline" className="h-10 cursor-pointer gap-2">
                        <a href={`mailto:${email}`}><Mail aria-hidden className="size-4" /> {email}</a>
                    </Button>
                ) : null}
                {!phone && !card.whatsapp && !email && card.website ? (
                    <Button asChild variant="outline" className="h-10 cursor-pointer gap-2">
                        <a href={card.website} target="_blank" rel="noopener noreferrer">Visit {business}&apos;s website</a>
                    </Button>
                ) : null}
            </div>
        </div>
    )
}
