import type { RateLimiter } from "./rate-limiter"

/** What a row-job Workflow instance is started with (instance id = jobId). */
export interface RowJobParams {
    jobId: string
}

/**
 * The bindings (wrangler.jsonc) plus the secrets from the env files (uploaded by scripts/deploy.mts --secrets-file;
 * `wrangler dev` reads .env.local / .env). Secrets reach the engine through process.env (nodejs_compat); `ensureEnv`
 * copies them over first, so module-level reads (the database URL) always see them.
 */
export interface Env {
    JAWAF_READ: Workflow<RowJobParams>
    JAWAF_FILE: Workflow<RowJobParams>
    JAWAF_DRAFT: Workflow<RowJobParams>
    JAWAF_REINDEX: Workflow<RowJobParams>
    JAWAF_MAP: Workflow<RowJobParams>
    JAWAF_EVAL: Workflow<RowJobParams>
    JAWAF_REREADS: Workflow<Record<string, never>>
    JAWAF_DIGEST: Workflow<Record<string, never>>
    RATE_LIMITER: DurableObjectNamespace<RateLimiter>
    [secret: string]: unknown
}

let copied = false

/** Copy string vars / secrets into process.env once per isolate (before the engine is imported). */
export function ensureEnv(env: Env): void {
    if (copied) return
    for (const [k, v] of Object.entries(env)) {
        if (typeof v === "string" && process.env[k] === undefined) process.env[k] = v
    }
    copied = true
}
