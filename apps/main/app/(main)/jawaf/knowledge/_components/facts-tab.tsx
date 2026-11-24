"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { toast } from "@repo/ui/components/ui/toast"
import { approveJawafFacts, deleteJawafFact, listJawafFacts } from "@/actions/jawaf/facts.action"
import { listJawafPages } from "@/actions/jawaf/knowledge.action"
import { FactCards } from "@/components/jawaf/fact-cards"
import { FactSheet, type FactTarget } from "@/components/jawaf/fact-sheet"
import { JAWAF_KEYS, unwrap } from "@/components/jawaf/keys"
import type { JawafFactSection, JawafPageView } from "@/types/jawaf"
import type { KnowledgeCommand } from "./knowledge-view"
import { useCommand } from "./use-command"

/**
 * Facts: the fact sheet in its fixed order (About, Services, Prices and fees, Hours, Location and contact, Policies)
 * then custom sections. Each card opens the keep-open right sheet; another card swaps it. Prices and fees carries the
 * "Website disagrees" count from the read pages.
 */
export function FactsTab({ botId, initialFacts, initialPages, canEdit, command }: {
    botId: string
    initialFacts: JawafFactSection[]
    initialPages: JawafPageView[]
    canEdit: boolean
    command: KnowledgeCommand
}) {
    const queryClient = useQueryClient()
    const facts = useQuery({ queryKey: JAWAF_KEYS.facts(botId), queryFn: async () => unwrap(await listJawafFacts(botId)), initialData: initialFacts })
    const pages = useQuery({ queryKey: JAWAF_KEYS.pages(botId), queryFn: async () => unwrap(await listJawafPages({ botId, filter: "all" })), initialData: initialPages })
    const [target, setTarget] = React.useState<FactTarget | null>(null)
    const [open, setOpen] = React.useState(false)
    const [busyId, setBusyId] = React.useState<string | null>(null)

    useCommand(command, ["new-fact"], () => { setTarget({ fact: null, key: "custom" }); setOpen(true) })

    const refresh = () => Promise.all([
        queryClient.invalidateQueries({ queryKey: JAWAF_KEYS.facts(botId) }),
        queryClient.invalidateQueries({ queryKey: JAWAF_KEYS.counts(botId) }),
    ])
    const approve = useMutation({
        mutationFn: async (ids: string[]) => unwrap(await approveJawafFacts({ botId, ids })).approved,
        onSuccess: async (n) => { toast.success(n === 1 ? "Approved" : `Approved ${n}`); await refresh() },
        onError: (e) => toast.error(e instanceof Error ? e.message : "That could not be approved."),
        onSettled: () => setBusyId(null),
    })
    const discard = async (f: JawafFactSection) => {
        const r = await deleteJawafFact({ botId, id: f.id })
        if (!r.success) { toast.error(r.error ?? "That could not be discarded."); return }
        toast.success("Discarded")
        await refresh()
    }

    const list = facts.data ?? []
    const drafts = list.filter((f) => !f.approved)
    const disagreeing = (pages.data ?? []).filter((p) => p.disagreesWithFacts && p.status === "included").length
    const selected = target ? (target.fact?.id ?? `new-${target.key}`) : null

    return (
        <div className="flex min-w-0 flex-col gap-3">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                <p className="min-w-0 text-xs text-neutral-600 dark:text-neutral-400">
                    Jawaf always sends these with every answer, and they win over your website. Drafts are not used until you approve them.
                </p>
                {canEdit && drafts.length ? (
                    <Button type="button" variant="outline" size="sm" className="cursor-pointer gap-1.5" disabled={approve.isPending} onClick={() => approve.mutate([])}>
                        <Check className="h-3.5 w-3.5" /> Approve all drafts ({drafts.length})
                    </Button>
                ) : null}
            </div>
            <FactCards
                facts={list}
                disagreeing={disagreeing}
                selectedKey={open ? selected : null}
                canEdit={canEdit}
                onOpen={(t) => { setTarget(t); setOpen(true) }}
                onApprove={(f) => { setBusyId(f.id); approve.mutate([f.id]) }}
                onDiscard={discard}
                approvingId={busyId}
            />
            <FactSheet botId={botId} target={target} open={open} onOpenChange={setOpen} onExitComplete={() => setTarget(null)} canEdit={canEdit} />
        </div>
    )
}
