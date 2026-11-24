/**
 * The only way to deploy: `pnpm deploy:staging <app|all>` / `pnpm deploy:prod <app|all>`. A person runs these, never an
 * agent. Each guard below was paid for by a bad deploy in an earlier project.
 *
 * WHY THE ENV FILES ARE MOVED. `next build` reads `.env*` off disk, and under NODE_ENV=production `.env.local` OUTRANKS
 * `.env.production`, so a machine holding `.env.local` bakes http://localhost into the client bundle, where no runtime
 * variable can reach it. OpenNext also bundles those files into the Worker as fallbacks, so a stray `.env.production` ships
 * production's keys inside a staging build. So: every standard file is moved aside, the chosen one is staged as
 * `.env.production`, the build reads exactly that, and the originals come back in a `finally`. Keys that came from an env file
 * are also removed from this process, because `@next/env` never overrides a value that is already set.
 *
 * WHY THE TOP LEVEL OF wrangler IS STAGING. A bare `wrangler deploy` then cannot reach the live app.
 */
import { spawnSync } from 'child_process';
import { copyFileSync, existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline/promises';
import { ROOT, STANDARD_ENV_FILES, appDir, hostLabel, isPlaceholder, readEnv, restoreEnvFiles } from './env-files.mts';

type Target = 'staging' | 'prod';
const ENV_FILE: Record<Target, string> = { staging: '.env', prod: '.env.production' };

/** In deploy order: what others call goes first. */
const APPS: Record<string, { next: boolean; memory?: number; before?: string[] }> = {
    // Add every deployable here, in deploy order: what others call goes first.
    admin: { next: true, memory: 4096 },
    main: { next: true },
    // The public site (bolihq.com). Last: it only links to main, nothing calls it.
    web: { next: true },
};

const [target, which] = process.argv.slice(2) as [Target, string];
if (!target || !(target in ENV_FILE) || !which || !(which === 'all' || which in APPS)) {
    console.error(`Usage: pnpm deploy:<staging|prod> <${Object.keys(APPS).join('|')}|all>`);
    process.exit(1);
}
const chosen = which === 'all' ? Object.keys(APPS) : [which];

function run(cmd: string, args: string[], cwd: string, env: NodeJS.ProcessEnv = process.env): void {
    const r = spawnSync(cmd, args, { cwd, env, stdio: 'inherit' });
    if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed in ${cwd}`);
}
const git = (args: string[]) => spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' }).stdout.trim();

/** Anything here means this file must not be deployed, whatever else is true. */
function envProblems(app: string): string[] {
    const dir = appDir(app);
    // Without a pinned account, wrangler deploys to whichever account this machine is logged in to: on 2026-11-05 that
    // was another company's account.
    const config = ['wrangler.jsonc', 'wrangler.toml'].map((f) => join(dir, f)).find((f) => existsSync(f));
    if (!config || !/^\s*"?account_id"?\s*[:=]\s*"[0-9a-f]{32}"/m.test(readFileSync(config, 'utf8'))) {
        return [`${app}: no account_id in its wrangler file, so this could deploy to the wrong Cloudflare account`];
    }
    const file = join(dir, ENV_FILE[target]);
    if (!existsSync(file)) return [`${app}: ${ENV_FILE[target]} not found`];
    const env = readEnv(file);
    const out: string[] = [];
    const holes = [...env].filter(([, v]) => isPlaceholder(v)).map(([k]) => k);
    if (holes.length) out.push(`${app}: still to fill in: ${holes.join(', ')}`);
    const local = [...env].filter(([, v]) => /localhost|127\.0\.0\.1/.test(v)).map(([k]) => k);
    if (local.length) out.push(`${app}: points at localhost: ${local.join(', ')}`);
    if (target === 'prod' && existsSync(join(dir, '.env')) && env.has('DATABASE_URL') && env.get('DATABASE_URL') === readEnv(join(dir, '.env')).get('DATABASE_URL')) {
        out.push(`${app}: .env.production uses the STAGING database`);
    }
    return out;
}

const problems = chosen.flatMap(envProblems);
if (target === 'prod') {
    const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
    const dirty = git(['status', '--porcelain']).split('\n').filter(Boolean).length;
    const behind = git(['rev-list', '--count', 'HEAD..origin/main']);
    if (branch !== 'main') problems.push(`on "${branch}", not main`);
    if (dirty) problems.push(`${dirty} uncommitted change(s): what is not committed exists nowhere, so the next deploy silently reverts it`);
    if (behind && behind !== '0') problems.push(`${behind} commit(s) behind origin/main: deploying now undoes what was pushed`);
}
if (problems.length) {
    console.error(`\nREFUSING TO DEPLOY TO ${target.toUpperCase()}\n\n  - ${problems.join('\n  - ')}\n`);
    if (process.env.DEPLOY_ANYWAY !== '1' || problems.some((p) => /fill in|localhost|STAGING database|not found|account_id/.test(p))) process.exit(1);
    console.error('DEPLOY_ANYWAY=1: continuing past the git checks.\n');
}

if (target === 'prod') {
    // Typed, not y/n: a reflex keypress is exactly what this is here to stop.
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const typed = await rl.question(`Deploying to PRODUCTION: ${chosen.join(', ')}.\nType "prod" to continue: `);
    rl.close();
    if (typed.trim() !== 'prod') {
        console.error('Cancelled.');
        process.exit(1);
    }
}

function deploy(app: string): void {
    const cfg = APPS[app]!;
    const dir = appDir(app);
    const envFile = ENV_FILE[target];
    const hasEnv = existsSync(join(dir, envFile));
    const wranglerEnv = target === 'prod' ? ['--env', 'prod'] : [];
    const moved = STANDARD_ENV_FILES.filter((f) => existsSync(join(dir, f)));
    const fromFiles = new Set(moved.flatMap((f) => [...readEnv(join(dir, f)).keys()]));
    const secrets = join(dir, '.env.deploy-secrets');

    console.log(`\n[deploy] ${app} -> ${target}, from ${hasEnv ? envFile : 'no env file'}, database ${hostLabel(hasEnv ? readEnv(join(dir, envFile)).get('DATABASE_URL') : undefined)}`);
    if (hasEnv) {
        // Blank means "not set yet" (live payment keys): uploading an empty secret would read as set.
        const lines = [...readEnv(join(dir, envFile))].filter(([, v]) => v !== '').map(([k, v]) => `${k}="${v}"`);
        writeFileSync(secrets, `${lines.join('\n')}\n`, { mode: 0o600 });
    }
    moved.forEach((f) => renameSync(join(dir, f), join(dir, `${f}.deploy-bak`)));

    const onSignal = (signal: NodeJS.Signals) => {
        console.log(`\n[deploy] ${signal}: restoring env files before exiting`);
        restoreEnvFiles(app, console.log);
        rmSync(secrets, { force: true });
        process.exit(130);
    };
    process.once('SIGINT', onSignal);
    process.once('SIGTERM', onSignal);

    try {
        if (hasEnv) copyFileSync(join(dir, `${envFile}.deploy-bak`), join(dir, '.env.production'));
        const env: NodeJS.ProcessEnv = { ...process.env };
        for (const key of fromFiles) delete env[key];
        if (cfg.next) {
            env.NODE_OPTIONS = `--max-old-space-size=${cfg.memory ?? 6144}`;
            if (cfg.before) run(cfg.before[0]!, cfg.before.slice(1), dir, env);
            run('npx', ['opennextjs-cloudflare', 'build', ...wranglerEnv], dir, env);
        }
        run('npx', ['wrangler', 'deploy', ...wranglerEnv, ...(hasEnv ? ['--secrets-file', secrets] : [])], dir, env);
    } finally {
        // `finally`, so a failed build cannot leave the machine without its env files.
        rmSync(join(dir, '.env.production'), { force: true });
        rmSync(secrets, { force: true });
        restoreEnvFiles(app, () => {});
        process.removeListener('SIGINT', onSignal);
        process.removeListener('SIGTERM', onSignal);
        console.log(`[deploy] ${app}: env files restored`);
    }
}

for (const app of chosen) deploy(app);
console.log(`\n[deploy] ${target} done: ${chosen.join(', ')}`);
