/**
 * THE switch: where long jobs run. `JOBS_RUNNER=workflow` = Cloudflare Workflows in the boli-jobs Worker (through the
 * JOBS service binding) and the RateLimiter Durable Object for limits; anything else, or unset, = `local`: the
 * jawaf_job row driven by the page's tick poll and the hourly cron, and the database / in-memory limits. Read per call
 * (Workers fill process.env per isolate; a test can flip it).
 */
export type JobsRunner = "workflow" | "local"

export function jobsRunner(): JobsRunner {
    return (process.env.JOBS_RUNNER ?? "").trim().toLowerCase() === "workflow" ? "workflow" : "local"
}
