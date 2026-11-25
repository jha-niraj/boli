import "server-only"
import { getCloudflareContext } from "@opennextjs/cloudflare"
import { createJobsClient, type JobsRpc } from "@repo/jobs"

/**
 * The admin's door to the boli-jobs Worker (apps/jobs/CLAUDE.md), through the JOBS service binding (wrangler.jsonc,
 * top level and env.prod). Used ONLY when JOBS_RUNNER=workflow: then the quality check, the embedding check and job
 * dispatch go to boli-jobs directly. With JOBS_RUNNER=local (the default) the admin keeps calling main's HTTP bridge
 * (lib/jawaf-bridge.ts), exactly as before.
 */
export const jobs = createJobsClient({
    binding: async () => ((await getCloudflareContext({ async: true })).env as { JOBS?: JobsRpc }).JOBS,
})
