import { API_PATHS, DEFAULT_MODEL_ID, KURA_DEFAULTS, type KuraSettings } from "./boli"

/**
 * One generator for every code sample Boli shows (Kura's Code tab, Home's start-building card, the landing page, Docs),
 * so they never drift apart. Browser-safe. The key is always a placeholder: a real key is never put into a sample.
 */

export type SampleLanguage = "curl" | "python" | "javascript"
export const SAMPLE_LANGUAGES: { id: SampleLanguage; label: string }[] = [
    { id: "curl", label: "cURL" },
    { id: "python", label: "Python" },
    { id: "javascript", label: "JavaScript" },
]

export type SampleMessage = { role: "system" | "user" | "assistant"; content: string }

export type SampleInput = {
    /** The app origin, e.g. https://bolihq.com or http://localhost:3100 (no trailing slash). */
    baseUrl: string
    model?: string
    messages?: SampleMessage[]
    settings?: Partial<KuraSettings>
    stream?: boolean
}

const KEY_ENV = "BOLI_API_KEY"

function body(input: SampleInput) {
    const s = { ...KURA_DEFAULTS, ...input.settings }
    const messages: SampleMessage[] = input.messages?.length
        ? input.messages
        : [
              { role: "system", content: s.systemPrompt },
              { role: "user", content: "mero exam sakiyo, aba k garne?" },
          ]
    return {
        model: input.model ?? DEFAULT_MODEL_ID,
        messages,
        temperature: s.temperature,
        max_tokens: s.maxTokens,
        top_p: s.topP,
        top_k: s.topK,
        ...(s.think ? { think: true } : {}),
        ...(input.stream ? { stream: true } : {}),
    }
}

function pyValue(v: unknown, indent: number): string {
    const pad = " ".repeat(indent)
    if (Array.isArray(v)) return `[\n${v.map((x) => `${pad}    ${pyValue(x, indent + 4)}`).join(",\n")},\n${pad}]`
    if (v && typeof v === "object") {
        const entries = Object.entries(v as Record<string, unknown>)
        return `{${entries.map(([k, x]) => `"${k}": ${pyValue(x, indent)}`).join(", ")}}`
    }
    if (typeof v === "boolean") return v ? "True" : "False"
    return JSON.stringify(v)
}

export function buildSamples(input: SampleInput): Record<SampleLanguage, string> {
    const b = body(input)
    const url = `${input.baseUrl}${API_PATHS.chatCompletions}`
    const base = `${input.baseUrl}/v1`
    const { model, messages, ...params } = b

    const curl = [
        `curl ${url} \\`,
        `  -H "Authorization: Bearer $${KEY_ENV}" \\`,
        `  -H "Content-Type: application/json" \\`,
        `  -d '${JSON.stringify(b, null, 2).replace(/'/g, "'\\''")}'`,
    ].join("\n")

    const pyParams = Object.entries(params)
        .filter(([k]) => k !== "top_k" && k !== "think")
        .map(([k, v]) => `    ${k}=${pyValue(v, 4)},`)
    const pyExtra = Object.fromEntries(Object.entries(params).filter(([k]) => k === "top_k" || k === "think"))
    const python = [
        "import os",
        "from openai import OpenAI",
        "",
        `client = OpenAI(base_url="${base}", api_key=os.environ["${KEY_ENV}"])`,
        "",
        "response = client.chat.completions.create(",
        `    model="${model}",`,
        `    messages=${pyValue(messages, 4)},`,
        ...pyParams,
        ...(Object.keys(pyExtra).length ? [`    extra_body=${pyValue(pyExtra, 4)},`] : []),
        ")",
        input.stream ? "for chunk in response:\n    print(chunk.choices[0].delta.content or \"\", end=\"\")" : "print(response.choices[0].message.content)",
    ].join("\n")

    const jsParams = Object.entries(params).map(([k, v]) => `  ${k}: ${JSON.stringify(v)},`)
    const javascript = [
        'import OpenAI from "openai";',
        "",
        `const client = new OpenAI({ baseURL: "${base}", apiKey: process.env.${KEY_ENV} });`,
        "",
        "const response = await client.chat.completions.create({",
        `  model: "${model}",`,
        `  messages: ${JSON.stringify(messages, null, 2).replace(/\n/g, "\n  ")},`,
        ...jsParams,
        "});",
        input.stream
            ? "for await (const chunk of response) process.stdout.write(chunk.choices[0]?.delta?.content ?? \"\");"
            : "console.log(response.choices[0].message.content);",
    ].join("\n")

    return { curl, python, javascript }
}

/** The "paste this into your coding agent" prompt (Home and Docs), like Sarvam's Home card. */
export function codingAgentPrompt(baseUrl: string): string {
    return [
        "You are setting up the Boli API in this project. Get me to one working call - nothing more.",
        "",
        "1. Boli is OpenAI-compatible: use the official OpenAI SDK for this project's language (pip install openai / npm install openai).",
        `2. Add BOLI_API_KEY= to .env (and .env to .gitignore). Read the key from the environment; never hardcode or print it.`,
        `3. Write one short script that creates the client with base_url "${baseUrl}/v1" and the key, calls chat.completions with model "${DEFAULT_MODEL_ID}" and a short message in Romanized Nepali, and prints the reply.`,
        "4. Stop and tell me to paste my key into .env. Do not use a dummy value, and do not run the script without it.",
        "5. When I confirm the key is in, run the script and show me the output.",
    ].join("\n")
}
