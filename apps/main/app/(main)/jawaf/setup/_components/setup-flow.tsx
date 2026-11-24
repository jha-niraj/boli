"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { FlowSteps } from "@repo/ui/components/ui/flow-steps"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { Page } from "@repo/ui/components/ui/page"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { toast } from "@repo/ui/components/ui/toast"
import { InlineLoader } from "@repo/brand/loaders/spinners"
import { DISPLAY } from "@repo/brand/type"
import {
    JAWAF_BUSINESS_TYPE_INFO, JAWAF_BUSINESS_TYPES, JAWAF_LENGTH_LABELS, JAWAF_LENGTHS, JAWAF_SLUG_PATTERN, JAWAF_TONE_LABELS, JAWAF_TONES,
    type JawafBusinessType, type JawafLength, type JawafTone,
} from "@repo/boli/jawaf"
import { createJawafBot, updateJawafBot } from "@/actions/jawaf/bots.action"
import { JAWAF_KEYS, unwrap } from "@/components/jawaf/keys"
import { PillChoice } from "@/components/jawaf/pill-choice"
import { SlugStatus } from "@/components/jawaf/slug-status"
import { jawafPublicLabel } from "@/components/jawaf/public-link"
import { greetingFor, WidgetPreview } from "@/components/jawaf/widget-preview"
import { setCurrentJawafBot } from "@/lib/jawaf/bot-cookie"
import { slugify } from "@/lib/jawaf/text"
import { ROUTES } from "@/lib/navigation"
import type { JawafBotSummary, JawafFactSection, JawafJobView, JawafPageView, JawafQa } from "@/types/jawaf"
import { JAWAF_PAGES } from "../../_components/jawaf-pages"
import { SetupPages } from "./setup-pages"
import { SetupReading } from "./setup-reading"
import { SetupReview } from "./setup-review"

export type SetupStepId = "details" | "tone" | "pages" | "reading" | "review"
const STEPS: { id: SetupStepId; label: string }[] = [
    { id: "details", label: "Your business" },
    { id: "tone", label: "How it talks" },
    { id: "pages", label: "Pick pages" },
    { id: "reading", label: "Read" },
    { id: "review", label: "Review" },
]

/** What the bot should focus on, per business type - a starting text the owner edits (saved as the bot's instructions). */
const FOCUS_TEMPLATE: Record<JawafBusinessType, string> = {
    education: "Help students and parents with courses, fees, admission dates, scholarships and how to apply. Invite them to visit or call the counsellor for anything not listed.",
    clinic: "Help patients with services, doctors and their days, OPD hours, appointments and reports. Never give medical advice; ask them to call or visit for anything about their health.",
    shop: "Help customers with products, prices, stock, delivery areas and times, payment methods and returns. Point them to the shop's phone for orders.",
    hotel: "Help guests with rooms and rates, check-in and check-out, airport pickup, packages and how to book.",
    real_estate: "Help buyers with projects, locations, sizes, prices, bank loans and site visits. Offer a call back for serious enquiries.",
    other: "Help customers with what we offer, prices, hours, location and how to reach us.",
}

/**
 * Onboarding (/jawaf/setup), five steps on one page: business details and tone with a live preview of the chat page
 * beside the form; then (once the bot exists) pick pages, live reading progress and Review what we found -> Go live.
 * "Skip for now" goes to Jawaf Home, which keeps a setup banner until it is done.
 */
export function SetupFlow({ initialStep, bot: initialBot, initialPages, initialJob, initialFacts, initialQa, canManage, hasBots }: {
    initialStep: SetupStepId
    bot: JawafBotSummary | null
    initialPages: JawafPageView[]
    initialJob: JawafJobView | null
    initialFacts: JawafFactSection[]
    initialQa: JawafQa[]
    canManage: boolean
    hasBots: boolean
}) {
    const router = useRouter()
    const queryClient = useQueryClient()
    const [step, setStep] = React.useState<SetupStepId>(initialStep)
    const [bot, setBot] = React.useState<JawafBotSummary | null>(initialBot)
    const [job, setJob] = React.useState<JawafJobView | null>(initialJob)

    // Step 1 + 2 form.
    const [businessType, setBusinessType] = React.useState<JawafBusinessType>("education")
    const [businessName, setBusinessName] = React.useState("")
    const [botName, setBotName] = React.useState("")
    const [slug, setSlug] = React.useState("")
    const [slugTouched, setSlugTouched] = React.useState(false)
    const [website, setWebsite] = React.useState("")
    const [tone, setTone] = React.useState<JawafTone>("friendly")
    const [length, setLength] = React.useState<JawafLength>("balanced")
    const [focus, setFocus] = React.useState(FOCUS_TEMPLATE.education)
    const [focusTouched, setFocusTouched] = React.useState(false)

    const onType = (t: JawafBusinessType) => {
        setBusinessType(t)
        if (!focusTouched) setFocus(FOCUS_TEMPLATE[t])
    }
    const onName = (v: string) => {
        setBusinessName(v)
        if (!slugTouched) setSlug(slugify(v))
    }

    const create = useMutation({
        mutationFn: async () => {
            const created = unwrap(await createJawafBot({
                businessType, name: businessName.trim(), website: website.trim() || null, tone, length, slug: JAWAF_SLUG_PATTERN.test(slug) ? slug : null,
            }), "Your bot could not be created.")
            // The greeting (with the bot's own name) and the focus are saved on the bot right after.
            const updated = await updateJawafBot({ botId: created.id, greeting: greetingFor(businessName, botName), instructions: focus.trim() })
            if (!updated.success) toast.error("Saved the bot, but not its greeting. Change it in Settings.")
            return created
        },
        onSuccess: async (created) => {
            setCurrentJawafBot(created.id)
            setBot(created)
            await queryClient.invalidateQueries({ queryKey: JAWAF_KEYS.switcher })
            if (created.slug !== slug && slug) toast.success("Bot created", { description: `Your link is ${jawafPublicLabel(created.slug)} - the name you picked was just taken.` })
            setStep(created.website ? "pages" : "review")
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Your bot could not be created."),
    })

    const detailsValid = businessName.trim().length > 0 && (!slug || JAWAF_SLUG_PATTERN.test(slug))
    const index = STEPS.findIndex((s) => s.id === step)
    const formStep = step === "details" || step === "tone"
    const copy = JAWAF_PAGES.setup

    return (
        <Page
            title={copy.title}
            width="full"
            // One header row (owner, 2026-11-25): title, the steps, Skip for now - no description line. Below lg the
            // steps drop under the header, where there is room for them.
            extra={<div className="hidden w-[44rem] max-w-[58vw] min-w-0 pr-4 lg:block"><FlowSteps steps={STEPS.map((s) => s.label)} current={index} size="sm" /></div>}
            actions={[{ key: "skip", label: "Skip for now", href: ROUTES.jawaf, variant: "ghost" }]}
        >
            <div className="flex w-full min-w-0 max-w-6xl flex-col gap-6 pb-10 pt-2">
                <div className="lg:hidden"><FlowSteps steps={STEPS.map((s) => s.label)} current={index} size="sm" /></div>

                {!canManage && !bot ? (
                    <p className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
                        Only someone with Settings access to Jawaf can create a bot in this workspace. Ask the workspace owner.
                    </p>
                ) : formStep ? (
                    <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
                        <form
                            className="flex min-w-0 flex-col gap-6"
                            onSubmit={(e) => {
                                e.preventDefault()
                                if (step === "details" && detailsValid) setStep("tone")
                                else if (step === "tone" && !create.isPending) create.mutate()
                            }}
                        >
                            <div className="flex flex-col gap-2">
                                <h2 className="text-3xl text-neutral-900 sm:text-4xl dark:text-white" style={DISPLAY.h3}>
                                    {step === "details" ? "Tell us about your business" : "How should it talk?"}
                                </h2>
                                <p className="max-w-[60ch] text-sm text-neutral-600 dark:text-neutral-400">
                                    {step === "details"
                                        ? "Jawaf answers your customers in Nepali, Romanized Nepali and English - from your website, files and the facts you approve."
                                        : "Pick a tone and how long answers should be. You can change all of this later in Settings."}
                                </p>
                            </div>

                            {step === "details" ? (
                                <>
                                    <div className="flex flex-col gap-2">
                                        <Label>Type of business</Label>
                                        <PillChoice
                                            label="Type of business"
                                            options={JAWAF_BUSINESS_TYPES.map((t) => ({ value: t, label: JAWAF_BUSINESS_TYPE_INFO[t].label, hint: JAWAF_BUSINESS_TYPE_INFO[t].example }))}
                                            value={businessType}
                                            onChange={onType}
                                        />
                                        <p className="text-xs text-neutral-600 dark:text-neutral-400">{JAWAF_BUSINESS_TYPE_INFO[businessType].example}</p>
                                    </div>
                                    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                                        <div className="flex min-w-0 flex-col gap-1.5">
                                            <Label htmlFor="setup-name">Business name</Label>
                                            <Input id="setup-name" value={businessName} onChange={(e) => onName(e.target.value)} maxLength={80} placeholder="Himalayan Education Consultancy" className="h-9 text-sm" autoFocus />
                                        </div>
                                        <div className="flex min-w-0 flex-col gap-1.5">
                                            <Label htmlFor="setup-bot">Bot name <span className="font-normal text-neutral-500">(optional)</span></Label>
                                            <Input id="setup-bot" value={botName} onChange={(e) => setBotName(e.target.value)} maxLength={40} placeholder="Sathi" className="h-9 text-sm" />
                                        </div>
                                    </div>
                                    <div className="flex min-w-0 flex-col gap-1.5">
                                        <Label htmlFor="setup-slug">Public link</Label>
                                        <div className="flex min-w-0 items-center gap-2">
                                            <span className="hidden shrink-0 text-sm text-neutral-600 sm:inline dark:text-neutral-400">{jawafPublicLabel("")}</span>
                                            <Input
                                                id="setup-slug"
                                                value={slug}
                                                onChange={(e) => { setSlugTouched(true); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")) }}
                                                maxLength={40}
                                                placeholder="your-business"
                                                className="h-9 min-w-0 flex-1 font-mono text-sm"
                                            />
                                        </div>
                                        <SlugStatus slug={slug} onUse={(s) => { setSlugTouched(true); setSlug(s) }} />
                                    </div>
                                    <div className="flex min-w-0 flex-col gap-1.5">
                                        <Label htmlFor="setup-website">Website <span className="font-normal text-neutral-500">(optional)</span></Label>
                                        <Input id="setup-website" value={website} onChange={(e) => setWebsite(e.target.value)} maxLength={2000} inputMode="url" placeholder="example.com.np" className="h-9 text-sm" />
                                        <p className="text-xs text-neutral-600 dark:text-neutral-400">We read the pages you pick. No website? Add your facts and files yourself.</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex flex-col gap-2">
                                        <Label>Tone</Label>
                                        <PillChoice label="Tone" options={JAWAF_TONES.map((t) => ({ value: t, label: JAWAF_TONE_LABELS[t] }))} value={tone} onChange={setTone} />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Label>Answer length</Label>
                                        <PillChoice label="Answer length" options={JAWAF_LENGTHS.map((l) => ({ value: l, label: JAWAF_LENGTH_LABELS[l] }))} value={length} onChange={setLength} />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="setup-focus">What it should focus on</Label>
                                        <Textarea
                                            id="setup-focus"
                                            value={focus}
                                            onChange={(e) => { setFocusTouched(true); setFocus(e.target.value) }}
                                            maxLength={2000}
                                            rows={4}
                                            className="min-h-24 text-sm [field-sizing:content]"
                                        />
                                        <p className="text-xs text-neutral-600 dark:text-neutral-400">A starting point for {JAWAF_BUSINESS_TYPE_INFO[businessType].label.toLowerCase()}. Make it yours.</p>
                                    </div>
                                </>
                            )}

                            <div className="flex flex-wrap items-center gap-2 pt-2">
                                {step === "tone" ? (
                                    <Button type="button" variant="outline" className="cursor-pointer gap-1.5" onClick={() => setStep("details")}>
                                        <ArrowLeft className="h-3.5 w-3.5" /> Back
                                    </Button>
                                ) : null}
                                <Button type="submit" className="cursor-pointer gap-1.5" disabled={step === "details" ? !detailsValid : create.isPending}>
                                    {create.isPending ? <><InlineLoader size={14} label="Creating" /> Creating your bot...</> : step === "details" ? <>Next <ArrowRight className="h-3.5 w-3.5" /></> : <>Create my bot <ArrowRight className="h-3.5 w-3.5" /></>}
                                </Button>
                                {hasBots ? null : <span className="text-xs text-neutral-600 dark:text-neutral-400">Free to set up. Playground answers are always free.</span>}
                            </div>
                        </form>
                        <aside className="min-w-0 lg:sticky lg:top-2 lg:self-start">
                            <p className="mb-2 text-xs font-medium text-boli-sky-ink">Live preview</p>
                            <WidgetPreview businessType={businessType} businessName={businessName} botName={botName} slug={slug} tone={tone} length={length} />
                        </aside>
                    </div>
                ) : bot && step === "pages" ? (
                    <SetupPages bot={bot} initialPages={initialPages} onStarted={(j) => { setJob(j); setStep("reading") }} onSkip={() => setStep("review")} />
                ) : bot && step === "reading" ? (
                    <SetupReading bot={bot} job={job} onDone={() => setStep("review")} />
                ) : bot ? (
                    <SetupReview
                        bot={bot}
                        initialFacts={step === initialStep ? initialFacts : null}
                        initialQa={step === initialStep ? initialQa : null}
                        onLive={() => { router.push(ROUTES.jawaf); router.refresh() }}
                    />
                ) : null}
            </div>
        </Page>
    )
}
