// Jawaf quality eval: run a question file through THE answer engine (apps/main/lib/jawaf/answer.ts - the same function
// the playground, public page, widget and API use; no conversation rows, no charges) and print the rates the plan's
// quality bar is written in: correct, correct refusals, right script, invented numbers.
//
//   cd apps/main && ../../packages/db/node_modules/.bin/dotenv -e .env.local -- \
//     ../../packages/db/node_modules/.bin/tsx --conditions=react-server ../../ml/jawaf-eval/run.mts \
//     --questions ../../ml/jawaf-eval/questions/gurukulhq.json [--only en-01,ro-02] [--verbose]
//
// Bars (plan/main/jawaf/jawaf-v1.md "Quality bar"): >= 85% correct, >= 90% correct refusals, >= 95% right script,
// 0 invented prices.
import { readFileSync } from "node:fs"
import { db, eq } from "../../packages/db/src/index"
import { jawafBot, jawafChunk, jawafFactSection } from "../../packages/db/src/schema/index"
import { answerQuestion, ENGINE } from "../../apps/main/lib/jawaf/answer"
import { scriptMatches } from "../../apps/main/lib/jawaf/script"
import { asciiDigits, extractNumbers } from "../../apps/main/lib/jawaf/text"

interface Q {
    id: string
    q: string
    script: "english" | "romanized" | "devanagari" | "mixed"
    expect?: string[]
    mustRefuse?: boolean
}

const arg = (n: string) => {
    const i = process.argv.indexOf(`--${n}`)
    return i > 0 ? process.argv[i + 1] : undefined
}
const file = arg("questions")
if (!file) throw new Error("Pass --questions <file.json>")
const spec = JSON.parse(readFileSync(file, "utf8")) as { slug: string; questions: Q[] }
const only = arg("only")?.split(",")
const questions = only ? spec.questions.filter((q) => only.includes(q.id)) : spec.questions
const verbose = process.argv.includes("--verbose")

const [bot] = await db.select().from(jawafBot).where(eq(jawafBot.slug, spec.slug)).limit(1)
if (!bot) throw new Error(`No bot with slug ${spec.slug} - run build.mts first`)

// Everything the bot knows, for the invented-number check (independent of the engine's own guard).
const chunks = await db.select({ text: jawafChunk.text }).from(jawafChunk).where(eq(jawafChunk.botId, bot.id))
const facts = await db.select({ text: jawafFactSection.text, table: jawafFactSection.table }).from(jawafFactSection).where(eq(jawafFactSection.botId, bot.id))
const known = new Set(extractNumbers([...chunks.map((c) => c.text), ...facts.map((f) => `${f.text} ${JSON.stringify(f.table ?? "")}`)].join("\n")))
const factNums = new Set(extractNumbers(facts.map((f) => `${f.text} ${JSON.stringify(f.table ?? "")}`).join("\n")))
const MONEY = /(?:rs\.?|npr|रु\.?|रू\.?)\s*\d[\d,]*(?:\.\d+)?/gi

function norm(s: string): string {
    return ` ${asciiDigits(s).toLowerCase().replace(/(\d),(?=\d)/g, "$1").replace(/[^\p{L}\p{N}\p{M}@.]+/gu, " ").replace(/\.(\s|$)/g, " ")} `
}
function matches(text: string, expect: string[]): boolean {
    const t = norm(text)
    // Each alternative must start at a word boundary ("no" matches "no," and "no." but not "know").
    return expect.every((group) => group.split("|").some((alt) => t.includes(` ${norm(alt).trim()}`)))
}

console.log(`Bot ${spec.slug}: ${chunks.length} chunks, ${facts.length} fact sections. Engine gate: vecStrong ${ENGINE.vecStrong}, vecWeak ${ENGINE.vecWeak}, kwShare ${ENGINE.kwShare}, qaStrong ${ENGINE.qaStrong}`)

type Row = { q: Q; status: string; text: string; ok: boolean; scriptOk: boolean; invented: string[]; inventedMoney: string[]; ms: number; sim: number; gate: string; retried: boolean; dropped: number }
const rows: Row[] = []
for (const q of questions) {
    const r = await answerQuestion({ bot, question: q.q })
    const answered = r.status === "answered"
    const ok = q.mustRefuse ? r.status === "not_found" : answered && matches(r.text, q.expect ?? [])
    const nums = answered ? extractNumbers(r.text).filter((n) => n.replace(".", "").length >= 2) : []
    const qNums = new Set(extractNumbers(q.q))
    const invented = nums.filter((n) => !known.has(n) && !qNums.has(n))
    const inventedMoney = answered ? [...asciiDigits(r.text).matchAll(MONEY)].map((m) => extractNumbers(m[0])[0]!).filter((n) => n && !factNums.has(n)) : []
    const scriptOk = scriptMatches(q.script, r.text.replace(/\[\d+\]/g, ""))
    const row: Row = { q, status: r.status, text: r.text, ok, scriptOk, invented, inventedMoney, ms: r.latencyMs, sim: r.retrieval.bestVecSim, gate: r.retrieval.gate, retried: r.retrieval.scriptRetried, dropped: r.retrieval.droppedSentences }
    rows.push(row)
    const mark = ok ? "OK  " : "MISS"
    console.log(`${mark} ${q.id} [${r.status}${answered ? `/${r.retrieval.gate}` : ""}] sim ${r.retrieval.bestVecSim.toFixed(3)} qa ${r.retrieval.bestQaSim.toFixed(3)} kw ${r.retrieval.kwShare} ${r.latencyMs}ms${scriptOk ? "" : " SCRIPT"}${r.retrieval.scriptRetried ? " (retried)" : ""}${r.retrieval.absence ? " (absence)" : ""}${invented.length ? ` INVENTED ${invented.join(",")}` : ""}${r.retrieval.droppedSentences ? ` dropped ${r.retrieval.droppedSentences}` : ""}`)
    if (verbose || !ok || !scriptOk) console.log(`      Q: ${q.q}\n      A: ${r.text.replace(/\s+/g, " ").slice(0, 300)}${r.sources.length ? `\n      S: ${r.sources.map((s) => `[${s.n}] ${s.kind}:${s.title.slice(0, 40)}`).join(" ")}` : ""}`)
}

const answerable = rows.filter((r) => !r.q.mustRefuse)
const refuse = rows.filter((r) => r.q.mustRefuse)
const pct = (a: number, b: number) => (b ? `${((100 * a) / b).toFixed(1)}%` : "n/a")
const byScript = (s: string) => answerable.filter((r) => r.q.script === s)
const lat = rows.map((r) => r.ms).sort((a, b) => a - b)
const p = (x: number) => lat[Math.min(lat.length - 1, Math.floor(x * lat.length))] ?? 0
console.log("\n=== Results ===")
console.log(`correct (answerable):  ${answerable.filter((r) => r.ok).length}/${answerable.length} = ${pct(answerable.filter((r) => r.ok).length, answerable.length)}   (bar >= 85%)`)
for (const s of ["english", "romanized", "devanagari"]) console.log(`  ${s.padEnd(11)} ${byScript(s).filter((r) => r.ok).length}/${byScript(s).length}`)
console.log(`  wrongly refused:     ${answerable.filter((r) => r.status === "not_found").length}`)
console.log(`correct refusals:      ${refuse.filter((r) => r.ok).length}/${refuse.length} = ${pct(refuse.filter((r) => r.ok).length, refuse.length)}   (bar >= 90%)`)
console.log(`right script:          ${rows.filter((r) => r.scriptOk).length}/${rows.length} = ${pct(rows.filter((r) => r.scriptOk).length, rows.length)}   (bar >= 95%; ${rows.filter((r) => r.retried).length} needed a retry)`)
console.log(`invented numbers:      ${rows.filter((r) => r.invented.length).length} replies; invented prices: ${rows.filter((r) => r.inventedMoney.length).length}   (bar: 0 invented prices)`)
console.log(`guard dropped sentences in ${rows.filter((r) => r.dropped).length} replies; errors/offline: ${rows.filter((r) => r.status === "error" || r.status === "offline").length}`)
console.log(`latency p50 ${p(0.5)} ms, p90 ${p(0.9)} ms, max ${lat[lat.length - 1]} ms`)
process.exit(0)
