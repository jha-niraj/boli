// The ONE cron route (one dispatcher beats a route.ts per job - Worker size). worker.ts `scheduled()` POSTs
// /api/cron/hourly and /api/cron/daily with `Authorization: Bearer ${CRON_SECRET}`; a job name instead of a slot runs
// that job alone (manual: `curl -X POST -H "Authorization: Bearer $CRON_SECRET" .../api/cron/prune-cron-runs`).
import { renewalRemindersJob } from '@repo/billing'
import { BUILT_IN_JOBS, authorizeCronRequest, isCronSlot, runCronSlot, type CronJob } from '@repo/cron'
import { ok } from '@repo/errors'
import { jawafJobsCron } from '@/lib/jawaf/cron'

export const dynamic = 'force-dynamic'

/** Every job this app runs. Add yours here (defineCronJob from @repo/cron). */
const JOBS: readonly CronJob[] = [...BUILT_IN_JOBS, renewalRemindersJob, jawafJobsCron]

export async function POST(request: Request, { params }: { params: Promise<{ job: string }> }): Promise<Response> {
    if (!authorizeCronRequest(request)) {
        return Response.json({ success: false, error: 'Unauthorized', kind: 'auth' }, { status: 401 })
    }
    const { job } = await params
    if (isCronSlot(job)) return Response.json(ok(await runCronSlot(job, JOBS)))

    const single = JOBS.find((j) => j.name === job)
    if (!single) return Response.json({ success: false, error: `No cron slot or job named "${job}"`, kind: 'notfound' }, { status: 404 })
    const summary = await runCronSlot(single.slot, JOBS, { only: single.name })
    return Response.json(ok(summary), { status: summary.failed > 0 ? 500 : 200 })
}
