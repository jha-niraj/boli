"use client"

import { AlertTriangle, Check, Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { ConfirmPopover } from "@repo/ui/components/ui/confirm-popover"
import { RichText } from "@repo/ui/components/ui/rich-text"
import { cn } from "@repo/ui/lib/utils"
import { JAWAF_FACT_KEYS, JAWAF_FACT_TITLES, type JawafFactKey } from "@repo/boli/jawaf"
import type { JawafFactSection } from "@/types/jawaf"
import { FACT_HINTS, type FactTarget } from "./fact-sheet"
import { JAWAF_CARD } from "./keys"
import { StateBadge } from "./state-badge"
import { TableView } from "./table-editor"

/** The fixed sections in their fixed order, then custom ones (by sort). Missing fixed sections are empty slots. */
export function orderFacts(facts: JawafFactSection[]): { key: JawafFactKey; fact: JawafFactSection | null }[] {
    const fixed = JAWAF_FACT_KEYS.filter((k) => k !== "custom").map((key) => ({ key, fact: facts.find((f) => f.key === key) ?? null }))
    const custom = facts.filter((f) => f.key === "custom").sort((a, b) => a.sort - b.sort).map((fact) => ({ key: "custom" as const, fact }))
    return [...fixed, ...custom]
}

/**
 * The fact sheet as cards (Knowledge > Facts and the setup's Review step). Each card: the title, approved / draft
 * state in words, the text and the table. The whole card opens the right sheet (`data-sheet-keep-open`, so another
 * card SWAPS it); drafts also get Approve and Discard. "Website disagrees" names how many read pages show a price that
 * is not in Prices and fees - the facts win, the flag says where to look.
 */
export function FactCards({ facts, disagreeing, selectedKey, canEdit, onOpen, onApprove, onDiscard, approvingId }: {
    facts: JawafFactSection[]
    /** Pages whose numbers differ from the approved Prices and fees. */
    disagreeing: number
    /** The open card (fact id, or `new-<key>`). */
    selectedKey: string | null
    canEdit: boolean
    onOpen: (target: FactTarget) => void
    onApprove?: (fact: JawafFactSection) => void
    onDiscard?: (fact: JawafFactSection) => Promise<void>
    approvingId?: string | null
}) {
    return (
        <div className="grid min-w-0 gap-3 lg:grid-cols-2">
            {orderFacts(facts).map(({ key, fact }) => {
                const id = fact?.id ?? `new-${key}`
                const open = () => onOpen({ fact, key })
                return (
                    <article
                        key={id}
                        data-sheet-keep-open
                        className={cn(
                            JAWAF_CARD,
                            "flex min-w-0 cursor-pointer flex-col gap-3 p-4 transition-colors hover:border-neutral-300 dark:hover:border-neutral-700",
                            selectedKey === id && "border-neutral-400 dark:border-neutral-600",
                        )}
                        onClick={open}
                    >
                        <header className="flex min-w-0 items-start justify-between gap-2">
                            <div className="min-w-0">
                                <h3 className="truncate text-base font-semibold text-neutral-900 dark:text-white">{fact?.title ?? JAWAF_FACT_TITLES[key]}</h3>
                                {!fact ? <p className="text-xs text-neutral-600 dark:text-neutral-400">{FACT_HINTS[key]}</p> : null}
                            </div>
                            {fact ? (
                                fact.approved
                                    ? <StateBadge dot="sky">Approved</StateBadge>
                                    : <StateBadge dot="amber">{fact.drafted ? "Drafted for you" : "Not approved"}</StateBadge>
                            ) : null}
                        </header>
                        {fact ? (
                            <div className="flex min-w-0 flex-col gap-2">
                                {fact.html ? <RichText html={fact.html} clamp={fact.table ? 3 : 6} className="text-sm" /> : null}
                                {fact.table ? <TableView table={{ ...fact.table, rows: fact.table.rows.slice(0, 6) }} /> : null}
                                {fact.table && fact.table.rows.length > 6 ? <p className="text-xs text-neutral-600 dark:text-neutral-400">{fact.table.rows.length - 6} more rows</p> : null}
                                {!fact.html && !fact.table ? <p className="text-sm text-neutral-600 dark:text-neutral-400">Empty - Jawaf did not find this on your website.</p> : null}
                            </div>
                        ) : null}
                        {key === "prices" && disagreeing > 0 ? (
                            <p className="flex items-start gap-1.5 text-xs text-neutral-800 dark:text-neutral-200">
                                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                                Website disagrees: {disagreeing} {disagreeing === 1 ? "page shows" : "pages show"} a price that is not in this table. Jawaf answers from this table.
                            </p>
                        ) : null}
                        {canEdit ? (
                            <footer className="mt-auto flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                {!fact ? (
                                    <Button type="button" variant="outline" size="sm" className="cursor-pointer gap-1.5" data-sheet-keep-open onClick={open}>
                                        <Plus className="h-3.5 w-3.5" /> Add
                                    </Button>
                                ) : (
                                    <>
                                        {!fact.approved && onApprove ? (
                                            <Button type="button" size="sm" className="cursor-pointer gap-1.5" disabled={approvingId === fact.id} onClick={() => onApprove(fact)}>
                                                <Check className="h-3.5 w-3.5" /> Approve
                                            </Button>
                                        ) : null}
                                        <Button type="button" variant="outline" size="sm" className="cursor-pointer gap-1.5" data-sheet-keep-open onClick={open}>
                                            <Pencil className="h-3.5 w-3.5" /> Edit
                                        </Button>
                                        {!fact.approved && onDiscard ? (
                                            <ConfirmPopover title="Discard this draft?" description="Jawaf will not use it. You can write the section yourself later." confirmLabel="Discard" onConfirm={() => onDiscard(fact)}>
                                                <Button type="button" variant="ghost" size="sm" className="cursor-pointer gap-1.5 text-neutral-600 dark:text-neutral-400">
                                                    <Trash2 className="h-3.5 w-3.5" /> Discard
                                                </Button>
                                            </ConfirmPopover>
                                        ) : null}
                                    </>
                                )}
                            </footer>
                        ) : null}
                    </article>
                )
            })}
        </div>
    )
}
