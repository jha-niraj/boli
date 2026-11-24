import { API_PATHS, DEFAULT_MODEL_ID, KURA_DEFAULTS, type KuraSettings } from "./boli"

/**
 * One generator for every code sample Boli shows (Kura's Code tab, Home's start-building card, the landing page, Docs),
 * so they never drift apart. Browser-safe. The key is always a placeholder: a real key is never put into a sample.
 */

export type SampleLanguage = "curl" | "python" | "typescript" | "javascript" | "go"
/** Tab order everywhere code is shown. `grammar` is the Shiki language id (lib/highlight.ts). */
export const SAMPLE_LANGUAGES: { id: SampleLanguage; label: string; grammar: "shellscript" | "python" | "typescript" | "javascript" | "go" }[] = [
    { id: "curl", label: "cURL", grammar: "shellscript" },
    { id: "python", label: "Python", grammar: "python" },
    { id: "typescript", label: "TypeScript", grammar: "typescript" },
    { id: "javascript", label: "JavaScript", grammar: "javascript" },
    { id: "go", label: "Go", grammar: "go" },
]

/** The Go module path of the official OpenAI Go SDK (v3). */
export const GO_SDK = "github.com/openai/openai-go/v3"

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

/** Fields beyond the OpenAI spec: sent as extra body fields by the SDKs that type their params (Python, Go). */
const EXTRA_FIELDS = new Set(["top_k", "think"])

/** The OpenAI Go SDK's field and constructor for each standard param we send. `stream` is NewStreaming instead. */
const GO_FIELDS: Record<string, { field: string; ctor: "Float" | "Int" }> = {
    temperature: { field: "Temperature", ctor: "Float" },
    max_tokens: { field: "MaxTokens", ctor: "Int" },
    top_p: { field: "TopP", ctor: "Float" },
}

const GO_MESSAGE: Record<SampleMessage["role"], string> = { system: "SystemMessage", user: "UserMessage", assistant: "AssistantMessage" }

function goSample(base: string, model: string, messages: SampleMessage[], params: Record<string, unknown>, stream: boolean): string {
    const fields = Object.entries(params).flatMap(([k, v]) => {
        const f = GO_FIELDS[k]
        return f ? [{ name: f.field, value: `openai.${f.ctor}(${JSON.stringify(v)})` }] : []
    })
    const extra = Object.entries(params).filter(([k]) => EXTRA_FIELDS.has(k))
    // gofmt layout: the multi-line Messages first, then the one-line fields with their values aligned.
    const scalars = [{ name: "Model", value: JSON.stringify(model) }, ...fields]
    const width = Math.max(...scalars.map((f) => f.name.length)) + 1
    const pad = (name: string) => `${name}:`.padEnd(width + 1)
    return [
        "package main",
        "",
        "import (",
        '\t"context"',
        '\t"fmt"',
        '\t"os"',
        "",
        `\t"${GO_SDK}"`,
        `\t"${GO_SDK}/option"`,
        ")",
        "",
        "func main() {",
        "\tclient := openai.NewClient(",
        `\t\toption.WithBaseURL(${JSON.stringify(base)}),`,
        `\t\toption.WithAPIKey(os.Getenv("${KEY_ENV}")),`,
        "\t)",
        "",
        "\tparams := openai.ChatCompletionNewParams{",
        "\t\tMessages: []openai.ChatCompletionMessageParamUnion{",
        ...messages.map((m) => `\t\t\topenai.${GO_MESSAGE[m.role]}(${JSON.stringify(m.content)}),`),
        "\t\t},",
        ...scalars.map((f) => `\t\t${pad(f.name)}${f.value},`),
        "\t}",
        ...(extra.length
            ? [
                  "\t// Boli fields beyond the OpenAI spec go in as extra body fields.",
                  `\tparams.SetExtraFields(map[string]any{${extra.map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(", ")}})`,
              ]
            : []),
        "",
        ...(stream
            ? [
                  "\tstream := client.Chat.Completions.NewStreaming(context.Background(), params)",
                  "\tdefer stream.Close()",
                  "\tfor stream.Next() {",
                  "\t\tchunk := stream.Current()",
                  "\t\tif len(chunk.Choices) > 0 {",
                  "\t\t\tfmt.Print(chunk.Choices[0].Delta.Content)",
                  "\t\t}",
                  "\t}",
                  "\tif err := stream.Err(); err != nil {",
                  "\t\tpanic(err)",
                  "\t}",
              ]
            : [
                  "\tcompletion, err := client.Chat.Completions.New(context.Background(), params)",
                  "\tif err != nil {",
                  "\t\tpanic(err)",
                  "\t}",
                  "\tfmt.Println(completion.Choices[0].Message.Content)",
              ]),
        "}",
    ].join("\n")
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
        .filter(([k]) => !EXTRA_FIELDS.has(k))
        .map(([k, v]) => `    ${k}=${pyValue(v, 4)},`)
    const pyExtra = Object.fromEntries(Object.entries(params).filter(([k]) => EXTRA_FIELDS.has(k)))
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

    const msgs = `${JSON.stringify(messages, null, 2).replace(/\n/g, "\n  ")}`
    const paramsType = input.stream ? "ChatCompletionCreateParamsStreaming" : "ChatCompletionCreateParamsNonStreaming"
    const extraKeys = Object.keys(params).filter((k) => EXTRA_FIELDS.has(k))
    const typescript = [
        'import OpenAI from "openai";',
        `import type { ${paramsType} } from "openai/resources/chat/completions";`,
        "",
        `const client = new OpenAI({ baseURL: "${base}", apiKey: process.env.${KEY_ENV} });`,
        "",
        ...(extraKeys.length
            ? [
                  "// Boli fields beyond the OpenAI spec. The SDK sends them as they are.",
                  `type BoliParams = ${paramsType} & { ${extraKeys.map((k) => `${k}?: ${k === "think" ? "boolean" : "number"}`).join("; ")} };`,
              ]
            : [`type BoliParams = ${paramsType};`]),
        "",
        "const params: BoliParams = {",
        `  model: "${model}",`,
        `  messages: ${msgs},`,
        ...jsParams,
        "};",
        "",
        input.stream
            ? "const stream = await client.chat.completions.create(params);\nfor await (const chunk of stream) {\n  process.stdout.write(chunk.choices[0]?.delta?.content ?? \"\");\n}"
            : "const completion = await client.chat.completions.create(params);\nconsole.log(completion.choices[0]?.message.content);",
    ].join("\n")

    const go = goSample(base, model, messages, params, Boolean(input.stream))

    return { curl, python, typescript, javascript, go }
}

/** The "paste this into your coding agent" prompt (Home and Docs), like Sarvam's Home card. */
export function codingAgentPrompt(baseUrl: string): string {
    return [
        "You are setting up the Boli API in this project. Get me to one working call - nothing more.",
        "",
        `1. Boli is OpenAI-compatible: use the official OpenAI SDK for this project's language (Python: pip install openai; TypeScript or JavaScript: npm install openai; Go: go get ${GO_SDK}). Plain HTTP with curl also works.`,
        `2. Add BOLI_API_KEY= to .env (and .env to .gitignore). Read the key from the environment; never hardcode or print it.`,
        `3. Write one short script that creates the client with base_url "${baseUrl}/v1" and the key, calls chat.completions with model "${DEFAULT_MODEL_ID}" and a short message in Romanized Nepali, and prints the reply.`,
        "4. Stop and tell me to paste my key into .env. Do not use a dummy value, and do not run the script without it.",
        "5. When I confirm the key is in, run the script and show me the output.",
    ].join("\n")
}

const GO_IMPORTS = ['\t"context"', '\t"fmt"', '\t"os"', "", `\t"${GO_SDK}"`, `\t"${GO_SDK}/option"`]

function goClient(base: string, options: string[] = []): string[] {
    return [
        "\tclient := openai.NewClient(",
        `\t\toption.WithBaseURL(${JSON.stringify(base)}),`,
        `\t\toption.WithAPIKey(os.Getenv("${KEY_ENV}")),`,
        ...options.map((o) => `\t\t${o},`),
        "\t)",
    ]
}

/** Install the SDK (Docs quickstart). cURL needs nothing. */
export const INSTALL_SAMPLES: Record<SampleLanguage, string> = {
    curl: "# Nothing to install - curl comes with macOS, Linux and Windows 10+.",
    python: "pip install openai",
    typescript: "npm install openai",
    javascript: "npm install openai",
    go: `go get ${GO_SDK}`,
}

/** List the models - also the quickest check that a key works (Docs: authentication, models). */
export function buildModelsSamples(baseUrl: string): Record<SampleLanguage, string> {
    const base = `${baseUrl}/v1`
    return {
        curl: `curl ${baseUrl}${API_PATHS.models} \\\n  -H "Authorization: Bearer $${KEY_ENV}"`,
        python: [
            "import os",
            "from openai import OpenAI",
            "",
            `client = OpenAI(base_url="${base}", api_key=os.environ["${KEY_ENV}"])`,
            "",
            "for model in client.models.list():",
            "    print(model.id)",
        ].join("\n"),
        typescript: [
            'import OpenAI from "openai";',
            "",
            `const client = new OpenAI({ baseURL: "${base}", apiKey: process.env.${KEY_ENV} });`,
            "",
            "const models = await client.models.list();",
            "const ids: string[] = models.data.map((model) => model.id);",
            "console.log(ids);",
        ].join("\n"),
        javascript: [
            'import OpenAI from "openai";',
            "",
            `const client = new OpenAI({ baseURL: "${base}", apiKey: process.env.${KEY_ENV} });`,
            "",
            "const models = await client.models.list();",
            "for (const model of models.data) console.log(model.id);",
        ].join("\n"),
        go: [
            "package main",
            "",
            "import (",
            ...GO_IMPORTS,
            ")",
            "",
            "func main() {",
            ...goClient(base),
            "",
            "\tmodels, err := client.Models.List(context.Background())",
            "\tif err != nil {",
            "\t\tpanic(err)",
            "\t}",
            "\tfor _, model := range models.Data {",
            "\t\tfmt.Println(model.ID)",
            "\t}",
            "}",
        ].join("\n"),
    }
}

/** A client that retries more (429 and 5xx, respecting Retry-After). cURL shows the status and headers instead. */
export function buildRetrySamples(baseUrl: string): Record<SampleLanguage, string> {
    const base = `${baseUrl}/v1`
    const js = ['import OpenAI from "openai";', "", "const client = new OpenAI({", `  baseURL: "${base}",`, `  apiKey: process.env.${KEY_ENV},`, "  maxRetries: 5,", "});"]
    return {
        curl: [
            "# Show the status and headers, including Retry-After",
            `curl -i ${baseUrl}${API_PATHS.chatCompletions} \\`,
            `  -H "Authorization: Bearer $${KEY_ENV}" \\`,
            '  -H "Content-Type: application/json" \\',
            `  -d '{"model": "${DEFAULT_MODEL_ID}", "messages": [{"role": "user", "content": "namaste"}]}'`,
        ].join("\n"),
        python: ["import os", "from openai import OpenAI", "", "client = OpenAI(", `    base_url="${base}",`, `    api_key=os.environ["${KEY_ENV}"],`, "    max_retries=5,", ")"].join("\n"),
        typescript: [
            'import OpenAI, { type ClientOptions } from "openai";',
            "",
            "const options: ClientOptions = {",
            `  baseURL: "${base}",`,
            `  apiKey: process.env.${KEY_ENV},`,
            "  maxRetries: 5,",
            "};",
            "const client = new OpenAI(options);",
        ].join("\n"),
        javascript: js.join("\n"),
        go: ["// The SDK retries 429 and 5xx with backoff; raise the number of tries:", ...goClient(base, ["option.WithMaxRetries(5)"]).map((l) => l.slice(1))].join("\n"),
    }
}
