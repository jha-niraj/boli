"use client"

import * as React from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { FilePlus2, MessageSquarePlus, Plus, RefreshCw, Table2, Upload } from "lucide-react"
import { Page, type PageAction } from "@repo/ui/components/ui/page"
import { toast } from "@repo/ui/components/ui/toast"
import { useUrlTab } from "@repo/ui/hooks/use-url-tab"
import { trainJawafNow } from "@/actions/jawaf/knowledge.action"
import { JobProgress } from "@/components/jawaf/job-progress"
import { JAWAF_CARD, JAWAF_KEYS, unwrap } from "@/components/jawaf/keys"
import { isJobActive, useJawafJob } from "@/components/jawaf/use-jawaf-job"
import type { JawafCan } from "@/lib/jawaf/current-bot"
import type { JawafFactSection, JawafJobView, JawafLimits, JawafNote, JawafPageView, JawafQa, JawafSourceView } from "@/types/jawaf"
import { JAWAF_PAGES } from "../../_components/jawaf-pages"
import { FactsTab } from "./facts-tab"
import { FilesTab } from "./files-tab"
import { NotesTab } from "./notes-tab"
import { PagesTab } from "./pages-tab"
import { QaTab } from "./qa-tab"

export const KNOWLEDGE_TABS = [
    { value: "facts", label: "Facts" },
    { value: "pages", label: "Pages" },
    { value: "files", label: "Files" },
    { value: "qa", label: "Q&A" },
    { value: "notes", label: "Notes" },
] as const
type TabId = (typeof KNOWLEDGE_TABS)[number]["value"]
const TAB_IDS = KNOWLEDGE_TABS.map((t) => t.value)

/** A header button asks the open tab to do something (open its "new" sheet); `n` changes on every press. */
export type KnowledgeCommand = { kind: "new-fact" | "new-qa" | "import-csv" | "new-note" | "new-table"; n: number } | null

export interface KnowledgeInitial {
    facts: JawafFactSection[]
    qa: JawafQa[]
    notes: JawafNote[]
    pages: JawafPageView[]
    sources: JawafSourceView[]
    files: JawafSourceView[]
    job: JawafJobView | null
}

/**
 * Knowledge: the tabs, the header actions for the open tab, and ONE reading job followed for the whole page (Train
 * now, an added page, an uploaded file all start one; its progress shows above every tab, and when it ends the lists
 * it touched refetch). Each save of a fact, Q&A or note is indexed before the action returns - "Updating..." on its
 * Save button covers the auto-apply.
 */
export function KnowledgeView({ botId, website, limits, initialTab, initial, storageReady, can }: {
    botId: string
    website: string | null
    limits: JawafLimits
    initialTab: string | string[] | undefined
    initial: KnowledgeInitial
    storageReady: boolean
    can: JawafCan
}) {
    const queryClient = useQueryClient()
    const [tab, setTab] = useUrlTab<TabId>(TAB_IDS, initialTab, "facts")
    const [command, setCommand] = React.useState<KnowledgeCommand>(null)
    const send = (kind: NonNullable<KnowledgeCommand>["kind"]) => setCommand((c) => ({ kind, n: (c?.n ?? 0) + 1 }))

    const { job, lost, start } = useJawafJob(initial.job, {
        onSettled: (j) => {
            for (const key of [JAWAF_KEYS.pages(botId), JAWAF_KEYS.sources(botId), JAWAF_KEYS.files(botId), JAWAF_KEYS.facts(botId), JAWAF_KEYS.qa(botId), JAWAF_KEYS.counts(botId)]) {
                queryClient.invalidateQueries({ queryKey: key })
            }
            if (j.status === "done") toast.success("Reading finished", { description: "Jawaf answers from the new pages now." })
        },
    })
    const running = isJobActive(job)

    const train = useMutation({
        mutationFn: async () => unwrap(await trainJawafNow(botId), "Training could not start."),
        onSuccess: (j) => { start(j); toast.success("Reading your pages again", { description: "Unchanged pages are skipped. Re-reads are free." }) },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Training could not start."),
    })

    const actions: PageAction[] = []
    if (can.edit) {
        if (tab === "facts") actions.push({ key: "new-fact", label: "Add section", icon: <Plus className="h-3.5 w-3.5" />, onClick: () => send("new-fact"), primary: true, keepSheetOpen: true })
        if (tab === "qa") {
            actions.push({ key: "import", label: "Import CSV", icon: <Upload className="h-3.5 w-3.5" />, onClick: () => send("import-csv"), variant: "outline", keepSheetOpen: true })
            actions.push({ key: "new-qa", label: "Add question", icon: <MessageSquarePlus className="h-3.5 w-3.5" />, onClick: () => send("new-qa"), primary: true, keepSheetOpen: true })
        }
        if (tab === "notes") {
            actions.push({
                key: "new-note", label: "New note", icon: <FilePlus2 className="h-3.5 w-3.5" />, primary: true, keepSheetOpen: true,
                options: [
                    { key: "note", label: "Note", icon: <FilePlus2 className="h-3.5 w-3.5" />, onClick: () => send("new-note") },
                    { key: "table", label: "Table", icon: <Table2 className="h-3.5 w-3.5" />, onClick: () => send("new-table") },
                ],
            })
        }
        if (tab === "pages" || tab === "facts") {
            actions.push({
                key: "train", label: running ? "Reading..." : "Train now", icon: <RefreshCw className="h-3.5 w-3.5" />, onClick: () => train.mutate(),
                variant: "outline", disabled: running || !initial.pages.length, pending: train.isPending,
                title: "Read every ticked page again now (free). Unchanged pages are skipped.",
            })
        }
    }

    const copy = JAWAF_PAGES.knowledge
    return (
        <Page
            title={copy.title}
            description={copy.description}
            tabs={KNOWLEDGE_TABS.map((t) => ({ value: t.value, label: t.label }))}
            tab={tab}
            onTabChange={(v) => setTab(v as TabId)}
            actions={actions}
        >
            <div className="flex min-w-0 flex-col gap-4 pb-6">
                {job && (running || job.status !== "done") ? (
                    <div className={`${JAWAF_CARD} p-4`}><JobProgress job={job} lost={lost} /></div>
                ) : null}
                {tab === "facts" ? <FactsTab botId={botId} initialFacts={initial.facts} initialPages={initial.pages} canEdit={can.edit} command={command} /> : null}
                {tab === "pages" ? <PagesTab botId={botId} website={website} limits={limits} initialPages={initial.pages} initialSources={initial.sources} canEdit={can.edit} running={running} onJob={start} /> : null}
                {tab === "files" ? <FilesTab botId={botId} limits={limits} initialFiles={initial.files} storageReady={storageReady} canEdit={can.edit} /> : null}
                {tab === "qa" ? <QaTab botId={botId} initialQa={initial.qa} canEdit={can.edit} command={command} /> : null}
                {tab === "notes" ? <NotesTab botId={botId} initialNotes={initial.notes} canEdit={can.edit} command={command} /> : null}
            </div>
        </Page>
    )
}
