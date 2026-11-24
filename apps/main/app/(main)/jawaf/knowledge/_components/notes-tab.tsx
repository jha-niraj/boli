"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { FileText, Table2 } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { ConfirmPopover } from "@repo/ui/components/ui/confirm-popover"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { RichText, richTextToPlain } from "@repo/ui/components/ui/rich-text"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@repo/ui/components/ui/sheet"
import { toast } from "@repo/ui/components/ui/toast"
import { cn } from "@repo/ui/lib/utils"
import { InlineLoader } from "@repo/brand/loaders/spinners"
import { deleteJawafNote, listJawafNotes, saveJawafNote } from "@/actions/jawaf/facts.action"
import { BoliEmpty } from "@/components/empty/boli-empty"
import { JAWAF_CARD, JAWAF_KEYS, unwrap } from "@/components/jawaf/keys"
import { RichTextEditor } from "@/components/jawaf/rich-text-editor"
import { BLANK_TABLE, cleanTable, TableEditor } from "@/components/jawaf/table-editor"
import { formatDay } from "@/lib/platform-display"
import type { JawafNote, JawafNoteKind, JawafTable } from "@/types/jawaf"
import type { KnowledgeCommand } from "./knowledge-view"
import { useCommand } from "./use-command"

type NoteTarget = { note: JawafNote | null; kind: JawafNoteKind }

/**
 * Notes: rich-text notes and tables for anything that is not a fact or a Q&A (a timetable, a menu, staff on duty).
 * Rows open the keep-open right sheet; another row swaps it.
 */
export function NotesTab({ botId, initialNotes, canEdit, command }: { botId: string; initialNotes: JawafNote[]; canEdit: boolean; command: KnowledgeCommand }) {
    const notes = useQuery({ queryKey: JAWAF_KEYS.notes(botId), queryFn: async () => unwrap(await listJawafNotes(botId)), initialData: initialNotes })
    const [target, setTarget] = React.useState<NoteTarget | null>(null)
    const [open, setOpen] = React.useState(false)
    const openNew = (kind: JawafNoteKind) => { setTarget({ note: null, kind }); setOpen(true) }

    useCommand(command, ["new-note", "new-table"], (kind) => openNew(kind === "new-table" ? "table" : "note"))

    const list = notes.data ?? []
    return (
        <div className="flex min-w-0 flex-col gap-3">
            {list.length ? (
                <div className={cn(JAWAF_CARD, "overflow-hidden")}>
                    <ScrollArea orientation="vertical" viewportClassName="max-h-[44rem]">
                        <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
                            {list.map((n) => (
                                <li
                                    key={n.id}
                                    data-sheet-keep-open
                                    onClick={() => { setTarget({ note: n, kind: n.kind }); setOpen(true) }}
                                    className={cn(
                                        "flex min-w-0 cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/40",
                                        open && target?.note?.id === n.id && "bg-neutral-50 dark:bg-neutral-800/40",
                                    )}
                                >
                                    <span aria-hidden className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                                        {n.kind === "table" ? <Table2 className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">{n.title}</p>
                                        <p className="truncate text-sm text-neutral-600 dark:text-neutral-400">
                                            {n.kind === "table" && n.table ? `${n.table.rows.length} rows - ${n.table.columns.join(", ")}` : richTextToPlain(n.html) || "Empty"}
                                        </p>
                                    </div>
                                    <span className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">{formatDay(n.updatedAt)}</span>
                                </li>
                            ))}
                        </ul>
                    </ScrollArea>
                </div>
            ) : (
                <div className={JAWAF_CARD}>
                    <BoliEmpty
                        kind="search"
                        title="No notes yet"
                        description="Anything else Jawaf should know - a timetable, a menu, who is on duty. Write a note or make a table."
                        action={canEdit ? (
                            <>
                                <Button type="button" size="sm" className="cursor-pointer" data-sheet-keep-open onClick={() => openNew("note")}>New note</Button>
                                <Button type="button" size="sm" variant="outline" className="cursor-pointer" data-sheet-keep-open onClick={() => openNew("table")}>New table</Button>
                            </>
                        ) : undefined}
                    />
                </div>
            )}
            <NoteSheet botId={botId} target={target} open={open} onOpenChange={setOpen} onExitComplete={() => setTarget(null)} canEdit={canEdit} />
        </div>
    )
}

function NoteSheet({ botId, target, open, onOpenChange, onExitComplete, canEdit }: {
    botId: string
    target: NoteTarget | null
    open: boolean
    onOpenChange: (o: boolean) => void
    onExitComplete: () => void
    canEdit: boolean
}) {
    const queryClient = useQueryClient()
    const [title, setTitle] = React.useState("")
    const [html, setHtml] = React.useState("")
    const [table, setTable] = React.useState<JawafTable>(BLANK_TABLE)
    const key = target ? (target.note?.id ?? `new-${target.kind}`) : null
    React.useEffect(() => {
        if (!target) return
        setTitle(target.note?.title ?? "")
        setHtml(target.note?.html ?? "")
        setTable(target.note?.table ?? BLANK_TABLE)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key])

    const invalidate = () => Promise.all([
        queryClient.invalidateQueries({ queryKey: JAWAF_KEYS.notes(botId) }),
        queryClient.invalidateQueries({ queryKey: JAWAF_KEYS.counts(botId) }),
    ])
    const save = useMutation({
        mutationFn: async () => {
            if (!target) throw new Error("Nothing to save.")
            return unwrap(await saveJawafNote({ botId, id: target.note?.id, kind: target.kind, title: title.trim(), html, table: target.kind === "table" ? cleanTable(table) : null }), "The note could not be saved.")
        },
        onSuccess: async () => { toast.success("Saved", { description: "Jawaf answers with it now." }); await invalidate(); onOpenChange(false) },
        onError: (e) => toast.error(e instanceof Error ? e.message : "The note could not be saved."),
    })
    const remove = useMutation({
        mutationFn: async () => { if (target?.note) unwrap(await deleteJawafNote({ botId, id: target.note.id }), "The note could not be deleted.") },
        onSuccess: async () => { toast.success("Deleted"); onOpenChange(false); await invalidate() },
        onError: (e) => toast.error(e instanceof Error ? e.message : "The note could not be deleted."),
    })

    const isTable = target?.kind === "table"
    return (
        <Sheet open={open} onOpenChange={onOpenChange} onExitComplete={onExitComplete}>
            <SheetContent side="right" className="flex w-full flex-col gap-4 sm:max-w-xl">
                <SheetHeader>
                    <SheetTitle className="truncate">{target?.note ? target.note.title : isTable ? "New table" : "New note"}</SheetTitle>
                    <SheetDescription>{isTable ? "Rows and columns Jawaf reads like a sheet - timetables, menus, rates." : "Anything Jawaf should know. It answers from it at once."}</SheetDescription>
                </SheetHeader>
                <form className="flex min-h-0 flex-1 flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (canEdit && title.trim() && !save.isPending) save.mutate() }}>
                    <ScrollArea orientation="vertical" className="-mx-6 min-h-0 flex-1">
                        <div className="flex flex-col gap-4 px-6 pb-2">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="note-title">Title</Label>
                                <Input id="note-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} disabled={!canEdit} placeholder={isTable ? "Class timetable" : "Who to call for what"} className="h-9 text-sm" />
                            </div>
                            {isTable ? (
                                <div className="flex flex-col gap-1.5">
                                    <Label>Table</Label>
                                    <TableEditor value={table} onChange={setTable} disabled={!canEdit} />
                                </div>
                            ) : canEdit ? (
                                <div className="flex flex-col gap-1.5">
                                    <Label>Note</Label>
                                    <RichTextEditor value={html} onChange={setHtml} placeholder="Write it the way you would tell a new staff member." maxHeight="max-h-[26rem]" />
                                </div>
                            ) : (
                                <RichText html={html} className="text-sm" />
                            )}
                        </div>
                    </ScrollArea>
                    {canEdit ? (
                        <SheetFooter>
                            {target?.note ? (
                                <ConfirmPopover title="Delete this note?" description="Jawaf stops using it at once." confirmLabel="Delete" onConfirm={() => remove.mutateAsync()} side="top" align="start">
                                    <Button type="button" variant="ghost" className="mr-auto cursor-pointer text-red-700 dark:text-red-400" disabled={remove.isPending}>Delete</Button>
                                </ConfirmPopover>
                            ) : null}
                            <Button type="button" variant="outline" className="cursor-pointer" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit" className="cursor-pointer gap-2" disabled={!title.trim() || save.isPending}>
                                {save.isPending ? <><InlineLoader size={14} label="Updating" /> Updating...</> : "Save"}
                            </Button>
                        </SheetFooter>
                    ) : null}
                </form>
            </SheetContent>
        </Sheet>
    )
}
