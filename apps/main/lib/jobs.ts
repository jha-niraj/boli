import "server-only"
import { getCloudflareContext } from "@opennextjs/cloudflare"
import { createJobsClient, type JobsRpc } from "@repo/jobs"

/**
 * This app's door to the boli-jobs Worker (apps/jobs/CLAUDE.md): Workflows for long jobs and the RateLimiter Durable
 * Object, through the JOBS service binding (wrangler.jsonc, top level and env.prod). Used ONLY when
 * JOBS_RUNNER=workflow; with JOBS_RUNNER=local (the default, and `next dev`) the binding is never touched and jobs run
 * through the tick route + hourly cron, limits through the database / memory, exactly as before.
 */
export const jobs = createJobsClient({
    binding: async () => ((await getCloudflareContext({ async: true })).env as { JOBS?: JobsRpc }).JOBS,
})
