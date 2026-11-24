"use client"

import * as React from "react"
import type { JawafJobView } from "@/types/jawaf"

const ACTIVE = new Set(["queued", "running"])
export const isJobActive = (job: JawafJobView | null | undefined): boolean => !!job && ACTIVE.has(job.status)

/**
 * Drive a Jawaf reading job while this page is open (plan task 5): POST /api/jawaf/jobs/<id>/tick runs one slice on
 * the server and returns the job; the next tick goes ~`intervalMs` after the answer (a slice can take up to ~12 s, so
 * requests never pile up). Paused while the tab is hidden; the hourly cron carries on when nobody is watching, which
 * is why the page can say "You can leave, we keep going".
 *
 * `onSettled` fires once when the job leaves queued / running (done, failed or cancelled) - the moment to refetch
 * what it produced. `start(job)` follows a newly started job.
 */
export function useJawafJob(initial: JawafJobView | null, opts: { intervalMs?: number; onSettled?: (job: JawafJobView) => void } = {}) {
    const { intervalMs = 1500 } = opts
    const [job, setJob] = React.useState<JawafJobView | null>(initial)
    const [lost, setLost] = React.useState(false)
    const settledRef = React.useRef(opts.onSettled)
    React.useEffect(() => { settledRef.current = opts.onSettled })

    const jobId = job?.id ?? null
    const active = isJobActive(job)

    React.useEffect(() => {
        if (!jobId || !active) return
        let alive = true
        let timer: number | undefined
        let failures = 0
        const tick = async () => {
            if (!alive) return
            if (document.hidden) { timer = window.setTimeout(tick, intervalMs); return }
            try {
                const res = await fetch(`/api/jawaf/jobs/${encodeURIComponent(jobId)}/tick`, { method: "POST", cache: "no-store" })
                if (res.status === 401) { window.location.assign("/signin?stale=1"); return }
                const body: unknown = await res.json().catch(() => null)
                const data = body && typeof body === "object" && "success" in body && body.success === true && "data" in body ? (body.data as JawafJobView) : null
                if (!alive) return
                if (data) {
                    failures = 0
                    setLost(false)
                    setJob(data)
                    if (!ACTIVE.has(data.status)) { settledRef.current?.(data); return }
                } else if (++failures >= 3) setLost(true)
            } catch {
                if (++failures >= 3) setLost(true)
            }
            if (alive) timer = window.setTimeout(tick, failures ? intervalMs * Math.min(failures + 1, 6) : intervalMs)
        }
        timer = window.setTimeout(tick, 200)
        return () => { alive = false; window.clearTimeout(timer) }
        // Restart only for a different job or when it becomes active again.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [jobId, active, intervalMs])

    const start = React.useCallback((next: JawafJobView) => { setLost(false); setJob(next) }, [])
    return { job, active, lost, start }
}

/** 0-100 for a progress bar (indeterminate jobs show 5% so the bar is visible). */
export function jobPercent(job: JawafJobView | null): number {
    if (!job) return 0
    if (job.status === "done") return 100
    if (!job.progress.total) return 5
    return Math.max(5, Math.min(100, Math.round((job.progress.done / job.progress.total) * 100)))
}
