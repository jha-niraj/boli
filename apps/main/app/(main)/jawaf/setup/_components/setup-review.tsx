"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, Pencil, Rocket, Trash2 } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { ConfirmPopover } from "@repo/ui/components/ui/confirm-popover"
import { Skeleton } from "@repo/ui/components/ui/skeleton"
import { toast } from "@repo/ui/components/ui/toast"
import { cn } from "@repo/ui/lib/utils"
import { InlineLoader } from "@repo/brand/loaders/spinners"
import { DISPLAY } from "@repo/brand/type"
import { updateJawafBot } from "@/actions/jawaf/bots.action"
import { approveJawafFacts, approveJawafQa, deleteJawafFact, deleteJawafQa, listJawafFacts, listJawafQa } from "@/actions/jawaf/facts.action"
import { FactCards } from "@/components/jawaf/fact-cards"
import { FactSheet, type FactTarget } from "@/components/jawaf/fact-sheet"
import { JAWAF_CARD, JAWAF_KEYS, unwrap } from "@/components/jawaf/keys"
import { QaSheet, type QaTarget } from "@/components/jawaf/qa-sheet"
import { StateBadge } from "@/components/jawaf/state-badge"
import type { JawafBotSummary, JawafFactSection, JawafQa } from "@/types/jawaf"

/**
 * Step 5 - Review what we found: the drafted fact sections and FAQs, each with Approve / Edit (right sheet) / Discard,
 * then Go live. Drafts are never used for answers until approved; Go live approves nothing by itself, so it says how
 * many drafts are still waiting.
 */
export function SetupReview({ bot, initialFacts, initialQa, onLive }: {
    bot: JawafBotSummary
    initialFacts: JawafFactSection[] | null
    initialQa: JawafQa[] | null
    onLive: () => void
}) {
    const queryClient = useQueryClient()
    const facts = useQuery({
        queryKey: JAWAF_KEYS.facts(bot.id),
        queryFn: async () => unwrap(await listJawafFacts(bot.id)),
        initialData: initialFacts ?? undefined,
    })
    const qa = useQuery({
        queryKey: JAWAF_KEYS.qa(bot.id),
        queryFn: async () => unwrap(await listJawafQa(bot.id)),
        initialData: initialQa ?? undefined,
    })

    const [factTarget, setFactTarget] = React.useState<FactTarget | null>(null)
    const [factOpen, setFactOpen] = React.useState(false)
    const [qaTarget, setQaTarget] = React.useState<QaTarget | null>(null)
    const [qaOpen, setQaOpen] = React.useState(false)
    const [busyId, setBusyId] = React.useState<string | null>(null)

    const refresh = () => Promise.all([
        queryClient.invalidateQueries({ queryKey: JAWAF_KEYS.facts(bot.id) }),
        queryClient.invalidateQueries({ queryKey: JAWAF_KEYS.qa(bot.id) }),
        queryClient.invalidateQueries({ queryKey: JAWAF_KEYS.counts(bot.id) }),
    ])

    const approveFact = useMutation({
        mutationFn: async (f: JawafFactSection) => { setBusyId(f.id); unwrap(await approveJawafFacts({ botId: bot.id, ids: [f.id] })) },
        onSuccess: async () => { toast.success("Approved"); await refresh() },
        onError: (e) => toast.error(e instanceof Error ? e.message : "That could not be approved."),
        onSettled: () => setBusyId(null),
    })
    const approveFaq = useMutation({
        mutationFn: async (q: JawafQa) => { setBusyId(q.id); unwrap(await approveJawafQa({ botId: bot.id, ids: [q.id] })) },
        onSuccess: async () => { toast.success("Approved"); await refresh() },
        onError: (e) => toast.error(e instanceof Error ? e.message : "That could not be approved."),
        onSettled: () => setBusyId(null),
    })
    const approveAll = useMutation({
        mutationFn: async () => {
            const [f, q] = await Promise.all([approveJawafFacts({ botId: bot.id, ids: [] }), approveJawafQa({ botId: bot.id, ids: [] })])
            return unwrap(f).approved + unwrap(q).approved
        },
        onSuccess: async (n) => { toast.success(n ? `Approved ${n}` : "Nothing left to approve"); await refresh() },
        onError: (e) => toast.error(e instanceof Error ? e.message : "That could not be approved."),
    })
    const goLive = useMutation({
        mutationFn: async () => unwrap(await updateJawafBot({ botId: bot.id, status: "live", setupStep: "try" }), "Your bot could not go live."),
        onSuccess: async () => {
            toast.success("Your Jawaf is live", { description: "Try it in the playground, then share your link." })
            await queryClient.invalidateQueries({ queryKey: JAWAF_KEYS.switcher })
            onLive()
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Your bot could not go live."),
    })

    const discardFact = async (f: JawafFactSection) => {
        const r = await deleteJawafFact({ botId: bot.id, id: f.id })
        if (!r.success) { toast.error(r.error ?? "That could not be discarded."); return }
        toast.success("Discarded")
        await refresh()
    }
    const discardFaq = async (q: JawafQa) => {
        const r = await deleteJawafQa({ botId: bot.id, id: q.id })
        if (!r.success) { toast.error(r.error ?? "That could not be discarded."); return }
        toast.success("Discarded")
        await refresh()
    }

    const factList = facts.data ?? []
    const faqs = (qa.data ?? []).filter((q) => q.source === "draft")
    const drafts = factList.filter((f) => !f.approved).length + faqs.filter((q) => !q.approved).length
    const nothing = !facts.isPending && !factList.length && !faqs.length
    const selectedFact = factTarget ? (factTarget.fact?.id ?? `new-${factTarget.key}`) : null
    const selectedQa = qaTarget?.mode === "qa" ? qaTarget.qa?.id ?? null : null

    return (
        <div className="flex min-w-0 flex-col gap-6">
            <div className="flex min-w-0 flex-wrap items-end justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-2">
                    <h2 className="text-3xl text-neutral-900 sm:text-4xl dark:text-white" style={DISPLAY.h3}>Review what we found</h2>
                    <p className="max-w-[64ch] text-sm text-neutral-600 dark:text-neutral-400">
                        {nothing
                            ? "Nothing was drafted yet. Write the sections customers ask about most - prices, hours, location - and Jawaf answers from them."
                            : "Jawaf drafted these from your website. Approve what is right, fix what is not. Your facts always win over pages, and prices are only ever quoted from Prices and fees."}
                    </p>
                </div>
                {drafts ? (
                    <Button type="button" variant="outline" className="cursor-pointer gap-1.5" disabled={approveAll.isPending} onClick={() => approveAll.mutate()}>
                        <Check className="h-3.5 w-3.5" /> Approve all ({drafts})
                    </Button>
                ) : null}
            </div>

            <section className="flex min-w-0 flex-col gap-3">
                <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Fact sheet</h3>
                {facts.isPending ? (
                    <div className="grid gap-3 lg:grid-cols-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}</div>
                ) : (
                    <FactCards
                        facts={factList}
                        disagreeing={0}
                        selectedKey={factOpen ? selectedFact : null}
                        canEdit
                        onOpen={(t) => { setQaOpen(false); setFactTarget(t); setFactOpen(true) }}
                        onApprove={(f) => approveFact.mutate(f)}
                        onDiscard={discardFact}
                        approvingId={busyId}
                    />
                )}
            </section>

            {faqs.length ? (
                <section className="flex min-w-0 flex-col gap-3">
                    <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Common questions</h3>
                    <ul className={cn(JAWAF_CARD, "divide-y divide-neutral-200 overflow-hidden dark:divide-neutral-800")}>
                        {faqs.map((q) => (
                            <li
                                key={q.id}
                                data-sheet-keep-open
                                onClick={() => { setFactOpen(false); setQaTarget({ mode: "qa", qa: q }); setQaOpen(true) }}
                                className={cn("flex min-w-0 cursor-pointer flex-col gap-2 p-4 transition-colors hover:bg-neutral-50 sm:flex-row sm:items-start dark:hover:bg-neutral-800/40", qaOpen && selectedQa === q.id && "bg-neutral-50 dark:bg-neutral-800/40")}
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-neutral-900 dark:text-white">{q.question}</p>
                                    <p className="line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">{q.answer}</p>
                                </div>
                                <div className="flex shrink-0 flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    {q.approved ? (
                                        <StateBadge dot="sky">Approved</StateBadge>
                                    ) : (
                                        <Button type="button" size="sm" className="cursor-pointer gap-1.5" disabled={busyId === q.id} onClick={() => approveFaq.mutate(q)}>
                                            <Check className="h-3.5 w-3.5" /> Approve
                                        </Button>
                                    )}
                                    <Button type="button" variant="outline" size="sm" className="cursor-pointer gap-1.5" data-sheet-keep-open onClick={() => { setFactOpen(false); setQaTarget({ mode: "qa", qa: q }); setQaOpen(true) }}>
                                        <Pencil className="h-3.5 w-3.5" /> Edit
                                    </Button>
                                    {!q.approved ? (
                                        <ConfirmPopover title="Discard this question?" description="Jawaf will not use it." confirmLabel="Discard" onConfirm={() => discardFaq(q)}>
                                            <Button type="button" variant="ghost" size="sm" className="cursor-pointer gap-1.5 text-neutral-600 dark:text-neutral-400"><Trash2 className="h-3.5 w-3.5" /> Discard</Button>
                                        </ConfirmPopover>
                                    ) : null}
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}

            <div className={cn(JAWAF_CARD, "flex min-w-0 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between")}>
                <p className="min-w-0 text-sm text-neutral-700 dark:text-neutral-300">
                    {drafts
                        ? `${drafts} ${drafts === 1 ? "draft is" : "drafts are"} still waiting. Jawaf only uses what you approve - you can go live now and approve the rest later in Knowledge.`
                        : "Going live opens your public link. You can keep changing everything afterwards."}
                </p>
                <Button type="button" className="shrink-0 cursor-pointer gap-1.5" disabled={goLive.isPending} onClick={() => goLive.mutate()}>
                    {goLive.isPending ? <InlineLoader size={14} label="Going live" /> : <Rocket className="h-3.5 w-3.5" />} Go live
                </Button>
            </div>

            <FactSheet
                botId={bot.id}
                target={factTarget}
                open={factOpen}
                onOpenChange={setFactOpen}
                onExitComplete={() => setFactTarget(null)}
                canEdit
            />
            <QaSheet botId={bot.id} target={qaTarget} open={qaOpen} onOpenChange={setQaOpen} onExitComplete={() => setQaTarget(null)} canEdit />
        </div>
    )
}
