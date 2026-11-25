/**
 * The job registry: which Workflow binding (apps/jobs wrangler.jsonc `workflows[].binding`) runs which job.
 *
 * ROW jobs carry a jawaf_job row (progress, cursor, lease); the app creates the row and dispatches it, and the Workflow
 * instance id IS the row id. SCHEDULED jobs have no row: the jobs Worker's cron (production only) starts them.
 *
 * Adding a job: a kind here + a step function in packages/jawaf/src/jobs/steps.ts (row jobs) + a Workflow class and
 * binding in apps/jobs (apps/jobs/CLAUDE.md "Add a job").
 */
export const ROW_JOB_WORKFLOWS = {
    read: "JAWAF_READ",
    file: "JAWAF_FILE",
    draft: "JAWAF_DRAFT",
    reindex: "JAWAF_REINDEX",
    map: "JAWAF_MAP",
    eval: "JAWAF_EVAL",
} as const

export type RowJobKind = keyof typeof ROW_JOB_WORKFLOWS

export const SCHEDULED_WORKFLOWS = {
    /** Hourly: queue the weekly re-reads that are due, then resume orphaned row jobs. */
    rereads: "JAWAF_REREADS",
    /** Daily: the owner digest + follow-up reminders (skeleton: counts only, sends nothing yet). */
    digest: "JAWAF_DIGEST",
} as const

export type ScheduledJobName = keyof typeof SCHEDULED_WORKFLOWS

export function isRowJobKind(kind: string): kind is RowJobKind {
    return Object.prototype.hasOwnProperty.call(ROW_JOB_WORKFLOWS, kind)
}
