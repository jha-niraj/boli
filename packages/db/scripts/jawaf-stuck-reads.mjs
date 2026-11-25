// Repair Jawaf bots stuck at setup step "reading" with no active read job (plan/main/jawaf/jawaf-v1.md, engine fix
// 2026-11-25: a read that failed in drafting ended without its finish step). Does what the finish step does: the
// site / URL sources leave "reading" (ready when a page was read, else failed with a sentence) and the setup moves to
// "review". Previews by default; writes only with --apply. Idempotent: a second run finds nothing.
//   pnpm --filter @repo/db jawaf:stuck-reads [--slug gurukul-hq] [--apply]
// Prints the host label, counts and bot slugs only - never an env value.
import { neon } from '@neondatabase/serverless'

const apply = process.argv.includes('--apply')
const slugAt = process.argv.indexOf('--slug')
const slug = slugAt > 0 ? process.argv[slugAt + 1] : null
const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is not set')
const sql = neon(url)
const q = async (text, params = []) => (await sql.query(text, params, { fullResults: true })).rows

console.log(`Target database: ${new URL(url).hostname.split('.')[0]}${apply ? '' : ' (preview - add --apply to write)'}`)

const stuck = await q(
    `SELECT b.id, b.slug,
            (SELECT count(*)::int FROM jawaf_page p WHERE p.bot_id = b.id AND p.status = 'included' AND p.read_status = 'read') AS read,
            (SELECT count(*)::int FROM jawaf_page p WHERE p.bot_id = b.id AND p.status = 'included' AND p.read_status = 'pending') AS pending,
            (SELECT count(*)::int FROM jawaf_source s WHERE s.bot_id = b.id AND s.kind IN ('site', 'url') AND s.status = 'reading') AS reading_sources,
            (SELECT count(*)::int FROM jawaf_fact_section f WHERE f.bot_id = b.id) AS facts
       FROM jawaf_bot b
      WHERE b.setup_step = 'reading'
        AND ($1::text IS NULL OR b.slug = $1)
        AND NOT EXISTS (SELECT 1 FROM jawaf_job j WHERE j.bot_id = b.id AND j.kind = 'read' AND j.status IN ('queued', 'running'))
      ORDER BY b.created_at`,
    [slug],
)
console.log(`Stuck bots (setup "reading", no active read job): ${stuck.length}`)
for (const b of stuck) {
    console.log(`  ${b.slug}: ${b.read} pages read, ${b.pending} included pending, ${b.reading_sources} source(s) still "reading", ${b.facts} fact section(s)`)
}
if (!apply || !stuck.length) process.exit(0)

let sources = 0
let bots = 0
for (const b of stuck) {
    const s = await q(
        `UPDATE jawaf_source
            SET status = CASE WHEN $2::int > 0 THEN 'ready' ELSE 'failed' END,
                error = CASE WHEN $2::int > 0 THEN NULL ELSE 'Reading stopped. Read the pages again from Knowledge.' END,
                updated_at = now()
          WHERE bot_id = $1 AND kind IN ('site', 'url') AND status = 'reading'
      RETURNING id`,
        [b.id, b.read],
    )
    sources += s.length
    const u = await q(`UPDATE jawaf_bot SET setup_step = 'review', updated_at = now() WHERE id = $1 AND setup_step = 'reading' RETURNING id`, [b.id])
    bots += u.length
}
console.log(`Updated: ${bots} bot(s) moved to review, ${sources} source(s) out of "reading"`)
const [left] = await q(`SELECT count(*)::int AS n FROM jawaf_bot WHERE setup_step = 'reading' AND ($1::text IS NULL OR slug = $1)`, [slug])
console.log(`Still at "reading" after the run: ${left.n}`)
