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
    let firstTokenMs = null
    let usage = null
    const stream = await client.chat.completions.create({
        model: "boli-chat",
        messages: [{ role: "user", content: "Mero lagi euta sano kabita lekhnus, Himal ko barema." }],
        max_tokens: 200,
        stream: true,
        stream_options: { include_usage: true },
    })
    for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content
        if (text) {
            if (firstTokenMs === null) firstTokenMs = Math.round(performance.now() - t0)
            process.stdout.write(text)
        }
        if (chunk.usage) usage = chunk.usage
    }
    const totalMs = Math.round(performance.now() - t0)
    console.log(`\n\ntime to first token: ${firstTokenMs ?? "n/a"} ms, total: ${totalMs} ms`)
    console.log("usage:", usage ? JSON.stringify(usage) : "(not sent in the stream)")
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
