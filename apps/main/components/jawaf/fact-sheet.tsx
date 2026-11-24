"use client"

import * as React from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Table2 } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { ConfirmPopover } from "@repo/ui/components/ui/confirm-popover"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@repo/ui/components/ui/sheet"
import { toast } from "@repo/ui/components/ui/toast"
import { InlineLoader } from "@repo/brand/loaders/spinners"
import { JAWAF_FACT_TITLES, type JawafFactKey } from "@repo/boli/jawaf"
import { deleteJawafFact, saveJawafFact } from "@/actions/jawaf/facts.action"
import type { JawafFactSection, JawafTable } from "@/types/jawaf"
import { JAWAF_KEYS, unwrap } from "./keys"
import { RichTextEditor } from "./rich-text-editor"
import { cleanTable, PRICE_TABLE, TableEditor } from "./table-editor"

/** What a section is for, under its title in the sheet. */
export const FACT_HINTS: Record<JawafFactKey, string> = {
    about: "Who you are and what you do, in a few lines.",
    services: "What you offer. One line each works best.",
    prices: "Every price and fee. Jawaf quotes prices ONLY from this table, never from your website.",
    hours: "Opening days and times, holidays.",
    location: "Address, phone, WhatsApp, email and how to find you.",
    policies: "Refunds, cancellations, admissions rules - whatever people ask about.",
    custom: "Anything else Jawaf should always know.",
}

export interface FactTarget {
    /** An existing section, or null for a new one of `key`. */
    fact: JawafFactSection | null
    key: JawafFactKey
}

/**
 * Edit one fact section in the right sheet (non-modal: rows that open it carry `data-sheet-keep-open`, so pressing
 * another section SWAPS it). Saving approves the section and indexes it before the action returns, so the button says
 * "Updating..." until answers use it. Prices and fees gets the table editor; any section can add one.
 */
export function FactSheet({ botId, target, open, onOpenChange, onExitComplete, canEdit, onSaved }: {
    botId: string
    target: FactTarget | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onExitComplete?: () => void
    canEdit: boolean
    onSaved?: (fact: JawafFactSection) => void
}) {
    const queryClient = useQueryClient()
    const [title, setTitle] = React.useState("")
    const [html, setHtml] = React.useState("")
    const [table, setTable] = React.useState<JawafTable | null>(null)

    const targetId = target ? (target.fact?.id ?? `new-${target.key}`) : null
    React.useEffect(() => {
        if (!target) return
        const f = target.fact
        setTitle(f?.title ?? JAWAF_FACT_TITLES[target.key])
        setHtml(f?.html ?? "")
        setTable(f?.table ?? (target.key === "prices" ? PRICE_TABLE : null))
        // Reset only when a different section opens (a swap), not on every refetch.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [targetId])

    const invalidate = () => Promise.all([
        queryClient.invalidateQueries({ queryKey: JAWAF_KEYS.facts(botId) }),
        queryClient.invalidateQueries({ queryKey: JAWAF_KEYS.counts(botId) }),
    ])

    const save = useMutation({
        mutationFn: async () => {
            if (!target) throw new Error("Nothing to save.")
            const t = table ? cleanTable(table) : null
            return unwrap(await saveJawafFact({ botId, id: target.fact?.id, key: target.key, title: title.trim() || JAWAF_FACT_TITLES[target.key], html, table: t, approved: true }), "The section could not be saved.")
        },
        onSuccess: async (fact) => {
            toast.success("Saved", { description: "Jawaf answers with it now." })
            onSaved?.(fact)
            await invalidate()
            onOpenChange(false)
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "The section could not be saved."),
    })

    const remove = useMutation({
        mutationFn: async () => {
            if (!target?.fact) return
            unwrap(await deleteJawafFact({ botId, id: target.fact.id }), "The section could not be deleted.")
        },
        onSuccess: async () => {
            toast.success("Section deleted")
            onOpenChange(false)
            await invalidate()
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "The section could not be deleted."),
    })

    const key = target?.key ?? "custom"
    return (
        <Sheet open={open} onOpenChange={onOpenChange} onExitComplete={onExitComplete}>
            <SheetContent side="right" className="flex w-full flex-col gap-4 sm:max-w-xl">
                <SheetHeader>
                    <SheetTitle className="truncate">{target?.fact ? target.fact.title : `Add ${JAWAF_FACT_TITLES[key]}`}</SheetTitle>
                    <SheetDescription>{FACT_HINTS[key]}</SheetDescription>
                </SheetHeader>
                <form className="flex min-h-0 flex-1 flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (canEdit && !save.isPending) save.mutate() }}>
                    <ScrollArea orientation="vertical" className="-mx-6 min-h-0 flex-1">
                        <div className="flex flex-col gap-4 px-6 pb-2">
                            {key === "custom" ? (
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="fact-title">Title</Label>
                                    <Input id="fact-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} disabled={!canEdit} className="h-9 text-sm" />
                                </div>
                            ) : null}
                            <div className="flex flex-col gap-1.5">
                                <Label>What Jawaf should know</Label>
                                <RichTextEditor value={html} onChange={setHtml} placeholder="Write it the way you would tell a new staff member." maxHeight="max-h-[22rem]" />
                            </div>
                            {table ? (
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <Label>{key === "prices" ? "Price table" : "Table"}</Label>
                                        {key !== "prices" ? (
                                            <Button type="button" variant="ghost" size="sm" className="h-7 cursor-pointer text-xs" onClick={() => setTable(null)} disabled={!canEdit}>Remove table</Button>
                                        ) : null}
                                    </div>
                                    <TableEditor value={table} onChange={setTable} disabled={!canEdit} />
                                </div>
                            ) : (
                                <Button type="button" variant="outline" size="sm" className="w-fit cursor-pointer gap-1.5" onClick={() => setTable({ columns: ["Item", "Details"], rows: [["", ""]] })} disabled={!canEdit}>
                                    <Table2 className="h-3.5 w-3.5" /> Add a table
                                </Button>
                            )}
                        </div>
                    </ScrollArea>
                    {canEdit ? (
                        <SheetFooter>
                            {target?.fact ? (
                                <ConfirmPopover title="Delete this section?" description="Jawaf stops using it at once." confirmLabel="Delete" onConfirm={() => remove.mutateAsync()} side="top" align="start">
                                    <Button type="button" variant="ghost" className="mr-auto cursor-pointer text-red-700 dark:text-red-400" disabled={remove.isPending}>Delete</Button>
                                </ConfirmPopover>
                            ) : null}
                            <Button type="button" variant="outline" className="cursor-pointer" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit" className="cursor-pointer gap-2" disabled={save.isPending}>
                                {save.isPending ? <><InlineLoader size={14} label="Updating" /> Updating...</> : target?.fact?.approved ? "Save" : "Save and approve"}
                            </Button>
                        </SheetFooter>
                    ) : null}
                </form>
            </SheetContent>
        </Sheet>
    )
}
