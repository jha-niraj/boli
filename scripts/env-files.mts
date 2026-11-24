import { existsSync, readFileSync, renameSync, rmSync } from 'fs';
import { join } from 'path';

/**
 * Shared by deploy, env-check, env-set and env-restore. In each app: `.env.local` = development, `.env` =
 * staging, `.env.production` = production (AGENTS.md "Environments"). Per app, not one file for the repo,
 * because `wrangler deploy --secrets-file` uploads everything in the file to that Worker.
 */

export const ROOT = join(import.meta.dirname, '..');
export const APPS_WITH_ENV = ['main', 'admin', 'web'] as const; // add every new deployable here
export const STANDARD_ENV_FILES = ['.env', '.env.local', '.env.production', '.env.production.local'];

export const appDir = (app: string) => join(ROOT, 'apps', app);

export function readEnv(path: string): Map<string, string> {
    const out = new Map<string, string>();
    for (const line of readFileSync(path, 'utf8').split('\n')) {
        const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
        if (m) out.set(m[1]!, m[2]!.trim().replace(/^(["'])(.*)\1$/, '$2'));
    }
    return out;
}

/** The host's first label: all anyone needs to see to know which database a file points at. Never the whole URL. */
export function hostLabel(url: string | undefined): string {
    if (!url) return '(none)';
    try {
        return new URL(url).hostname.split('.')[0] ?? '(unknown)';
    } catch {
        return url.startsWith('__') ? url : '(not a URL)';
    }
}

/** `__LIKE_THIS__`: a value somebody still has to fill in. A deploy refuses it. */
export const isPlaceholder = (value: string) => /^__.*__$/.test(value);

/** Put back whatever a killed deploy left moved aside. Answers how many files it restored. */
export function restoreEnvFiles(app: string, log: (line: string) => void): number {
    const dir = appDir(app);
    let restored = 0;
    for (const name of STANDARD_ENV_FILES) {
        const bak = join(dir, `${name}.deploy-bak`);
        if (!existsSync(bak)) continue;
        rmSync(join(dir, name), { force: true });
        renameSync(bak, join(dir, name));
        log(`${app}: restored ${name}`);
        restored += 1;
    }
    return restored;
}
