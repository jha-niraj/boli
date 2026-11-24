"use client"

import * as React from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@repo/ui/components/ui/button"
import { ConfirmPopover } from "@repo/ui/components/ui/confirm-popover"
import { Label } from "@repo/ui/components/ui/label"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@repo/ui/components/ui/sheet"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { toast } from "@repo/ui/components/ui/toast"
import { InlineLoader } from "@repo/brand/loaders/spinners"
import { JAWAF_LIMITS } from "@repo/boli/jawaf"
import { deleteJawafQa, saveJawafQa } from "@/actions/jawaf/facts.action"
import { fixJawafAnswer } from "@/actions/jawaf/playground.action"
import type { JawafQa } from "@/types/jawaf"
import { ChipsInput } from "./chips-input"
import { JAWAF_KEYS, unwrap } from "./keys"

/**
 * What the sheet edits:
 * - `qa`: an existing Q&A pair, or a new one (`qa: null`).
 * - `fix`: "Fix this answer" / "Answer this" from the playground - the question prefilled, saved through the fix
 *   action (the visitor's own wording of `messageId` becomes a phrasing), applied at once.
 */
export type QaTarget =
    | { mode: "qa"; qa: JawafQa | null }
    | { mode: "fix"; question: string; answer: string; messageId: string | null }

const targetKey = (t: QaTarget | null) => (!t ? null : t.mode === "qa" ? `qa-${t.qa?.id ?? "new"}` : `fix-${t.messageId ?? t.question}`)

/**
 * One Q&A in the right sheet (non-modal; rows carry `data-sheet-keep-open`, so another row SWAPS it). Several
 * phrasings as chips - each is matched on its own. Saving indexes it before returning ("Updating...").
 */
export function QaSheet({ botId, target, open, onOpenChange, onExitComplete, canEdit }: {
    botId: string
    target: QaTarget | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onExitComplete?: () => void
    canEdit: boolean
}) {
    const queryClient = useQueryClient()
    const [question, setQuestion] = React.useState("")
    const [phrasings, setPhrasings] = React.useState<string[]>([])
    const [answer, setAnswer] = React.useState("")

    const key = targetKey(target)
    React.useEffect(() => {
        if (!target) return
        if (target.mode === "qa") {
            setQuestion(target.qa?.question ?? "")
            setPhrasings(target.qa?.phrasings ?? [])
            setAnswer(target.qa?.answer ?? "")
        } else {
            setQuestion(target.question)
            setPhrasings([])
            setAnswer(target.answer)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key])

    const invalidate = () => Promise.all([
        queryClient.invalidateQueries({ queryKey: JAWAF_KEYS.qa(botId) }),
        queryClient.invalidateQueries({ queryKey: JAWAF_KEYS.unanswered(botId) }),
        queryClient.invalidateQueries({ queryKey: JAWAF_KEYS.counts(botId) }),
    ])

    const save = useMutation({
        mutationFn: async () => {
            if (!target) throw new Error("Nothing to save.")
            const input = { botId, question: question.trim(), phrasings, answer: answer.trim() }
            if (target.mode === "fix") return unwrap(await fixJawafAnswer({ ...input, messageId: target.messageId ?? undefined }), "The answer could not be saved.")
            return unwrap(await saveJawafQa({ ...input, id: target.qa?.id, approved: true }), "The question could not be saved.")
        },
        onSuccess: async () => {
            if (target?.mode === "fix") toast.success("Saved - it answers this way now")
            else toast.success("Saved", { description: "Jawaf answers with it now." })
            await invalidate()
            onOpenChange(false)
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "That could not be saved."),
    })

    const remove = useMutation({
        mutationFn: async () => {
            if (target?.mode !== "qa" || !target.qa) return
            unwrap(await deleteJawafQa({ botId, id: target.qa.id }), "The question could not be deleted.")
        },
        onSuccess: async () => {
            toast.success("Question deleted")
            onOpenChange(false)
            await invalidate()
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "The question could not be deleted."),
    })

    const existing = target?.mode === "qa" ? target.qa : null
    const valid = question.trim().length >= 2 && answer.trim().length > 0
    return (
        <Sheet open={open} onOpenChange={onOpenChange} onExitComplete={onExitComplete}>
            <SheetContent side="right" className="flex w-full flex-col gap-4 sm:max-w-lg">
                <SheetHeader>
                    <SheetTitle>{target?.mode === "fix" ? "Fix this answer" : existing ? "Edit question" : "Add a question"}</SheetTitle>
                    <SheetDescription>
                        {target?.mode === "fix" ? "Write the right answer. Jawaf uses it the next time anyone asks." : "A question people ask and the answer Jawaf should give."}
                    </SheetDescription>
                </SheetHeader>
                <form className="flex min-h-0 flex-1 flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (canEdit && valid && !save.isPending) save.mutate() }}>
                    <ScrollArea orientation="vertical" className="-mx-6 min-h-0 flex-1">
                        <div className="flex flex-col gap-4 px-6 pb-2">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="qa-question">Question</Label>
                                <Textarea id="qa-question" value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={JAWAF_LIMITS.questionChars} disabled={!canEdit} rows={1} className="min-h-9 resize-none text-sm [field-sizing:content]" placeholder="How much is the admission fee?" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="qa-phrasing">Other ways people ask it</Label>
                                <p className="text-xs text-neutral-600 dark:text-neutral-400">Add Romanized and Nepali versions too, like &quot;admission fee kati ho&quot;.</p>
                                <ChipsInput id="qa-phrasing" value={phrasings} onChange={setPhrasings} max={JAWAF_LIMITS.phrasingsPerQa} maxLength={JAWAF_LIMITS.questionChars} placeholder="Type a phrasing, press Enter" disabled={!canEdit} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="qa-answer">Answer</Label>
                                <Textarea id="qa-answer" value={answer} onChange={(e) => setAnswer(e.target.value)} maxLength={JAWAF_LIMITS.answerChars} disabled={!canEdit} rows={4} className="min-h-24 text-sm [field-sizing:content]" placeholder="The admission fee is NPR 5,000, paid once." />
                                <p className="text-xs text-neutral-600 dark:text-neutral-400">Jawaf replies in the visitor&apos;s own script, so one answer in any language is enough.</p>
                            </div>
                        </div>
                    </ScrollArea>
                    {canEdit ? (
                        <SheetFooter>
                            {existing ? (
                                <ConfirmPopover title="Delete this question?" description="Jawaf stops using it at once." confirmLabel="Delete" onConfirm={() => remove.mutateAsync()} side="top" align="start">
                                    <Button type="button" variant="ghost" className="mr-auto cursor-pointer text-red-700 dark:text-red-400" disabled={remove.isPending}>Delete</Button>
                                </ConfirmPopover>
                            ) : null}
                            <Button type="button" variant="outline" className="cursor-pointer" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit" className="cursor-pointer gap-2" disabled={!valid || save.isPending}>
                                {save.isPending ? <><InlineLoader size={14} label="Updating" /> Updating...</> : existing && !existing.approved ? "Save and approve" : "Save"}
                            </Button>
                        </SheetFooter>
                    ) : null}
                </form>
            </SheetContent>
        </Sheet>
    )
}
