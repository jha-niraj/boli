import OpenAI from "openai"

const apiKey = process.env.BOLI_API_KEY
if (!apiKey) {
    console.error("BOLI_API_KEY is not set. Create a key at /keys in the Boli dashboard and put it in .env (see README).")
    process.exit(1)
}
const baseURL = process.env.BOLI_BASE_URL || "http://localhost:3100/v1"

const client = new OpenAI({ apiKey, baseURL, maxRetries: 0 })

try {
    const t0 = performance.now()
    const res = await client.chat.completions.create({
        model: "boli-chat",
        messages: [{ role: "user", content: "Namaste! Kathmandu ma ghumna jane ramro thau haru kun kun hun? Chhoto ma bhannus." }],
        max_tokens: 200,
    })
    const ms = Math.round(performance.now() - t0)
    console.log(`model: ${res.model}  (${ms} ms)\n`)
    console.log(res.choices[0]?.message?.content ?? "(empty reply)")
    console.log("\nusage:", JSON.stringify(res.usage))
} catch (err) {
    if (err instanceof OpenAI.APIError) {
        const h = err.headers
        const retry = typeof h?.get === "function" ? h.get("retry-after") : h?.["retry-after"]
        console.error(`HTTP ${err.status} ${err.code ?? ""}: ${err.message}${retry ? ` (retry after ${retry}s)` : ""}`)
    } else {
        console.error(String(err))
    }
    process.exit(1)
}
