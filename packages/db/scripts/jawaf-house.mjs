// The "Boli Demos" house workspace (plan/admin/jawaf/admin-v1.md task 2): where the Boli team builds demo bots for
// prospects; its credits pay for demo answers (granted from admin). Previews by default; writes only with --apply.
// Idempotent: a second run changes nothing.
//   pnpm --filter @repo/db jawaf:house            preview
//   pnpm --filter @repo/db jawaf:house --apply    write
//
// 1. The owner: the oldest ACTIVE SUPER_ADMIN in admin_access, else the user with SEED_ADMIN_EMAIL.
// 2. The workspace "Boli Demos" (shared, not personal) + the owner's membership + its billing account ('workspace', id),
//    reused when admin_system_settings 'jawaf.house_workspace_id' already names it (or a "Boli Demos" the owner made).
// 3. Every ACTIVE admin becomes a member with full Jawaf access (manage); an existing member's access is brought up to it.
// 4. The id is stored in admin_system_settings key 'jawaf.house_workspace_id' (read by @repo/db getJawafHouseWorkspaceId).
// Prints host labels, counts and ids only - never an env value.
import { neon } from '@neondatabase/serverless'

const apply = process.argv.includes('--apply')
const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is not set')
const sql = neon(url)
const q = async (text, params = []) => (await sql.query(text, params, { fullResults: true })).rows
const KEY = 'jawaf.house_workspace_id'
const NAME = 'Boli Demos'
const OWNER_ACCESS = JSON.stringify({ kura: true, api: true, jawaf: { access: true, level: 'manage' } })
const MEMBER_ACCESS = JSON.stringify({ kura: false, api: false, jawaf: { access: true, level: 'manage' } })

console.log(`Target database: ${new URL(url).hostname.split('.')[0]}${apply ? '' : ' (preview - add --apply to write)'}`)

// 1. The owner
let [owner] = await q(`SELECT a.user_id AS id, u.email FROM admin_access a JOIN "user" u ON u.id = a.user_id
                      WHERE a.admin_role = 'SUPER_ADMIN' AND a.status = 'ACTIVE' ORDER BY a.created_at ASC LIMIT 1`)
if (!owner) {
    const seed = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase()
    if (seed) [owner] = await q(`SELECT id, email FROM "user" WHERE lower(email) = $1 LIMIT 1`, [seed])
}
if (!owner) throw new Error('No active SUPER_ADMIN and no user with SEED_ADMIN_EMAIL - run pnpm db:seed first')
console.log(`Owner: super admin user ${owner.id}`)

// 2. The workspace
const [setting] = await q(`SELECT value FROM admin_system_settings WHERE key = $1 LIMIT 1`, [KEY])
let wsId = typeof setting?.value === 'string' ? setting.value : null
if (wsId) {
    const [ws] = await q(`SELECT id FROM workspace WHERE id = $1`, [wsId])
    if (!ws) { console.log(`Setting names workspace ${wsId}, which no longer exists - a new one will be made`); wsId = null }
}
if (!wsId) {
    const [made] = await q(`SELECT id FROM workspace WHERE name = $1 AND personal_owner_id IS NULL AND created_by_id = $2 ORDER BY created_at LIMIT 1`, [NAME, owner.id])
    wsId = made?.id ?? null
}
const creating = !wsId
if (creating) wsId = crypto.randomUUID()
console.log(`Workspace "${NAME}": ${creating ? `to create (${wsId})` : `exists (${wsId})`}`)

const admins = await q(`SELECT a.user_id FROM admin_access a WHERE a.status = 'ACTIVE' AND a.user_id <> $1`, [owner.id])
const existing = creating ? [] : await q(`SELECT user_id, role, access FROM workspace_member WHERE workspace_id = $1`, [wsId])
const byUser = new Map(existing.map((m) => [m.user_id, m]))
const toAdd = admins.filter((a) => !byUser.has(a.user_id))
const toRaise = admins.filter((a) => {
    const m = byUser.get(a.user_id)
    return m && m.role === 'member' && !(m.access?.jawaf?.access === true && m.access?.jawaf?.level === 'manage')
})
const [acct] = creating ? [] : await q(`SELECT id FROM billing_account WHERE owner_type = 'workspace' AND owner_id = $1`, [wsId])
console.log(`Active admins besides the owner: ${admins.length}; memberships to add: ${toAdd.length}; access to raise: ${toRaise.length}`)
console.log(`Owner membership: ${byUser.has(owner.id) ? 'exists' : 'to add'}; billing account: ${acct ? 'exists' : 'to create'}; setting: ${setting && setting.value === wsId ? 'set' : 'to write'}`)

if (!apply) process.exit(0)

if (creating) {
    await q(`INSERT INTO workspace (id, name, personal_owner_id, created_by_id, created_at, updated_at) VALUES ($1, $2, NULL, $3, now(), now())`, [wsId, NAME, owner.id])
}
await q(`INSERT INTO workspace_member (id, workspace_id, user_id, role, access, created_at, updated_at)
         VALUES (gen_random_uuid()::text, $1, $2, 'owner', $3::jsonb, now(), now()) ON CONFLICT (workspace_id, user_id) DO NOTHING`, [wsId, owner.id, OWNER_ACCESS])
for (const a of toAdd) {
    await q(`INSERT INTO workspace_member (id, workspace_id, user_id, role, access, invited_by_id, created_at, updated_at)
             VALUES (gen_random_uuid()::text, $1, $2, 'member', $3::jsonb, $4, now(), now()) ON CONFLICT (workspace_id, user_id) DO NOTHING`, [wsId, a.user_id, MEMBER_ACCESS, owner.id])
}
for (const a of toRaise) {
    await q(`UPDATE workspace_member SET access = $3::jsonb, updated_at = now() WHERE workspace_id = $1 AND user_id = $2 AND role = 'member'`, [wsId, a.user_id, MEMBER_ACCESS])
}
await q(`INSERT INTO billing_account (id, owner_type, owner_id, contact_user_id, balance_micro, created_at, updated_at)
         VALUES (gen_random_uuid()::text, 'workspace', $1, $2, 0, now(), now()) ON CONFLICT (owner_type, owner_id) DO NOTHING`, [wsId, owner.id])
await q(`INSERT INTO admin_system_settings (id, key, value, description, last_modified_by, created_at, updated_at)
         VALUES (gen_random_uuid()::text, $1, $2::json, 'The Boli Demos house workspace (Jawaf demo bots) - scripts/jawaf-house.mjs', $3, now(), now())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now() WHERE admin_system_settings.value::text IS DISTINCT FROM EXCLUDED.value::text`,
    [KEY, JSON.stringify(wsId), owner.id])

const [counts] = await q(`SELECT (SELECT count(*)::int FROM workspace_member WHERE workspace_id = $1) AS members,
                                 (SELECT count(*)::int FROM jawaf_bot WHERE workspace_id = $1) AS bots`, [wsId])
console.log(`Done: workspace ${wsId}, ${counts.members} member(s), ${counts.bots} bot(s); setting ${KEY} points at it.`)
