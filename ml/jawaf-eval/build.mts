// Build (or refresh) an eval bot from a public website with the REAL ingest: Firecrawl map + robots.txt, page ranking,
// scrape -> chunk -> BGE-M3 embed, then the "copy, do not invent" fact draft. Prints counts only (no secrets).
//
//   cd apps/main && ../../packages/db/node_modules/.bin/dotenv -e .env.local -- \
//     ../../packages/db/node_modules/.bin/tsx --conditions=react-server ../../ml/jawaf-eval/build.mts \
//     --workspace <workspaceId> --site https://gurukulhq.com --slug eval-gurukulhq --pages 25 [--approve] [--reread]
//
// --approve   approve every drafted fact section and FAQ (simulates the owner pressing "Approve all" unchanged)
// --reread    re-read pages already read (Train now)
import { and, count, db, eq } from "../../packages/db/src/index"
import { jawafBot, jawafChunk, jawafFactSection, jawafPage, jawafQa } from "../../packages/db/src/schema/index"
import { DEFAULT_CONTACT_FIELDS, DEFAULT_LOOK, loadBot } from "../../apps/main/lib/jawaf/bots"
import { runSlice, startRead } from "../../apps/main/lib/jawaf/jobs"
import { approveFacts, approveQa, mapAndStoreSite, setPagesIncluded } from "../../apps/main/lib/jawaf/knowledge"

function arg(name: string): string | undefined {
    const i = process.argv.indexOf(`--${name}`)
    return i > 0 ? process.argv[i + 1] : undefined
}
const flag = (name: string) => process.argv.includes(`--${name}`)

const workspaceId = arg("workspace")
const site = arg("site")
const slug = arg("slug")
const maxPages = Number(arg("pages") ?? 25)
if (!workspaceId || !site || !slug) throw new Error("Pass --workspace, --site and --slug")
console.log(`Target database: ${new URL(process.env.DATABASE_URL ?? "postgres://x@unknown/x").hostname.split(".")[0]}`)

let [row] = await db.select().from(jawafBot).where(eq(jawafBot.slug, slug)).limit(1)
if (row && row.workspaceId !== workspaceId) throw new Error("That slug belongs to another workspace")
if (!row) {
    ;[row] = await db.insert(jawafBot).values({
        workspaceId, name: arg("name") ?? new URL(site).hostname.replace(/^www\./, ""), slug, businessType: arg("type") ?? "other", website: site,
        tone: "friendly", length: "balanced", demo: true, contactFields: DEFAULT_CONTACT_FIELDS, look: DEFAULT_LOOK, setupStep: "pages",
    }).returning()
    console.log("created bot", row!.id)
} else console.log("using bot", row.id)
const bot = await loadBot(workspaceId, row!.id)

const t0 = Date.now()
const [{ n: known } = { n: 0 }] = await db.select({ n: count() }).from(jawafPage).where(eq(jawafPage.botId, bot.id))
if (Number(known) === 0 || flag("remap")) {
    const map = await mapAndStoreSite(bot, site, null)
    console.log(`map: ${map.pages.length} pages kept, ${map.dropped} dropped, ${map.included} pre-ticked (${Date.now() - t0} ms)`)
}

// Keep Firecrawl spend modest (and inside the bot's free pages): only the top `--pages` by rank stay ticked.
{
    const included = await db.select({ id: jawafPage.id, url: jawafPage.url }).from(jawafPage)
        .where(and(eq(jawafPage.botId, bot.id), eq(jawafPage.status, "included"))).orderBy(jawafPage.rank)
    const extra = included.slice(maxPages).map((p) => p.id)
    if (extra.length) await setPagesIncluded(bot, extra, false)
    console.log(`ticked ${Math.min(maxPages, included.length)}:`, included.slice(0, maxPages).map((p) => new URL(p.url!).pathname).join(" "))
}

let job = await startRead(bot, { draft: true, reread: flag("reread") })
let slices = 0
while (job.status === "queued" || job.status === "running") {
    job = await runSlice(job.id)
    slices++
    const p = job.progress as { done?: number; total?: number; label?: string }
    console.log(`  slice ${slices}: ${job.status} - ${p.label} (${p.done}/${p.total})`)
    if (slices > 200) break
}
console.log(`job ${job.status}${job.error ? ` (${job.error})` : ""} in ${slices} slices, ${Math.round((Date.now() - t0) / 1000)} s`)

if (flag("approve")) {
    const f = await approveFacts(bot, [])
    const q = await approveQa(bot, [])
    console.log(`approved ${f} fact sections and ${q} FAQs`)
}

const pages = await db.select({ status: jawafPage.readStatus, n: count() }).from(jawafPage).where(and(eq(jawafPage.botId, bot.id), eq(jawafPage.status, "included"))).groupBy(jawafPage.readStatus)
const [{ n: chunks } = { n: 0 }] = await db.select({ n: count() }).from(jawafChunk).where(eq(jawafChunk.botId, bot.id))
const facts = await db.select({ key: jawafFactSection.key, approved: jawafFactSection.approved, text: jawafFactSection.text, table: jawafFactSection.table }).from(jawafFactSection).where(eq(jawafFactSection.botId, bot.id))
const [{ n: faqs } = { n: 0 }] = await db.select({ n: count() }).from(jawafQa).where(eq(jawafQa.botId, bot.id))
const [b] = await db.select({ free: jawafBot.freePagesUsed }).from(jawafBot).where(eq(jawafBot.id, bot.id))
console.log("pages (included):", Object.fromEntries(pages.map((p) => [p.status, Number(p.n)])), "chunks:", Number(chunks), "faqs:", Number(faqs), "free pages used:", b?.free)
for (const f of facts) {
    const rows = (f.table as { rows?: unknown[] } | null)?.rows?.length ?? 0
    console.log(`  fact ${f.key}${f.approved ? "" : " (draft)"}: ${f.text.split("\n").filter(Boolean).length} lines${rows ? `, ${rows} price rows` : ""} | ${f.text.replace(/\s+/g, " ").slice(0, 140)}`)
}
process.exit(0)
