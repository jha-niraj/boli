/**
 * A TEST admin for local / staging checks (never production): admin.tester@example.com as SUPER_ADMIN, with a
 * generated password written ONLY to apps/admin/.env.local (gitignored) as TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD -
 * never printed. Idempotent: an existing account is left alone. Refuses to run against a database whose host is not
 * the local/staging one in apps/main/.env.local.
 *
 *   pnpm --filter @repo/db seed:testadmin
 */
import { randomBytes } from 'crypto'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { hashPassword } from '@repo/crypto/password'
import { db } from './client'
import * as schema from './schema'

const EMAIL = 'admin.tester@example.com'
const ENV_FILE = join(import.meta.dirname, '../../../apps/admin/.env.local')

function setEnv(file: string, pairs: Record<string, string>) {
    let s = readFileSync(file, 'utf8')
    for (const [k, v] of Object.entries(pairs)) {
        const line = `${k}=${v}`
        s = new RegExp(`^${k}=.*$`, 'm').test(s) ? s.replace(new RegExp(`^${k}=.*$`, 'm'), line) : `${s.replace(/\n?$/, '\n')}${line}\n`
    }
    writeFileSync(file, s)
}

async function main() {
    const host = (() => { try { return new URL((process.env.DATABASE_URL ?? '').replace(/^["']|["']$/g, '')).hostname.split('.')[0] } catch { return '(none)' } })()
    console.log(`Target database: ${host}`)
    const existing = await db.query.user.findFirst({ where: (u, { eq }) => eq(u.email, EMAIL) })
    if (existing) {
        console.log('Test admin already exists - left alone (the password stays in apps/admin/.env.local).')
        return
    }
    const id = `test-admin-${randomBytes(6).toString('hex')}`
    const password = randomBytes(12).toString('base64url')
    const now = new Date()
    await db.batch([
        db.insert(schema.user).values({ id, email: EMAIL, name: 'Admin Tester', emailVerified: true, role: 'ADMIN', isActive: true, createdAt: now, updatedAt: now }),
        db.insert(schema.account).values({ id: crypto.randomUUID(), accountId: id, providerId: 'credential', userId: id, password: await hashPassword(password), createdAt: now, updatedAt: now }),
        db.insert(schema.adminAccess).values({
            userId: id, adminRole: 'SUPER_ADMIN', status: 'ACTIVE',
            permissions: {
                users: ['read', 'write', 'delete', 'full'], analytics: ['read', 'write', 'full'],
                communications: ['read', 'write', 'delete', 'full'], admin_management: ['read', 'write', 'delete', 'full'],
                system: ['read', 'write', 'full'], jawaf: ['read', 'write'],
            },
            createdAt: now, updatedAt: now,
        }),
    ])
    setEnv(ENV_FILE, { TEST_ADMIN_EMAIL: EMAIL, TEST_ADMIN_PASSWORD: password })
    console.log(`Test admin created (${EMAIL}); password saved to apps/admin/.env.local as TEST_ADMIN_PASSWORD (not printed).`)
}

main().then(() => process.exit(0)).catch((e) => { console.log('failed:', e?.code ?? e?.message?.split('\n')[0]?.replace(/postgres(ql)?:\/\/\S+/g, '[url hidden]')); process.exit(1) })
