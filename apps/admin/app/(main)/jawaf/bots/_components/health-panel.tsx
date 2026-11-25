"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { RefreshCw, RotateCcw } from "lucide-react"
import { formatMicroCredits } from "@repo/billing/plans"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { InlineNote } from "@repo/ui/components/ui/inline-note"
import { Progress } from "@repo/ui/components/ui/progress"
import { Skeleton } from "@repo/ui/components/ui/skeleton"
import { toast } from "@repo/ui/components/ui/toast"
import { driveJawafJob, getJawafBotHealth, getJawafEmbedHealth, rereadJawafBot } from "@/actions/jawaf/bots.action"
import { ROUTES } from "@/lib/navigation"
import { Dot, Field, fmtDate, fmtInt, JAWAF_KEYS, SectionTitle } from "../../_components/jawaf-bits"

/**
 * Health: last read, failed pages, stuck jobs, the embedding server, the answer rate this week, top unanswered (demo
 * bots only). Re-read now / Retry failed queue a job, then this panel drives it one slice at a time through the app
 * (the same slices the Knowledge page runs) and shows the progress; closing the sheet stops driving - the app's cron
 * picks it up.
 */
export function HealthPanel({ botId, house, canWrite }: { botId: string; house: boolean; canWrite: boolean }) {
    const queryClient = useQueryClient()
    const health = useQuery({
        queryKey: JAWAF_KEYS.health(botId),
        queryFn: async () => {
            const r = await getJawafBotHealth(botId)
            if (!r.success) throw new Error(r.error ?? "Could not load the health")
            return r.data
        },
    })
    const embed = useQuery({
        queryKey: JAWAF_KEYS.embed,
        queryFn: async () => {
            const r = await getJawafEmbedHealth()
            if (!r.success) throw new Error(r.error ?? "Could not check")
            return r.data
        },
        staleTime: 60_000,
    })
    const [job, setJob] = React.useState<{ id: string; label: string; done: number; total: number; status: string } | null>(null)

    // Drive a queued job slice by slice while the panel is open (each call runs < ~25 s on the app).
    React.useEffect(() => {
        if (!job || (job.status !== "queued" && job.status !== "running")) return
        let stop = false
        const t = setTimeout(async () => {
            const r = await driveJawafJob(job.id)
            if (stop) return
            if (!r.success) {
                toast.error(r.error ?? "The read could not be advanced. The app's hourly job will carry on.")
                setJob((j) => (j ? { ...j, status: "paused" } : j))
                return
            }
            setJob({ id: job.id, label: r.data.label, done: r.data.done, total: r.data.total, status: r.data.status })
            if (r.data.status !== "queued" && r.data.status !== "running") {
                if (r.data.status === "done") toast.success("Read finished")
                else if (r.data.error) toast.error(r.data.error)
                await queryClient.invalidateQueries({ queryKey: JAWAF_KEYS.all })
            }
        }, 600)
        return () => { stop = true; clearTimeout(t) }
    }, [job, queryClient])

    const reread = useMutation({
        mutationFn: async (mode: "all" | "failed") => {
            const r = await rereadJawafBot({ botId, mode })
            if (!r.success) throw new Error(r.error ?? "The read could not be started")
            return r.data
        },
        onSuccess: (j) => setJob({ id: j.id, label: j.label, done: j.done, total: j.total, status: j.status }),
        onError: (e) => toast.error(e instanceof Error ? e.message : "The read could not be started"),
    })

    const h = health.data
    const running = !!job && (job.status === "queued" || job.status === "running")
    return (
        <section className="flex min-w-0 flex-col gap-2">
            <SectionTitle>Health</SectionTitle>
            {!h ? (
                <div className="flex flex-col gap-2">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-8 w-full rounded-lg" />)}</div>
            ) : (
                <>
                    <dl className="flex min-w-0 flex-col divide-y divide-neutral-200 dark:divide-neutral-800">
                        <Field label="Last read">{h.lastReadAt ? fmtDate(h.lastReadAt, true) : h.pagesRead ? "Not recorded" : "Not read yet"}</Field>
                        <Field label="Pages read">{fmtInt(h.pagesRead)} of {fmtInt(h.pagesIncluded)} included</Field>
                        <Field label="Failed pages">{h.failedCount ? <Dot tone="warn">{fmtInt(h.failedCount)}</Dot> : "None"}</Field>
                        <Field label="Jobs">{h.stuckJobs.length ? <Dot tone="warn">{h.stuckJobs.length} stuck (no progress for 15 min)</Dot> : h.activeJob ? `${h.activeJob.label}` : "Nothing running"}</Field>
                        <Field label="Embedding server">
                            {embed.data ? (
                                embed.data.reachable === null ? <span className="text-neutral-500 dark:text-neutral-400">{embed.data.note}</span>
                                    : embed.data.reachable ? <Dot tone="live">Reachable{embed.data.ms !== null ? `, ${embed.data.ms} ms` : ""}</Dot>
                                        : <Dot tone="warn">{embed.data.note ?? "Not reachable"}</Dot>
                            ) : embed.isError ? "Could not check" : <Skeleton className="ml-auto h-4 w-24 rounded" />}
                        </Field>
                        <Field label="Answered, last 7 days">{h.week.answerRate === null ? "Not asked this week" : `${h.week.answerRate}% of ${fmtInt(h.week.questions)}`}</Field>
                        <Field label="Workspace balance">{formatMicroCredits(h.workspaceBalanceMicro)} credits</Field>
                    </dl>
                    {h.failedPages.length ? (
                        <ul className="flex min-w-0 flex-col gap-1 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800/50">
                            {h.failedPages.map((p) => (
                                <li key={p.id} className="min-w-0">
                                    <span className="block truncate font-mono text-xs text-neutral-800 dark:text-neutral-200">{p.url ?? "File"}</span>
                                    <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">{p.error ?? "Could not be read"}</span>
                                </li>
                            ))}
                        </ul>
                    ) : null}
                    {house && h.topUnanswered ? (
                        <div className="flex min-w-0 flex-col gap-1">
                            <p className="text-sm font-medium text-neutral-900 dark:text-white">Not answered lately</p>
                            {h.topUnanswered.length ? (
                                <ul className="flex min-w-0 flex-col divide-y divide-neutral-200 dark:divide-neutral-800">
                                    {h.topUnanswered.map((u) => (
                                        <li key={`${u.conversationId}-${u.askedAt}`} className="min-w-0">
                                            <AppLink href={ROUTES.jawafConversation(u.conversationId)} className="flex min-w-0 items-center gap-3 py-1.5 hover:underline">
                                                <span className="min-w-0 flex-1 truncate text-sm text-neutral-800 dark:text-neutral-200">{u.question}</span>
                                                <span className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">{fmtDate(u.askedAt, true)}</span>
                                            </AppLink>
                                        </li>
                                    ))}
                                </ul>
                            ) : <p className="text-sm text-neutral-600 dark:text-neutral-400">Every recent question was answered.</p>}
                        </div>
                    ) : null}
                </>
            )}
            {job ? (
                <div className="flex min-w-0 flex-col gap-1.5">
                    <div className="flex min-w-0 items-center justify-between gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                        <span className="truncate">{job.label}</span>
                        <span className="shrink-0 tabular-nums">{job.total ? `${job.done} / ${job.total}` : ""}</span>
                    </div>
                    <Progress value={job.total ? (100 * job.done) / job.total : running ? 5 : 100} />
                    {job.status === "paused" ? <InlineNote>Stopped driving it from here. The app&apos;s hourly job carries on, or open Knowledge in Jawaf.</InlineNote> : null}
                </div>
            ) : null}
            {canWrite ? (
                <div className="flex min-w-0 flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" className="cursor-pointer gap-1.5 rounded-xl" disabled={running || reread.isPending} onClick={() => reread.mutate("all")}>
                        {reread.isPending && reread.variables === "all" ? <InlineLoader size={14} label="Starting" /> : <RefreshCw className="h-3.5 w-3.5" />} Re-read now
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="cursor-pointer gap-1.5 rounded-xl" disabled={running || reread.isPending || !h?.failedCount} onClick={() => reread.mutate("failed")}>
                        {reread.isPending && reread.variables === "failed" ? <InlineLoader size={14} label="Starting" /> : <RotateCcw className="h-3.5 w-3.5" />} Retry failed
                    </Button>
                </div>
            ) : null}
        </section>
    )
}
