/**
 * @repo/jawaf - Jawaf's engine and its job steps, shared by apps/main (the product, the local job runner) and apps/jobs
 * (the Workflows). Framework-free on purpose: no `next/*`, no `server-only`, no `@/` paths, so a plain Worker and a tsx
 * script can run it. apps/main/lib/jawaf/<module>.ts re-exports each module (with `server-only` where it had it).
 *
 * Import a module by its subpath (`@repo/jawaf/jobs`, `@repo/jawaf/answer`); this index re-exports only the job API.
 */
export * from "./jobs/index"
export type { BotRow } from "./bots"
export type { JawafAnswerSource, JawafAnswerStatus, JawafJobProgress, JawafJobView } from "./types"
