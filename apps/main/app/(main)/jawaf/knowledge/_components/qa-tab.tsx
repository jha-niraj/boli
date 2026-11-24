"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Download, Search } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { FileDropzone } from "@repo/ui/components/ui/file-dropzone"
import { Input } from "@repo/ui/components/ui/input"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@repo/ui/components/ui/sheet"
import { toast } from "@repo/ui/components/ui/toast"
import { cn } from "@repo/ui/lib/utils"
import { InlineLoader } from "@repo/brand/loaders/spinners"
import { importJawafQaCsv, listJawafQa } from "@/actions/jawaf/facts.action"
import { BoliEmpty } from "@/components/empty/boli-empty"
import { JAWAF_CARD, JAWAF_KEYS, unwrap } from "@/components/jawaf/keys"
import { QaSheet, type QaTarget } from "@/components/jawaf/qa-sheet"
import { StateBadge } from "@/components/jawaf/state-badge"
import type { JawafCsvImportResult, JawafQa, JawafQaSource } from "@/types/jawaf"
import type { KnowledgeCommand } from "./knowledge-view"
import { useCommand } from "./use-command"

const SOURCE_LABEL: Record<JawafQaSource, string> = { owner: "Added by you", fix: "From a fix", import: "Imported", draft: "Drafted from your website" }

const TEMPLATE = [
    "question,answer,other ways to ask",
    '"How much is the admission fee?","The admission fee is NPR 5,000, paid once.","admission fee kati ho; भर्ना शुल्क कति हो"',
    '"Where is your office?","We are in Putalisadak, Kathmandu, next to the Kamaladi bus stop.","office kaha cha; कार्यालय कहाँ छ"',
].join("\n")

function downloadTemplate() {
    const blob = new Blob([TEMPLATE], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "jawaf-questions-template.csv"
    a.click()
    URL.revokeObjectURL(url)
}

/**
 * Q&A: questions people ask and the answers Jawaf should give, each with other phrasings (matched on their own). A
 * row opens the keep-open right sheet; another row swaps it. Import CSV (question, answer, phrasings separated by ";")
 * with a template to download.
 */
export function QaTab({ botId, initialQa, canEdit, command }: { botId: string; initialQa: JawafQa[]; canEdit: boolean; command: KnowledgeCommand }) {
    const queryClient = useQueryClient()
    const qa = useQuery({ queryKey: JAWAF_KEYS.qa(botId), queryFn: async () => unwrap(await listJawafQa(botId)), initialData: initialQa })
    const [target, setTarget] = React.useState<QaTarget | null>(null)
    const [open, setOpen] = React.useState(false)
    const [importOpen, setImportOpen] = React.useState(false)
    const [query, setQuery] = React.useState("")

    useCommand(command, ["new-qa", "import-csv"], (kind) => {
        if (kind === "new-qa") { setImportOpen(false); setTarget({ mode: "qa", qa: null }); setOpen(true) }
        else { setOpen(false); setImportOpen(true) }
    })

    const list = qa.data ?? []
    const q = query.trim().toLowerCase()
    const shown = q ? list.filter((x) => x.question.toLowerCase().includes(q) || x.answer.toLowerCase().includes(q) || x.phrasings.some((p) => p.toLowerCase().includes(q))) : list
    const selected = target?.mode === "qa" ? (target.qa?.id ?? null) : null

    return (
        <div className="flex min-w-0 flex-col gap-3">
            {list.length ? (
                <>
                    <div className="relative min-w-0">
                        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
                        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search questions and answers" aria-label="Search questions" className="h-9 pl-8 text-sm" />
                    </div>
                    <div className={cn(JAWAF_CARD, "overflow-hidden")}>
                        <ScrollArea orientation="vertical" viewportClassName="max-h-[44rem]">
                            <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
                                {shown.map((x) => (
                                    <li
                                        key={x.id}
                                        data-sheet-keep-open
                                        onClick={() => { setImportOpen(false); setTarget({ mode: "qa", qa: x }); setOpen(true) }}
                                        className={cn(
                                            "flex min-w-0 cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/40",
                                            open && selected === x.id && "bg-neutral-50 dark:bg-neutral-800/40",
                                        )}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">{x.question}</p>
                                            <p className="line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">{x.answer}</p>
                                            <p className="mt-1 truncate text-xs text-neutral-500 dark:text-neutral-400">
                                                {SOURCE_LABEL[x.source]}{x.phrasings.length ? ` - ${x.phrasings.length} other ${x.phrasings.length === 1 ? "phrasing" : "phrasings"}` : ""}
                                            </p>
                                        </div>
                                        {x.approved ? null : <StateBadge dot="amber">Not approved</StateBadge>}
                                    </li>
                                ))}
                                {!shown.length ? <li className="px-4 py-8 text-center text-sm text-neutral-600 dark:text-neutral-400">No question matches that search.</li> : null}
                            </ul>
                        </ScrollArea>
                    </div>
                </>
            ) : (
                <div className={JAWAF_CARD}>
                    <BoliEmpty
                        kind="conversations"
                        title="No questions yet"
                        description="Add the questions customers ask most, with the exact answer. Fixes from the playground land here too."
                        action={canEdit ? (
                            <Button type="button" size="sm" className="cursor-pointer" data-sheet-keep-open onClick={() => { setTarget({ mode: "qa", qa: null }); setOpen(true) }}>Add a question</Button>
                        ) : undefined}
                    />
                </div>
            )}
            <QaSheet botId={botId} target={target} open={open} onOpenChange={setOpen} onExitComplete={() => setTarget(null)} canEdit={canEdit} />
            <ImportSheet botId={botId} open={importOpen} onOpenChange={setImportOpen} onImported={() => queryClient.invalidateQueries({ queryKey: JAWAF_KEYS.qa(botId) })} />
        </div>
    )
}

function ImportSheet({ botId, open, onOpenChange, onImported }: { botId: string; open: boolean; onOpenChange: (o: boolean) => void; onImported: () => void }) {
    const [file, setFile] = React.useState<File | null>(null)
    const [result, setResult] = React.useState<JawafCsvImportResult | null>(null)
    const [resetKey, setResetKey] = React.useState(0)

    const run = useMutation({
        mutationFn: async () => {
            if (!file) throw new Error("Choose a CSV file first.")
            return unwrap(await importJawafQaCsv({ botId, csv: await file.text() }), "That CSV could not be imported.")
        },
        onSuccess: (r) => {
            setResult(r)
            toast.success(`Imported ${r.added} ${r.added === 1 ? "question" : "questions"}`, r.skipped ? { description: `${r.skipped} skipped - see the sheet.` } : undefined)
            onImported()
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "That CSV could not be imported."),
    })

    return (
        <Sheet open={open} onOpenChange={onOpenChange} onExitComplete={() => { setFile(null); setResult(null); setResetKey((k) => k + 1) }}>
            <SheetContent side="right" className="flex w-full flex-col gap-4 sm:max-w-lg">
                <SheetHeader>
                    <SheetTitle>Import questions</SheetTitle>
                    <SheetDescription>A CSV with a question and an answer per row; other phrasings in a third column, separated by ;</SheetDescription>
                </SheetHeader>
                <form className="flex min-h-0 flex-1 flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (file && !run.isPending) run.mutate() }}>
                    <ScrollArea orientation="vertical" className="-mx-6 min-h-0 flex-1">
                        <div className="flex flex-col gap-4 px-6 pb-2">
                            <Button type="button" variant="outline" size="sm" className="w-fit cursor-pointer gap-1.5" onClick={downloadTemplate}>
                                <Download className="h-3.5 w-3.5" /> Download the template
                            </Button>
                            <FileDropzone
                                key={resetKey}
                                accept=".csv,text/csv"
                                maxSize={2_000_000}
                                onFilesChange={(files) => { setFile(files[0] ?? null); setResult(null) }}
                                title="Drop a CSV here, or press to choose"
                                hint="Up to 2 MB. A heading row is skipped."
                                aria-label="CSV file"
                            />
                            {result ? (
                                <div className="rounded-xl border border-neutral-200 p-3 text-sm dark:border-neutral-800">
                                    <p className="text-neutral-900 dark:text-white">{result.added} added, {result.skipped} skipped.</p>
                                    {result.problems.length ? (
                                        <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-xs text-neutral-600 dark:text-neutral-400">
                                            {result.problems.map((p) => <li key={p}>{p}</li>)}
                                        </ul>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                    </ScrollArea>
                    <SheetFooter>
                        <Button type="button" variant="outline" className="cursor-pointer" onClick={() => onOpenChange(false)}>{result ? "Done" : "Cancel"}</Button>
                        <Button type="submit" className="cursor-pointer gap-2" disabled={!file || run.isPending}>
                            {run.isPending ? <><InlineLoader size={14} label="Importing" /> Updating...</> : "Import"}
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    )
}
