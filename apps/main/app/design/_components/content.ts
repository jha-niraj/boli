import { SITE } from "@repo/core/site"
import { API_PATHS, BOLI_CHAT, KURA, MICRO_PER_CREDIT, RATE_LIMIT_PER_MIN, WELCOME_CREDITS } from "@/lib/boli"
import type { CodeSample } from "./code-tab-header"

/** The landing page's real FAQ (app/_landing/faq.tsx), so the editorial list is judged on real copy. */
export const DESIGN_FAQ = [
    {
        q: "What is Boli?",
        a: `Boli runs open AI models for Nepal. You can chat in ${KURA.name} or call the same model from your own code through an OpenAI-compatible API. You pay per token, in rupees.`,
    },
    {
        q: "Which model does it run?",
        a: `${BOLI_CHAT.id} is ${BOLI_CHAT.label}: ${BOLI_CHAT.base}. It reads ${BOLI_CHAT.languages.join(", ")}, with a context of ${BOLI_CHAT.contextTokens.toLocaleString("en-US")} tokens. We only run open models.`,
    },
    {
        q: "Is my data stored?",
        a: "For API calls we store metadata only: the model, token counts, cost, time and status. Never your prompts or the answers. Kura conversations are saved to your account so you can come back to them, and you can delete them.",
    },
    {
        q: "Does it understand Romanized Nepali?",
        a: "Yes. That is the reason Boli exists. The model reads Nepali in Latin letters, Devanagari, English and mixes of them, and tries to reply in the script you wrote in. It is a small model and still makes mistakes, so check anything important.",
    },
    {
        q: "How do credits work?",
        a: `1 credit = Rs 1. You get ${WELCOME_CREDITS} free credits when you verify your email. Each call costs its input and output tokens at the per-million price, worked out to a millionth of a credit (1 credit = ${MICRO_PER_CREDIT.toLocaleString("en-US")} micro-credits). Credits never expire. At zero, the API returns 402 until you add more.`,
    },
    {
        q: "How do I pay?",
        a: "Add credits from the Billing page and pay with eSewa or Khalti, in NPR. There is no subscription.",
    },
    {
        q: "Can I use the OpenAI SDK?",
        a: `Yes. Set the base URL to Boli's /v1 and use your Boli key. The chat endpoint is ${API_PATHS.chatCompletions} and the model list is ${API_PATHS.models}. Requests are limited to ${RATE_LIMIT_PER_MIN} a minute per account.`,
    },
]

const URL = `${SITE.url}${API_PATHS.chatCompletions}`

export const DESIGN_CODE: CodeSample[] = [
    {
        id: "curl",
        label: "cURL",
        code: `curl ${URL} \\
  -H "Authorization: Bearer $BOLI_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${BOLI_CHAT.id}",
    "messages": [{ "role": "user", "content": "Kathmandu ma aaja ko mausam kasto cha?" }]
  }'`,
    },
    {
        id: "python",
        label: "Python",
        code: `import os
from openai import OpenAI

client = OpenAI(base_url="${SITE.url}/v1", api_key=os.environ["BOLI_API_KEY"])
reply = client.chat.completions.create(
    model="${BOLI_CHAT.id}",
    messages=[{"role": "user", "content": "Kathmandu ma aaja ko mausam kasto cha?"}],
)
print(reply.choices[0].message.content)`,
    },
    {
        id: "typescript",
        label: "TypeScript",
        code: `import OpenAI from "openai"

const client = new OpenAI({ baseURL: "${SITE.url}/v1", apiKey: process.env.BOLI_API_KEY })
const reply = await client.chat.completions.create({
  model: "${BOLI_CHAT.id}",
  messages: [{ role: "user", content: "Kathmandu ma aaja ko mausam kasto cha?" }],
})
console.log(reply.choices[0]?.message.content)`,
    },
]
