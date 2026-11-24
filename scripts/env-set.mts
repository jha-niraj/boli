import { createInterface } from 'readline/promises';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { join } from 'path';
import { APPS_WITH_ENV, appDir, hostLabel, readEnv } from './env-files.mts';

/**
 * `pnpm env:set <prod|staging|local> <KEY>`: set one value in every app whose file already has that key, so a shared value
 * (the production database URL) is pasted once. Asked for at the prompt, so it never lands in shell history or a chat.
 */
const FILES: Record<string, string> = { prod: '.env.production', staging: '.env', local: '.env.local' };
const [target, key] = process.argv.slice(2);
const file = target ? FILES[target] : undefined;
if (!file || !key) {
    console.error('Usage: pnpm env:set <prod|staging|local> <KEY>');
    process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const value = (await rl.question(`Paste ${key} for ${file}: `)).trim();
rl.close();
if (!value || /["\n]/.test(value)) {
    console.error('Empty, or it contains a double quote. Nothing changed.');
    process.exit(1);
}

const shown = /^postgres/.test(value) ? `host ${hostLabel(value)}` : 'value hidden';
for (const app of APPS_WITH_ENV) {
    const path = join(appDir(app), file);
    if (!existsSync(path) || !readEnv(path).has(key)) continue;
    const next = readFileSync(path, 'utf8').replace(new RegExp(`^${key}=.*$`, 'm'), () => `${key}="${value}"`);
    writeFileSync(`${path}.tmp`, next, { mode: 0o600 });
    renameSync(`${path}.tmp`, path);
    console.log(`${app}/${file}: ${key} set (${shown})`);
}
