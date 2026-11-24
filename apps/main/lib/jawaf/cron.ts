import "server-only"
import { defineCronJob } from "@repo/cron"
import { queueWeeklyRereads, runDueJobs } from "./jobs"

/**
 * Jawaf's hourly cron job (production only - staging has no crons): queue the weekly re-reads that are due, then run
 * slices of any job nobody is polling (a closed tab) for up to ~40 s. Registered in app/api/cron/[job]/route.ts.
 * In dev and staging the page's poll (`POST /api/jawaf/jobs/<id>/tick`) drives jobs instead; a manual run:
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3100/api/cron/jawaf-jobs
 */
export const jawafJobsCron = defineCronJob({
    name: "jawaf-jobs",
    slot: "hourly",
    description: "Queues weekly Jawaf website re-reads and advances Jawaf reading jobs nobody is watching.",
    async run({ now }) {
        const queued = await queueWeeklyRereads(now)
        const { slices, finished } = await runDueJobs(40_000)
        return { rereadsQueued: queued, slices, finished }
    },
})
