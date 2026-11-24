"use client"

import * as React from "react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { cn } from "@repo/ui/lib/utils"
import { InlineLoader } from "@repo/brand/loaders/spinners"
import {
    JAWAF_BUSINESS_TYPE_INFO, JAWAF_BUSINESS_TYPES, JAWAF_LENGTH_LABELS, JAWAF_LENGTHS, JAWAF_LIMITS, JAWAF_SLUG_PATTERN, JAWAF_TONE_LABELS, JAWAF_TONES,
    type JawafBusinessType, type JawafLength, type JawafTone,
} from "@repo/boli/jawaf"
import { ChipsInput } from "@/components/jawaf/chips-input"
import { JAWAF_CARD } from "@/components/jawaf/keys"
import { PillChoice } from "@/components/jawaf/pill-choice"
import { jawafPublicLabel } from "@/components/jawaf/public-link"
import { SlugStatus } from "@/components/jawaf/slug-status"
import type { UpdateJawafBotInput } from "@/schemas/jawaf"
import type { JawafBot } from "@/types/jawaf"
import { useSaveBot } from "./use-save-bot"

interface Draft {
    name: string
    slug: string
    businessType: JawafBusinessType
    website: string
    tone: JawafTone
    length: JawafLength
    instructions: string
    greeting: string
    suggestedQuestions: string[]
}

const fromBot = (b: JawafBot): Draft => ({
    name: b.name, slug: b.slug, businessType: b.businessType, website: b.website ?? "", tone: b.tone, length: b.length,
    instructions: b.instructions, greeting: b.greeting, suggestedQuestions: b.suggestedQuestions,
})

/** Only the fields that changed (the action takes a partial). */
function patchOf(d: Draft, b: JawafBot): Omit<UpdateJawafBotInput, "botId"> {
    const p: Omit<UpdateJawafBotInput, "botId"> = {}
    if (d.name.trim() !== b.name) p.name = d.name.trim()
    if (d.slug !== b.slug) p.slug = d.slug
    if (d.businessType !== b.businessType) p.businessType = d.businessType
    if ((d.website.trim() || null) !== b.website) p.website = d.website.trim() || null
    if (d.tone !== b.tone) p.tone = d.tone
    if (d.length !== b.length) p.length = d.length
    if (d.instructions.trim() !== b.instructions) p.instructions = d.instructions.trim()
    if (d.greeting.trim() !== b.greeting) p.greeting = d.greeting.trim()
    if (JSON.stringify(d.suggestedQuestions) !== JSON.stringify(b.suggestedQuestions)) p.suggestedQuestions = d.suggestedQuestions
    return p
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
    return (
        <section className={cn(JAWAF_CARD, "flex flex-col gap-4 p-4 sm:p-5")}>
            <div>
                <h2 className="text-base font-semibold text-neutral-900 dark:text-white">{title}</h2>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">{description}</p>
            </div>
            {children}
        </section>
    )
}

/** Bot: name, link, business type, website, tone, length, own instructions, greeting and suggested questions. */
export function BotTab({ bot, canManage }: { bot: JawafBot; canManage: boolean }) {
    const [d, setD] = React.useState<Draft>(() => fromBot(bot))
    const save = useSaveBot(bot.id)
    const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((prev) => ({ ...prev, [k]: v }))
    // A save returns the stored bot: take it as the new starting point.
    React.useEffect(() => { setD(fromBot(bot)) }, [bot])

    const patch = patchOf(d, bot)
    const dirty = Object.keys(patch).length > 0
    const valid = d.name.trim().length > 0 && JAWAF_SLUG_PATTERN.test(d.slug)
    const off = !canManage

    return (
        <form className="flex min-w-0 flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (dirty && valid && !save.isPending) save.mutate(patch) }}>
            <Section title="Name and link" description="What visitors see at the top of the chat, and the address you share.">
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="bot-name">Business name</Label>
                    <Input id="bot-name" value={d.name} onChange={(e) => set("name", e.target.value)} maxLength={80} disabled={off} className="h-9 text-sm" />
                </div>
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="bot-slug">Public link</Label>
                    <div className="flex min-w-0 items-center gap-2">
                        <span className="hidden shrink-0 text-sm text-neutral-600 sm:inline dark:text-neutral-400">{jawafPublicLabel("")}</span>
                        <Input id="bot-slug" value={d.slug} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} maxLength={40} disabled={off} className="h-9 min-w-0 flex-1 font-mono text-sm" />
                    </div>
                    <SlugStatus slug={d.slug} current={bot.slug} botId={bot.id} onUse={(s) => set("slug", s)} />
                    {d.slug !== bot.slug ? <p className="text-xs text-neutral-600 dark:text-neutral-400">The old link stops working. Update any QR codes you printed.</p> : null}
                </div>
                <div className="flex flex-col gap-2">
                    <Label>Type of business</Label>
                    <PillChoice label="Type of business" disabled={off} options={JAWAF_BUSINESS_TYPES.map((t) => ({ value: t, label: JAWAF_BUSINESS_TYPE_INFO[t].label, hint: JAWAF_BUSINESS_TYPE_INFO[t].example }))} value={d.businessType} onChange={(v) => set("businessType", v)} />
                </div>
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="bot-website">Website</Label>
                    <Input id="bot-website" value={d.website} onChange={(e) => set("website", e.target.value)} maxLength={2000} inputMode="url" placeholder="example.com.np" disabled={off} className="h-9 text-sm" />
                </div>
            </Section>

            <Section title="How it talks" description="Tone and length apply to every answer. Your own instructions are added to them.">
                <div className="flex flex-col gap-2">
                    <Label>Tone</Label>
                    <PillChoice label="Tone" disabled={off} options={JAWAF_TONES.map((t) => ({ value: t, label: JAWAF_TONE_LABELS[t] }))} value={d.tone} onChange={(v) => set("tone", v)} />
                </div>
                <div className="flex flex-col gap-2">
                    <Label>Answer length</Label>
                    <PillChoice label="Answer length" disabled={off} options={JAWAF_LENGTHS.map((l) => ({ value: l, label: JAWAF_LENGTH_LABELS[l] }))} value={d.length} onChange={(v) => set("length", v)} />
                </div>
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="bot-instructions">Your own instructions</Label>
                    <Textarea id="bot-instructions" value={d.instructions} onChange={(e) => set("instructions", e.target.value)} maxLength={2000} rows={4} disabled={off} placeholder="Always invite people to visit the office on Saturdays." className="min-h-24 text-sm [field-sizing:content]" />
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">{d.instructions.length} / 2,000. Jawaf still answers only from your knowledge - instructions shape how, not what.</p>
                </div>
            </Section>

            <Section title="First message" description="The greeting and the questions shown before a visitor types.">
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="bot-greeting">Greeting</Label>
                    <Textarea id="bot-greeting" value={d.greeting} onChange={(e) => set("greeting", e.target.value)} maxLength={300} rows={2} disabled={off} className="min-h-16 text-sm [field-sizing:content]" />
                </div>
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="bot-suggested">Suggested questions</Label>
                    <ChipsInput id="bot-suggested" value={d.suggestedQuestions} onChange={(v) => set("suggestedQuestions", v)} max={JAWAF_LIMITS.suggestedQuestions} maxLength={120} placeholder="Type a question, press Enter" disabled={off} />
                </div>
            </Section>

            {canManage ? (
                <div className="flex items-center justify-end gap-2">
                    {dirty ? <Button type="button" variant="ghost" className="cursor-pointer" onClick={() => setD(fromBot(bot))}>Discard changes</Button> : null}
                    <Button type="submit" className="cursor-pointer gap-2" disabled={!dirty || !valid || save.isPending}>
                        {save.isPending ? <InlineLoader size={14} label="Saving" /> : null} Save changes
                    </Button>
                </div>
            ) : null}
        </form>
    )
}
