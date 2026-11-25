"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Coins, ExternalLink, Pause, Play, Save, UserRoundCog } from "lucide-react"
import { formatCredits, formatMicroCredits } from "@repo/billing/plans"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { ConfirmDialog } from "@repo/ui/components/ui/confirm-dialog"
import { ConfirmPopover } from "@repo/ui/components/ui/confirm-popover"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@repo/ui/components/ui/sheet"
import { Skeleton } from "@repo/ui/components/ui/skeleton"
import { toast } from "@repo/ui/components/ui/toast"
import { changeJawafBotOwner, getJawafBotRow, grantJawafBotCredits, setJawafBotLimits, setJawafBotPaused } from "@/actions/jawaf/bots.action"
import { ROUTES } from "@/lib/navigation"
import type { BotRow } from "@/types/jawaf"
import { BotState, Field, fmtDate, fmtInt, JAWAF_KEYS, SectionTitle } from "../../_components/jawaf-bits"
import { EvalPanel } from "./eval-panel"
import { HealthPanel } from "./health-panel"

/**
 * One bot in the right sheet (non-modal, swaps on another row): its numbers, health (Re-read now / Retry failed), the
 * quality check, and the tools - pause / resume, limits, credits for its workspace, change owner. Customer bots: numbers
 * only (the health panel's unanswered questions and the quality check's replies are shown for demo bots only).
 */
export function BotSheet({ botId, open, onOpenChange, onExitComplete, mainUrl, canWrite }: {
    botId: string | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onExitComplete: () => void
    mainUrl: string
    canWrite: boolean
}) {
    const row = useQuery({
        queryKey: [...JAWAF_KEYS.bots, botId ?? ""],
        queryFn: async () => {
            const r = await getJawafBotRow(botId!)
            if (!r.success) throw new Error(r.error ?? "Could not load the bot")
            return r.data
        },
        enabled: open && !!botId,
    })
    const b = row.data && row.data.id === botId ? row.data : null
    return (
        <Sheet open={open} onOpenChange={onOpenChange} onExitComplete={onExitComplete}>
            <SheetContent side="right" className="flex w-full flex-col gap-4 sm:max-w-[38rem]">
                <SheetHeader>
                    <SheetTitle className="truncate">{b?.name ?? "Bot"}</SheetTitle>
                    <SheetDescription className="truncate">{b ? `${b.workspaceName} - ${b.house ? "demo" : "customer bot, numbers only"}` : "Loading"}</SheetDescription>
                </SheetHeader>
                <ScrollArea orientation="vertical" className="-mx-6 min-h-0 flex-1">
                    <div className="flex min-w-0 flex-col gap-6 px-6 pb-2">
                        {b ? (
                            <BotBody key={b.id} b={b} mainUrl={mainUrl} canWrite={canWrite} />
                        ) : row.isError ? (
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">{row.error instanceof Error ? row.error.message : "Could not load the bot."}</p>
                        ) : (
                            Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-10 w-full rounded-xl" />)
                        )}
                    </div>
                </ScrollArea>
                <SheetFooter>
                    <Button type="button" variant="outline" className="cursor-pointer rounded-xl" onClick={() => onOpenChange(false)}>Close</Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}

function useInvalidate() {
    const queryClient = useQueryClient()
    return () => queryClient.invalidateQueries({ queryKey: JAWAF_KEYS.all })
}

function BotBody({ b, mainUrl, canWrite }: { b: BotRow; mainUrl: string; canWrite: boolean }) {
    const publicUrl = `${mainUrl}/j/${b.slug}`
    return (
        <>
            <section className="flex min-w-0 flex-col gap-2">
                <SectionTitle action={(
                    <Button asChild size="sm" variant="ghost" className="cursor-pointer gap-1.5 rounded-xl">
                        <a href={publicUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /> Public page</a>
                    </Button>
                )}>Numbers</SectionTitle>
                <dl className="flex min-w-0 flex-col divide-y divide-neutral-200 dark:divide-neutral-800">
                    <Field label="Status"><BotState bot={b} />{b.paused && b.pausedReason ? <span className="block text-xs text-neutral-500 dark:text-neutral-400">{b.pausedReason}</span> : null}</Field>
                    <Field label="Workspace">{b.workspaceName}</Field>
                    <Field label="Pages included">{fmtInt(b.pages)} of {fmtInt(b.limits.pagesPerBot)} allowed</Field>
                    <Field label="Files">{fmtInt(b.files)} of {fmtInt(b.limits.filesPerBot)} allowed</Field>
                    <Field label="Answers this month">{fmtInt(b.answers)}</Field>
                    <Field label="Answered this month">{b.answerRate === null ? "Not asked this month" : `${b.answerRate}% of ${fmtInt(b.answers)}`}</Field>
                    <Field label="Credits used this month">{formatMicroCredits(b.creditsUsedMicro)}</Field>
                    <Field label="Last visit">{b.lastActiveAt ? fmtDate(b.lastActiveAt, true) : "No visits yet"}</Field>
                    <Field label="Made">{fmtDate(b.createdAt)}</Field>
                    {b.prospectId ? <Field label="Demo"><AppLink href={`${ROUTES.jawafDemos}?prospect=${encodeURIComponent(b.prospectId)}`} className="text-boli-sky-ink hover:underline">Open the prospect</AppLink></Field> : null}
                </dl>
            </section>
            <HealthPanel botId={b.id} house={b.house} canWrite={canWrite} />
            <EvalPanel botId={b.id} house={b.house} canWrite={canWrite} />
            {canWrite ? (
                <>
                    <PauseTool b={b} />
                    <LimitsTool b={b} />
                    <CreditsTool b={b} />
                    <OwnerTool b={b} />
                </>
            ) : null}
        </>
    )
}

function PauseTool({ b }: { b: BotRow }) {
    const invalidate = useInvalidate()
    const [reason, setReason] = React.useState("")
    const m = useMutation({
        mutationFn: async () => {
            const r = await setJawafBotPaused({ botId: b.id, paused: !b.paused, reason: reason.trim() || undefined })
            if (!r.success) throw new Error(r.error ?? "That did not work")
        },
        onSuccess: async () => { toast.success(b.paused ? "Resumed" : "Paused"); setReason(""); await invalidate() },
        onError: (e) => toast.error(e instanceof Error ? e.message : "That did not work"),
    })
    return (
        <section className="flex min-w-0 flex-col gap-2">
            <SectionTitle>{b.paused ? "Paused" : "Pause"}</SectionTitle>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{b.paused ? "The public page says the assistant is paused; the widget and API answer nothing." : "Stops the public page, widget and API. The workspace owners get a notification and an email."}</p>
            <div className="flex min-w-0 gap-2">
                {!b.paused ? <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="Why (sent to the owner)" className="h-9 min-w-0 flex-1 rounded-xl" /> : null}
                <ConfirmPopover
                    title={b.paused ? `Resume ${b.name}?` : `Pause ${b.name}?`}
                    description={b.paused ? "Visitors can ask again at once. The owners are told." : "Visitors see \"This assistant is paused\". The owners are told. Audited."}
                    confirmLabel={b.paused ? "Resume" : "Pause"}
                    destructive={!b.paused}
                    onConfirm={() => m.mutateAsync()}
                >
                    <Button type="button" size="sm" variant="outline" className="cursor-pointer gap-1.5 rounded-xl" disabled={m.isPending}>
                        {m.isPending ? <InlineLoader size={14} label="Saving" /> : b.paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                        {b.paused ? "Resume" : "Pause"}
                    </Button>
                </ConfirmPopover>
            </div>
        </section>
    )
}

function LimitsTool({ b }: { b: BotRow }) {
    const invalidate = useInvalidate()
    const [pages, setPages] = React.useState(b.limitOverrides.pagesPerBot?.toString() ?? "")
    const [files, setFiles] = React.useState(b.limitOverrides.filesPerBot?.toString() ?? "")
    const toNum = (s: string) => (s.trim() ? Math.trunc(Number(s)) : null)
    const valid = [pages, files].every((s) => !s.trim() || (Number.isInteger(Number(s)) && Number(s) > 0))
    const m = useMutation({
        mutationFn: async () => {
            const r = await setJawafBotLimits({ botId: b.id, pagesPerBot: toNum(pages), filesPerBot: toNum(files) })
            if (!r.success) throw new Error(r.error ?? "The limits could not be saved")
        },
        onSuccess: async () => { toast.success("Limits saved"); await invalidate() },
        onError: (e) => toast.error(e instanceof Error ? e.message : "The limits could not be saved"),
    })
    return (
        <section className="flex min-w-0 flex-col gap-2">
            <SectionTitle>Limits</SectionTitle>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Blank = the default. Now {fmtInt(b.limits.pagesPerBot)} pages and {fmtInt(b.limits.filesPerBot)} files.</p>
            <div className="grid min-w-0 grid-cols-2 gap-3">
                <div className="flex min-w-0 flex-col gap-1.5">
                    <Label htmlFor="l-pages">Pages</Label>
                    <Input id="l-pages" inputMode="numeric" value={pages} onChange={(e) => setPages(e.target.value.replace(/\D/g, ""))} placeholder="200" className="h-9 rounded-xl" />
                </div>
                <div className="flex min-w-0 flex-col gap-1.5">
                    <Label htmlFor="l-files">Files</Label>
                    <Input id="l-files" inputMode="numeric" value={files} onChange={(e) => setFiles(e.target.value.replace(/\D/g, ""))} placeholder="50" className="h-9 rounded-xl" />
                </div>
            </div>
            <div>
                <Button type="button" size="sm" variant="outline" className="cursor-pointer gap-1.5 rounded-xl" disabled={!valid || m.isPending} onClick={() => m.mutate()}>
                    {m.isPending ? <InlineLoader size={14} label="Saving" /> : <Save className="h-3.5 w-3.5" />} Save limits
                </Button>
            </div>
        </section>
    )
}

function CreditsTool({ b }: { b: BotRow }) {
    const invalidate = useInvalidate()
    const [credits, setCredits] = React.useState("")
    const [reason, setReason] = React.useState("")
    const [requestId, setRequestId] = React.useState(() => crypto.randomUUID())
    const amount = Math.trunc(Number(credits))
    const valid = Number.isFinite(amount) && amount !== 0 && reason.trim().length > 0
    const m = useMutation({
        mutationFn: async () => {
            const r = await grantJawafBotCredits({ botId: b.id, credits: amount, reason, requestId })
            if (!r.success) throw new Error(r.error ?? "The credits could not be granted")
            return r.data
        },
        onSuccess: async (d) => {
            toast.success(d.applied ? `${amount > 0 ? "Granted" : "Removed"} ${formatCredits(Math.abs(amount))} credits` : "Already granted")
            setCredits(""); setReason(""); setRequestId(crypto.randomUUID())
            await invalidate()
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "The credits could not be granted"),
    })
    return (
        <section className="flex min-w-0 flex-col gap-2">
            <SectionTitle>Credits for {b.workspaceName}</SectionTitle>
            <div className="grid min-w-0 gap-3 sm:grid-cols-[8rem_1fr]">
                <Input inputMode="numeric" value={credits} onChange={(e) => setCredits(e.target.value.replace(/[^\d-]/g, ""))} placeholder="e.g. 500" aria-label="Credits" className="h-9 rounded-xl" />
                <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="Why (in the audit log)" aria-label="Why" className="h-9 min-w-0 rounded-xl" />
            </div>
            <div>
                <ConfirmPopover
                    title={amount < 0 ? `Remove ${formatCredits(Math.abs(amount || 0))} credits?` : `Grant ${formatCredits(amount || 0)} credits?`}
                    description={`To the workspace ${b.workspaceName}. Recorded in the audit log.`}
                    confirmLabel={amount < 0 ? "Remove" : "Grant"}
                    destructive={amount < 0}
                    disabled={!valid || m.isPending}
                    onConfirm={() => m.mutateAsync().then(() => undefined)}
                >
                    <Button type="button" size="sm" variant="outline" className="cursor-pointer gap-1.5 rounded-xl" disabled={!valid || m.isPending}>
                        {m.isPending ? <InlineLoader size={14} label="Saving" /> : <Coins className="h-3.5 w-3.5" />} {amount < 0 ? "Remove credits" : "Grant credits"}
                    </Button>
                </ConfirmPopover>
            </div>
        </section>
    )
}

function OwnerTool({ b }: { b: BotRow }) {
    const invalidate = useInvalidate()
    const [email, setEmail] = React.useState("")
    const [confirm, setConfirm] = React.useState(false)
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    const m = useMutation({
        mutationFn: async () => {
            const r = await changeJawafBotOwner({ botId: b.id, email })
            if (!r.success) throw new Error(r.error ?? "The bot could not be moved")
            return r.data
        },
        onSuccess: async (row) => { toast.success(`Moved to ${row.workspaceName}`); setEmail(""); await invalidate() },
        onError: (e) => toast.error(e instanceof Error ? e.message : "The bot could not be moved"),
    })
    return (
        <section className="flex min-w-0 flex-col gap-2">
            <SectionTitle>Change owner</SectionTitle>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Moves the bot, with everything it knows and every conversation, to that person&apos;s own workspace. Use the claim link when you can.</p>
            <div className="flex min-w-0 gap-2">
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="owner@business.com" aria-label="New owner's email" className="h-9 min-w-0 flex-1 rounded-xl" />
                <Button type="button" size="sm" variant="outline" className="cursor-pointer gap-1.5 rounded-xl" disabled={!valid || m.isPending} onClick={() => setConfirm(true)}>
                    {m.isPending ? <InlineLoader size={14} label="Moving" /> : <UserRoundCog className="h-3.5 w-3.5" />} Move
                </Button>
            </div>
            <ConfirmDialog
                open={confirm}
                onOpenChange={setConfirm}
                title={`Move ${b.name} to ${email.trim()}?`}
                description={`It leaves ${b.workspaceName} with all its pages, facts, conversations and contacts. ${b.house ? "It stops being a demo and open claim links die. " : ""}Audited.`}
                confirmLabel="Move the bot"
                variant="destructive"
                onConfirm={() => m.mutateAsync().then(() => undefined)}
            />
        </section>
    )
}
