/**
 * Everything the Worker runs from the engine, behind ONE lazy import (`engine(env)`), so @repo/db and friends are first
 * evaluated after `ensureEnv` has put the secrets in process.env (they read DATABASE_URL etc. at module load).
 */
export { advanceJob, dueJobIds, dueRereads, queueReread, failIfActive, loadJobById, collectDigest, digestByWorkspace, sendDigest } from "@repo/jawaf/jobs"
export type { AdvanceResult, DigestBotLine } from "@repo/jawaf/jobs"
export { loadBotById } from "@repo/jawaf/bots"
export { evalQuestions, embedHealth } from "@repo/jawaf/eval"
