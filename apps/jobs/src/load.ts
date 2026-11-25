import { ensureEnv, type Env } from "./env"

/** The engine, loaded after the env is in place (see engine.ts). */
export async function engine(env: Env) {
    ensureEnv(env)
    return import("./engine")
}
