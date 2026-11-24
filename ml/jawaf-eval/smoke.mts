// Smoke test of the pure helpers + one embed call (no database writes).
import { chunkMarkdown, extractNumbers } from "../../apps/main/lib/jawaf/text"
import { detectScript, romanizedToDevanagari } from "../../apps/main/lib/jawaf/script"
import { embed } from "../../apps/main/lib/jawaf/embed"

for (const q of ["fee kati ho?", "What are your prices?", "तपाईंको कार्यालय कहाँ छ?", "school ko admission kahile khulcha", "Do you have Nepali calendar support ho ki?"]) {
    console.log(JSON.stringify(q), detectScript(q).script, "->", romanizedToDevanagari(q))
}
console.log(extractNumbers("Rs. 1,20,000 per year, रु ५०० [2] and 10:30 AM, 1.50"))
const md = "# Pricing\n\nIntro para.\n\n## Basic\n\nRs 500 per month for 100 students.\n\n## Pro\n\n" + "Lots of text. ".repeat(300)
const c = chunkMarkdown(md, { title: "Pricing page" })
console.log(c.length, c.map((x) => [x.heading, x.tokens]))
const v = await embed(["fee kati ho", "what is the fee", "शुल्क कति हो", "where is the office"])
const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i]!, 0)
console.log("sim rom-en", dot(v[0]!, v[1]!).toFixed(3), "rom-deva", dot(v[0]!, v[2]!).toFixed(3), "en-deva", dot(v[1]!, v[2]!).toFixed(3), "fee-office", dot(v[1]!, v[3]!).toFixed(3))
