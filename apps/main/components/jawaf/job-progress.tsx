"use client"

import { AlertCircle, CheckCircle2 } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { SpinnerDots } from "@repo/brand/loaders/spinners"
import { cn } from "@repo/ui/lib/utils"
import { ROUTES } from "@/lib/navigation"
import type { JawafJobView } from "@/types/jawaf"
import { isJobActive, jobPercent } from "./use-jawaf-job"

/** A bar in the sky accent (the one place colour carries the datum: how far along). */
export function SkyBar({ percent, className }: { percent: number; className?: string }) {
    return (
        <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className={cn("h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800", className)}>
            <div className="h-full rounded-full bg-boli-sky transition-[width] duration-500 ease-out motion-reduce:transition-none dark:bg-boli-sky-dark" style={{ width: `${percent}%` }} />
        </div>
    )
}

/**
 * One line of job progress for the Knowledge page and the setup's reading step: the label the job writes ("Reading 12
 * of 40 pages"), the bar, and what to do when it stopped (out of credits -> Add credits, a plain sentence otherwise).
 */
export function JobProgress({ job, lost, className }: { job: JawafJobView | null; lost?: boolean; className?: string }) {
    if (!job) return null
    const active = isJobActive(job)
    if (job.status === "done") {
        return (
            <p className={cn("flex items-center gap-1.5 text-xs text-neutral-700 dark:text-neutral-300", className)}>
                <CheckCircle2 className="h-3.5 w-3.5 text-boli-sky-ink" /> {job.progress.label || "Done"}
            </p>
        )
    }
    if (!active) {
        return (
            <div className={cn("flex min-w-0 flex-wrap items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300", className)}>
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-700 dark:text-red-400" />
                <span className="min-w-0">
                    {job.errorCode === "credits"
                        ? `Stopped: your workspace is out of credits (${job.progress.done} of ${job.progress.total} read). Add credits, then read again.`
                        : job.error || "Reading stopped. Try again."}
                </span>
                {job.errorCode === "credits" ? (
                    <Button asChild size="sm" variant="outline" className="h-7 cursor-pointer">
                        <AppLink href={`${ROUTES.billing}?tab=plans`}>Add credits</AppLink>
                    </Button>
                ) : null}
            </div>
        )
    }
    return (
        <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
            <div className="flex min-w-0 items-center justify-between gap-2 text-xs">
                <span className="flex min-w-0 items-center gap-1.5 text-neutral-800 dark:text-neutral-200">
                    <SpinnerDots size={14} />
                    <span className="truncate">{job.progress.label || (job.status === "queued" ? "Waiting to start" : "Working")}</span>
                </span>
                {job.progress.total ? <span className="shrink-0 tabular-nums text-neutral-600 dark:text-neutral-400">{job.progress.done} / {job.progress.total}</span> : null}
            </div>
            <SkyBar percent={jobPercent(job)} />
            {lost ? <p className="text-xs text-neutral-600 dark:text-neutral-400">Lost touch with the server - still trying. The reading carries on either way.</p> : null}
        </div>
    )
}
