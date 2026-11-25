"use client"

import * as React from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Copy, ExternalLink, KeyRound, Mail, MessageSquareText, Wrench } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { ConfirmPopover } from "@repo/ui/components/ui/confirm-popover"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { InlineNote } from "@repo/ui/components/ui/inline-note"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { toast } from "@repo/ui/components/ui/toast"
import { openInJawafUrl } from "@/actions/jawaf/demos.action"
import { generateJawafClaim, sendJawafClaimEmail } from "@/actions/jawaf/claims.action"
import { ROUTES } from "@/lib/navigation"
import type { BotBrief, ProspectRow } from "@/types/jawaf"
import { BotState, ClaimChip, copyText, demoMessage, Field, fmtDate, fmtInt, fmtRate, JAWAF_KEYS, SectionTitle } from "../../_components/jawaf-bits"

/**
 * The demo's bot in its sheet: status, the public link, Open in Jawaf (the app, switched to Boli Demos and this bot),
 * Copy demo message, Generate claim link (shown ONCE - only its hash is stored), Send claim email. The bot's tools
 * (pause, limits, health, quality check) live on All bots; a link goes there.
 */
export function DemoBotPanel({ prospect, bot, mainUrl, canWrite }: { prospect: ProspectRow; bot: BotBrief; mainUrl: string; canWrite: boolean }) {
    const queryClient = useQueryClient()
    const publicUrl = `${mainUrl}/j/${bot.slug}`
    const [claim, setClaim] = React.useState<{ token: string; url: string; expiresAt: string } | null>(null)
    const [email, setEmail] = React.useState(prospect.email ?? "")

    const openJawaf = useMutation({
        mutationFn: async () => {
            const r = await openInJawafUrl(bot.id)
            if (!r.success) throw new Error(r.error ?? "Could not open Jawaf")
            return r.data.url
        },
        onSuccess: (url) => { window.open(url, "_blank", "noopener") },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not open Jawaf"),
    })

    const generate = useMutation({
        mutationFn: async () => {
            const r = await generateJawafClaim({ botId: bot.id, prospectId: prospect.id })
            if (!r.success) throw new Error(r.error ?? "The link could not be made")
            return r.data
        },
        onSuccess: async (c) => {
            setClaim({ token: c.token, url: c.url, expiresAt: c.expiresAt })
            await copyText(c.url, "Claim link made and copied")
            await queryClient.invalidateQueries({ queryKey: JAWAF_KEYS.all })
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "The link could not be made"),
    })

    const send = useMutation({
        mutationFn: async () => {
            const r = await sendJawafClaimEmail({ botId: bot.id, prospectId: prospect.id, email, token: claim?.token })
            if (!r.success) throw new Error(r.error ?? "The email was not sent")
            return r.data
        },
        onSuccess: async (r) => {
            toast.success(`Claim email sent to ${r.sentTo}`)
            await queryClient.invalidateQueries({ queryKey: JAWAF_KEYS.all })
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "The email was not sent"),
    })

    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

    return (
        <section className="flex min-w-0 flex-col gap-3">
            <SectionTitle action={(
                <Button asChild size="sm" variant="ghost" className="cursor-pointer gap-1.5 rounded-xl">
                    <AppLink href={`${ROUTES.jawafBots}?bot=${encodeURIComponent(bot.id)}`}><Wrench className="h-3.5 w-3.5" /> Bot tools</AppLink>
                </Button>
            )}>The bot</SectionTitle>
            <dl className="flex min-w-0 flex-col divide-y divide-neutral-200 dark:divide-neutral-800">
                <Field label="Name">{bot.name}</Field>
                <Field label="Status"><BotState bot={bot} /></Field>
                <Field label="Public page"><a href={publicUrl} target="_blank" rel="noopener noreferrer" className="break-all text-boli-sky-ink hover:underline">{publicUrl.replace(/^https?:\/\//, "")}</a></Field>
                <Field label="Questions on the link">{fmtInt(prospect.numbers.questions)}</Field>
                <Field label="Answered">{fmtRate(prospect.numbers.answerRate)}</Field>
                <Field label="Last visit">{prospect.numbers.lastVisitAt ? fmtDate(prospect.numbers.lastVisitAt, true) : "No visits yet"}</Field>
                <Field label="Claim"><ClaimChip status={prospect.claim} /></Field>
            </dl>
            <div className="flex min-w-0 flex-wrap gap-2">
                {canWrite ? (
                    <Button type="button" size="sm" variant="outline" className="cursor-pointer gap-1.5 rounded-xl" disabled={openJawaf.isPending} onClick={() => openJawaf.mutate()}>
                        {openJawaf.isPending ? <InlineLoader size={14} label="Opening" /> : <ExternalLink className="h-3.5 w-3.5" />} Open in Jawaf
                    </Button>
                ) : null}
                <Button type="button" size="sm" variant="outline" className="cursor-pointer gap-1.5 rounded-xl"
                    onClick={() => void copyText(demoMessage({ business: prospect.business, contactName: prospect.contactName, botUrl: publicUrl, claimUrl: claim?.url ?? null }), "Demo message copied")}>
                    <MessageSquareText className="h-3.5 w-3.5" /> Copy demo message
                </Button>
                <Button type="button" size="sm" variant="outline" className="cursor-pointer gap-1.5 rounded-xl" onClick={() => void copyText(publicUrl, "Link copied")}>
                    <Copy className="h-3.5 w-3.5" /> Copy link
                </Button>
            </div>

            {canWrite && prospect.claim !== "claimed" ? (
                <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                    {claim ? (
                        <div className="flex min-w-0 flex-col gap-1.5">
                            <Label>Claim link (shown once)</Label>
                            <div className="flex min-w-0 gap-2">
                                <Input readOnly value={claim.url} className="h-9 min-w-0 flex-1 rounded-xl font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
                                <Button type="button" size="sm" variant="outline" className="cursor-pointer gap-1.5 rounded-xl" onClick={() => void copyText(claim.url, "Claim link copied")}>
                                    <Copy className="h-3.5 w-3.5" /> Copy
                                </Button>
                            </div>
                            <p className="text-xs text-neutral-600 dark:text-neutral-400">Works until {fmtDate(claim.expiresAt)}, once. Copy demo message now includes it.</p>
                        </div>
                    ) : (
                        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                            <p className="min-w-0 text-sm text-neutral-700 dark:text-neutral-300">A one-time link that moves this bot into the business's own account.</p>
                            <ConfirmPopover
                                title="Make a new claim link?"
                                description="Any older open link for this bot stops working. The link is shown once."
                                confirmLabel="Make link"
                                destructive={false}
                                onConfirm={() => generate.mutateAsync().then(() => undefined)}
                            >
                                <Button type="button" size="sm" className="cursor-pointer gap-1.5 rounded-xl" disabled={generate.isPending}>
                                    {generate.isPending ? <InlineLoader size={14} label="Making" /> : <KeyRound className="h-3.5 w-3.5" />} Generate claim link
                                </Button>
                            </ConfirmPopover>
                        </div>
                    )}
                    <div className="flex min-w-0 flex-col gap-1.5">
                        <Label htmlFor="claim-email">Send it by email</Label>
                        <div className="flex min-w-0 gap-2">
                            <Input id="claim-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="owner@business.com" className="h-9 min-w-0 flex-1 rounded-xl" />
                            <ConfirmPopover
                                title={`Send the claim email to ${email.trim() || "this address"}?`}
                                description={claim ? "Nepali and English, with the link above. Replies go to the demo's owner." : "A fresh link is made (older ones stop working). Nepali and English; replies go to the demo's owner."}
                                confirmLabel="Send"
                                destructive={false}
                                side="top"
                                disabled={!validEmail || send.isPending}
                                onConfirm={() => send.mutateAsync().then(() => undefined)}
                            >
                                <Button type="button" size="sm" variant="outline" className="cursor-pointer gap-1.5 rounded-xl" disabled={!validEmail || send.isPending}>
                                    {send.isPending ? <InlineLoader size={14} label="Sending" /> : <Mail className="h-3.5 w-3.5" />} Send
                                </Button>
                            </ConfirmPopover>
                        </div>
                    </div>
                </div>
            ) : prospect.claim === "claimed" ? (
                <InlineNote>This bot was claimed. It now belongs to the business; its conversations are theirs.</InlineNote>
            ) : null}
        </section>
    )
}
