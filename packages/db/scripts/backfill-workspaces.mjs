// One-time move of existing rows to workspaces (plan/main/jawaf/jawaf-v1.md, Wave 1 task 1). Run AFTER
// scripts/workspaces.sql. Previews by default; writes only with --apply. Idempotent: every step only touches rows
// that are not done yet, so a second run changes nothing.
//   pnpm --filter @repo/db backfill:workspaces            preview (counts + a sample)
//   pnpm --filter @repo/db backfill:workspaces --apply    write
//
// Per user: a personal workspace ("<First name>'s workspace") + an owner membership; their pre-workspace billing
// account ('user', user.id) is MOVED in place to ('workspace', workspace.id) - same id, so the balance, the ledger and
// keys like `welcome:<accountId>` are untouched; and workspace_id is set on their api_key, inference_request and
// ai_conversation rows. A person who somehow has BOTH a user and a workspace account is reported, never merged.
// Set-based SQL (no query per user). Prints only host labels and counts - never an env value.
import { neon } from '@neondatabase/serverless'

const apply = process.argv.includes('--apply')
const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is not set')
const sql = neon(url)
const q = async (text) => (await sql.query(text, [], { fullResults: true }))
const one = async (text) => (await q(text)).rows[0]

console.log(`Target database: ${new URL(url).hostname.split('.')[0]}${apply ? '' : ' (preview - add --apply to write)'}`)

const NAME = `CASE WHEN coalesce(split_part(trim(u.name), ' ', 1), '') = '' THEN 'My workspace'
                  ELSE left(split_part(trim(u.name), ' ', 1), 40) || '''s workspace' END`

const STEPS = [
    {
        label: 'personal workspaces created',
        count: `SELECT count(*)::int AS n FROM "user" u WHERE NOT EXISTS (SELECT 1 FROM workspace w WHERE w.personal_owner_id = u.id)`,
        write: `INSERT INTO workspace (id, name, personal_owner_id, created_by_id, created_at, updated_at)
                SELECT gen_random_uuid()::text, ${NAME}, u.id, u.id, now(), now() FROM "user" u
                WHERE NOT EXISTS (SELECT 1 FROM workspace w WHERE w.personal_owner_id = u.id)
                ON CONFLICT DO NOTHING`,
    },
    {
        label: 'owner memberships created',
        // In preview the workspaces do not exist yet: every user without a workspace also needs a membership.
        count: `SELECT (SELECT count(*) FROM workspace w WHERE w.personal_owner_id IS NOT NULL AND NOT EXISTS
                    (SELECT 1 FROM workspace_member m WHERE m.workspace_id = w.id AND m.user_id = w.personal_owner_id))
                + (SELECT count(*) FROM "user" u WHERE NOT EXISTS (SELECT 1 FROM workspace w WHERE w.personal_owner_id = u.id)) AS n`,
        write: `INSERT INTO workspace_member (id, workspace_id, user_id, role, access, created_at, updated_at)
                SELECT gen_random_uuid()::text, w.id, w.personal_owner_id, 'owner', '{}'::jsonb, now(), now() FROM workspace w
                WHERE w.personal_owner_id IS NOT NULL
                ON CONFLICT (workspace_id, user_id) DO NOTHING`,
    },
    {
        label: 'billing accounts moved to their workspace',
        count: `SELECT count(*)::int AS n FROM billing_account b WHERE b.owner_type = 'user'
                AND NOT EXISTS (SELECT 1 FROM workspace w JOIN billing_account b2 ON b2.owner_type = 'workspace' AND b2.owner_id = w.id
                                WHERE w.personal_owner_id = b.owner_id)`,
        write: `UPDATE billing_account b SET owner_type = 'workspace', owner_id = w.id, updated_at = now()
                FROM workspace w
                WHERE b.owner_type = 'user' AND w.personal_owner_id = b.owner_id
                  AND NOT EXISTS (SELECT 1 FROM billing_account b2 WHERE b2.owner_type = 'workspace' AND b2.owner_id = w.id)`,
    },
    ...['api_key', 'inference_request', 'ai_conversation'].map((table) => ({
        label: `${table} rows given a workspace`,
        count: `SELECT count(*)::int AS n FROM ${table} WHERE workspace_id IS NULL`,
        write: `UPDATE ${table} t SET workspace_id = w.id FROM workspace w
                WHERE t.workspace_id IS NULL AND w.personal_owner_id = t.user_id`,
    })),
]

const before = await one(`SELECT
    (SELECT count(*)::int FROM "user") AS users,
    (SELECT count(*)::int FROM workspace) AS workspaces,
    (SELECT count(*)::int FROM workspace_member) AS members,
    (SELECT count(*)::int FROM billing_account WHERE owner_type = 'user') AS user_accounts,
    (SELECT count(*)::int FROM billing_account WHERE owner_type = 'workspace') AS workspace_accounts`)
console.log('Now:', before)

for (const step of STEPS) {
    if (!apply) {
        const { n } = await one(step.count)
        console.log(`  would: ${step.label}: ${n}`)
        continue
    }
    const r = await q(step.write)
    console.log(`  done: ${step.label}: ${r.rowCount ?? 0}`)
}

const conflicts = await one(`SELECT count(*)::int AS n FROM billing_account b JOIN workspace w ON w.personal_owner_id = b.owner_id
    WHERE b.owner_type = 'user' AND EXISTS (SELECT 1 FROM billing_account b2 WHERE b2.owner_type = 'workspace' AND b2.owner_id = w.id)`)
if (conflicts.n > 0) console.log(`  ATTENTION: ${conflicts.n} user(s) have both a user and a workspace account - left as they are; merge by hand.`)

if (apply) {
    const after = await one(`SELECT
        (SELECT count(*)::int FROM workspace) AS workspaces,
        (SELECT count(*)::int FROM workspace_member) AS members,
        (SELECT count(*)::int FROM billing_account WHERE owner_type = 'user') AS user_accounts,
        (SELECT count(*)::int FROM billing_account WHERE owner_type = 'workspace') AS workspace_accounts,
        (SELECT count(*)::int FROM api_key WHERE workspace_id IS NULL) AS keys_without_ws,
        (SELECT count(*)::int FROM inference_request WHERE workspace_id IS NULL) AS requests_without_ws,
        (SELECT count(*)::int FROM ai_conversation WHERE workspace_id IS NULL) AS conversations_without_ws`)
    console.log('After:', after)
}

// A sample: three workspaces with their member count and account (ids shortened; no emails or names of people).
const sample = await q(`SELECT left(w.id, 8) AS workspace, (w.personal_owner_id IS NOT NULL) AS personal, (SELECT count(*)::int FROM workspace_member m WHERE m.workspace_id = w.id) AS members,
    (SELECT left(b.id, 8) FROM billing_account b WHERE b.owner_type = 'workspace' AND b.owner_id = w.id) AS account,
    (SELECT count(*)::int FROM api_key k WHERE k.workspace_id = w.id) AS keys,
    (SELECT count(*)::int FROM ai_conversation c WHERE c.workspace_id = w.id) AS chats
    FROM workspace w ORDER BY w.created_at LIMIT 3`)
console.log('Sample:', sample.rows)
