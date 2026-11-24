"use client"

import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { HardDrive, Trash2 } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { ConfirmPopover } from "@repo/ui/components/ui/confirm-popover"
import { FileDropzone } from "@repo/ui/components/ui/file-dropzone"
import { FileTypeIcon } from "@repo/ui/components/ui/file-type-icon"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { toast } from "@repo/ui/components/ui/toast"
import { cn } from "@repo/ui/lib/utils"
import { formatCredits } from "@repo/boli"
import { JAWAF_PRICES } from "@repo/boli/jawaf"
import { deleteJawafSource, finishJawafFileUpload, listJawafFiles, startJawafFileUpload } from "@/actions/jawaf/knowledge.action"
import { JAWAF_CARD, JAWAF_KEYS, unwrap } from "@/components/jawaf/keys"
import { StateBadge } from "@/components/jawaf/state-badge"
import { useJawafJob } from "@/components/jawaf/use-jawaf-job"
import { formatDay } from "@/lib/platform-display"
import { JAWAF_FILE_TYPES } from "@/schemas/jawaf"
import type { JawafJobView, JawafLimits, JawafSourceView } from "@/types/jawaf"

type FileMime = keyof typeof JAWAF_FILE_TYPES
const BY_EXT: Record<string, FileMime> = Object.fromEntries(Object.entries(JAWAF_FILE_TYPES).map(([mime, ext]) => [ext, mime as FileMime]))
BY_EXT.jpeg = "image/jpeg"
BY_EXT.markdown = "text/markdown"
const ACCEPT = [...Object.keys(JAWAF_FILE_TYPES), ...Object.values(JAWAF_FILE_TYPES).map((e) => `.${e}`), ".jpeg"].join(",")

/** The file's type as the server knows it (browsers leave `type` empty for .md and some .docx). */
function mimeOf(file: File): FileMime | null {
    if (file.type in JAWAF_FILE_TYPES) return file.type as FileMime
    const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
    return BY_EXT[ext] ?? null
}

/** PUT the bytes straight to R2 (presigned), reporting real progress. */
function putWithProgress(url: string, file: File, type: string, onProgress: (pct: number) => void, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open("PUT", url)
        xhr.setRequestHeader("Content-Type", type)
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)) }
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`The upload failed (${xhr.status}). Try again.`)))
        xhr.onerror = () => reject(new Error("The upload failed. Check the connection and try again."))
        signal.addEventListener("abort", () => { xhr.abort(); reject(new Error("Upload cancelled.")) })
        xhr.send(file)
    })
}

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(bytes < 1024 * 1024 ? 2 : 1)} MB`

/** Ticks one file's reading job while the page is open (several files read side by side). Renders nothing. */
function FileJobTicker({ job, onSettled }: { job: JawafJobView; onSettled: (j: JawafJobView) => void }) {
    useJawafJob(job, { intervalMs: 2000, onSettled })
    return null
}

function FileStatus({ f }: { f: JawafSourceView }) {
    if (f.status === "ready") return <StateBadge dot="sky">Read</StateBadge>
    if (f.status === "failed") return <StateBadge dot="red">Failed</StateBadge>
    return <StateBadge dot="amber">{f.status === "queued" ? "Waiting" : "Reading"}</StateBadge>
}

/**
 * Files: PDF, Word, images and text, read once (PDF text layers directly, scans and images by Sarvam OCR until our
 * own document model). Upload goes browser -> R2 on a presigned PUT, then the file is recorded and read in the
 * background. Each page costs credits once; the list says how many. Without R2 on this server the tab says so plainly
 * instead of failing.
 */
export function FilesTab({ botId, limits, initialFiles, storageReady, canEdit, onJob }: {
    botId: string
    limits: JawafLimits
    initialFiles: JawafSourceView[]
    storageReady: boolean
    canEdit: boolean
    onJob?: (job: JawafJobView) => void
}) {
    const queryClient = useQueryClient()
    const [jobs, setJobs] = React.useState<JawafJobView[]>([])
    const files = useQuery({
        queryKey: JAWAF_KEYS.files(botId),
        queryFn: async () => unwrap(await listJawafFiles(botId)),
        initialData: initialFiles,
        // A file still reading (started in another tab, or by the cron) refreshes its row now and then.
        refetchInterval: (q) => (q.state.data?.some((f) => f.status === "queued" || f.status === "reading") ? 5000 : false),
    })
    const list = files.data ?? []
    const full = list.length >= limits.filesPerBot

    const settled = React.useCallback((j: JawafJobView) => {
        setJobs((prev) => prev.filter((x) => x.id !== j.id))
        queryClient.invalidateQueries({ queryKey: JAWAF_KEYS.files(botId) })
        queryClient.invalidateQueries({ queryKey: JAWAF_KEYS.counts(botId) })
        if (j.status === "done") toast.success("File read", { description: "Jawaf answers from it now." })
        else if (j.errorCode === "credits") toast.error("A file stopped: your workspace is out of credits.")
    }, [botId, queryClient])

    const upload = React.useCallback(async (file: File, onProgress: (pct: number) => void, signal: AbortSignal) => {
        const mimeType = mimeOf(file)
        if (!mimeType) throw new Error("Upload a PDF, Word file, image (PNG or JPG) or text file.")
        const ticket = unwrap(await startJawafFileUpload({ botId, fileName: file.name, size: file.size, mimeType }), "The upload could not start.")
        await putWithProgress(ticket.uploadUrl, file, mimeType, onProgress, signal)
        const res = unwrap(await finishJawafFileUpload({ botId, fileName: file.name, size: file.size, mimeType, key: ticket.key }), "The upload could not be finished.")
        setJobs((prev) => [...prev, res.job])
        onJob?.(res.job)
        await queryClient.invalidateQueries({ queryKey: JAWAF_KEYS.files(botId) })
        return res.source
    }, [botId, onJob, queryClient])

    const remove = async (f: JawafSourceView) => {
        const r = await deleteJawafSource({ botId, id: f.id })
        if (!r.success) { toast.error(r.error ?? "The file could not be deleted."); return }
        toast.success("File deleted", { description: "Jawaf stops answering from it." })
        await queryClient.invalidateQueries({ queryKey: JAWAF_KEYS.files(botId) })
        await queryClient.invalidateQueries({ queryKey: JAWAF_KEYS.counts(botId) })
    }

    return (
        <div className="flex min-w-0 flex-col gap-3">
            {jobs.map((j) => <FileJobTicker key={j.id} job={j} onSettled={settled} />)}
            {!storageReady ? (
                <div className={cn(JAWAF_CARD, "flex items-start gap-3 p-4")}>
                    <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" />
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">File uploads need storage set up</p>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">This server has no file storage yet, so files cannot be added. Website pages, facts, Q&A and notes all work.</p>
                    </div>
                </div>
            ) : canEdit && !full ? (
                <FileDropzone
                    upload={upload}
                    accept={ACCEPT}
                    maxSize={limits.fileMaxBytes}
                    multiple
                    maxFiles={limits.filesPerBot - list.length}
                    removeDone
                    validate={(f) => (mimeOf(f) ? null : `${f.name}: upload a PDF, Word file, image (PNG or JPG) or text file.`)}
                    title="Drop files here, or press to choose"
                    hint={`PDF, Word, PNG, JPG or text - up to ${mb(limits.fileMaxBytes)} each, ${limits.filesPerBot} files per bot. Each page costs ${formatCredits(JAWAF_PRICES.filePageMicro)} credits, read once.`}
                    aria-label="Upload files"
                />
            ) : full ? (
                <p className="text-xs text-neutral-600 dark:text-neutral-400">This bot holds {limits.filesPerBot} files, the most it can. Delete one to add another.</p>
            ) : null}

            {list.length ? (
                <div className={cn(JAWAF_CARD, "overflow-hidden")}>
                    <ScrollArea orientation="vertical" viewportClassName="max-h-[44rem]">
                        <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
                            {list.map((f) => (
                                <li key={f.id} className="flex min-w-0 items-center gap-3 px-4 py-3">
                                    <FileTypeIcon file={{ name: f.fileName, type: f.mimeType }} className="shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm text-neutral-900 dark:text-white">{f.fileName ?? "File"}</p>
                                        <p className="truncate text-xs text-neutral-600 dark:text-neutral-400">
                                            {[
                                                f.fileSize ? mb(f.fileSize) : null,
                                                f.filePages != null ? `${f.filePages} ${f.filePages === 1 ? "page" : "pages"}` : null,
                                                f.filePages != null ? `${formatCredits(f.filePages * JAWAF_PRICES.filePageMicro)} credits` : null,
                                                `added ${formatDay(f.createdAt)}`,
                                            ].filter(Boolean).join(" - ")}
                                        </p>
                                        {f.error ? <p className="truncate text-xs text-red-700 dark:text-red-400" title={f.error}>{f.error}</p> : null}
                                    </div>
                                    <FileStatus f={f} />
                                    {canEdit ? (
                                        <ConfirmPopover title={`Delete ${f.fileName ?? "this file"}?`} description="Jawaf stops answering from it at once. Credits already spent are not returned." confirmLabel="Delete" onConfirm={() => remove(f)} align="end">
                                            <Button type="button" variant="ghost" size="icon-sm" className="shrink-0 cursor-pointer rounded-full text-neutral-500" aria-label={`Delete ${f.fileName ?? "file"}`}>
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </ConfirmPopover>
                                    ) : null}
                                </li>
                            ))}
                        </ul>
                    </ScrollArea>
                </div>
            ) : storageReady ? (
                <p className="text-xs text-neutral-600 dark:text-neutral-400">No files yet. Price lists, brochures, prospectuses and menus answer the most questions.</p>
            ) : null}
        </div>
    )
}
