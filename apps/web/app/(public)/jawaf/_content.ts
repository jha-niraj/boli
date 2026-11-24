import { API_PATHS, formatRupees } from "@repo/boli"
import type { SampleLanguage } from "@repo/boli/code-samples"
import { GO_SDK } from "@repo/boli/code-samples"
import { JAWAF_BUSINESS_TYPE_INFO, JAWAF_LIMITS, JAWAF_NOT_FOUND, JAWAF_PRICES, JAWAF_SCRIPT_LABELS, type JawafBusinessType } from "@repo/boli/jawaf"
import type { Exchange } from "@/components/public/language-exchanges"
import { JAWAF_PRICE, JAWAF_PRICE_LINE } from "@/components/public/pricing"

/*
 * The words and numbers on /jawaf, kept out of the page so the FAQ list and its FAQPage JSON-LD are one list. Every
 * price and limit is read from @repo/boli/jawaf (plan/main/jawaf/jawaf-v1.md); prices are PLANNED (reviewed after the
 * pilots) and the page says so. No testimonials, no ratings, no customer names: Jawaf has no customers yet.
 */

/** The API model name shown in copy and the sample. */
export const JAWAF_MODEL_EXAMPLE = "jawaf:your-name"

const mb = (bytes: number) => Math.round(bytes / (1024 * 1024))

export const PRICE_ROWS: readonly { what: string; price: string; note: string }[] = [
    {
        what: "Answers to your customers",
        price: `${JAWAF_PRICES.freeAnswersPerMonth} free a month, then ${JAWAF_PRICE.perAnswer} each`,
        note: "Per workspace, reset on the 1st. Playground answers are always free.",
    },
    {
        what: "Website pages",
        price: `First ${JAWAF_PRICES.freePagesPerBot} free, then ${formatRupees(JAWAF_PRICES.pageMicro)} a page`,
        note: `Charged once, on the first read. Weekly re-reads are free. Up to ${JAWAF_LIMITS.pagesPerBot} pages.`,
    },
    {
        what: "File pages",
        price: `${formatRupees(JAWAF_PRICES.filePageMicro)} a page`,
        note: `PDFs, Word files and photos, read once. Up to ${JAWAF_LIMITS.filesPerBot} files of ${mb(JAWAF_LIMITS.fileMaxBytes)} MB.`,
    },
    {
        what: "Remove \"Powered by Boli\"",
        price: `${formatRupees(JAWAF_PRICES.brandingMonthlyMicro)} a month`,
        note: "Optional. Everything works the same with it on.",
    },
]

/** Rupees an example month costs: N answers past the free ones. */
export function exampleMonth(answers: number): string {
    const paid = Math.max(0, answers - JAWAF_PRICES.freeAnswersPerMonth)
    return formatRupees(paid * JAWAF_PRICES.answerMicro)
}
/** The worked example under the price table: a month with this many customer answers. */
export const EXAMPLE_ANSWERS = 1000

export const EXCHANGES: readonly Exchange[] = [
    {
        label: JAWAF_SCRIPT_LABELS.devanagari,
        q: "कक्षा कति बजे सुरु हुन्छ?",
        a: "बिहानको कक्षा ६ बजे र दिउँसोको कक्षा १ बजे सुरु हुन्छ।",
        chip: { label: "From: Class schedule", tone: "source" },
    },
    {
        label: JAWAF_SCRIPT_LABELS.romanized,
        q: "Admission kahile khulcha?",
        a: "Admission Baisakh 1 dekhi khulcha. Form office ma aayera ya website bata bharna milcha.",
        chip: { label: "From: Admissions page", tone: "source" },
    },
    {
        label: JAWAF_SCRIPT_LABELS.english,
        q: "Do you deliver outside Kathmandu?",
        a: "Yes - we deliver across Nepal. Outside the valley it takes 2 to 4 days.",
        chip: { label: "From: Delivery policy", tone: "source" },
    },
    {
        label: "When it does not know",
        q: "parking cha?",
        a: JAWAF_NOT_FOUND.romanized,
        chip: { label: "Leave your number", tone: "action" },
    },
]

/** Three words per kind of business: what its customers ask about. */
const FOR_WHOM_LINES: Record<Exclude<JawafBusinessType, "other">, string> = {
    education: "Courses, fees, intakes",
    clinic: "OPD hours, doctors, booking",
    shop: "Prices, stock, delivery",
    hotel: "Rates, pickups, permits",
    real_estate: "Projects, loans, site visits",
}

export const FOR_WHOM = (Object.keys(FOR_WHOM_LINES) as (keyof typeof FOR_WHOM_LINES)[]).map((id) => ({
    id,
    label: JAWAF_BUSINESS_TYPE_INFO[id].label,
    line: FOR_WHOM_LINES[id],
    ask: JAWAF_BUSINESS_TYPE_INFO[id].suggested[1] ?? JAWAF_BUSINESS_TYPE_INFO[id].suggested[0] ?? "",
}))

/** The FAQ: plain-string answers, so the same list is the visible section and the FAQPage JSON-LD. */
export const JAWAF_FAQ: readonly { q: string; a: string }[] = [
    {
        q: "Does Jawaf make things up?",
        a: "It is built not to. Jawaf answers only when it finds a strong match in what you gave it, and prices come only from the facts you approve. When the answer is not there, it says so plainly and asks for a name and phone number instead of guessing. Every answer shows where it came from.",
    },
    {
        q: "What if an answer is wrong?",
        a: "Open the conversation, press Fix this answer and write the right one. It is saved as a question and answer and applies at once, for every way people ask it. Customers can also mark an answer as unhelpful, and those land in a list for you to fix.",
    },
    {
        q: "Which languages does it answer in?",
        a: "Nepali in Devanagari, Romanized Nepali (Nepali in Latin letters) and English, and the mix people really type. It replies in the same script the customer wrote in.",
    },
    {
        q: "Do I need a website?",
        a: "No. A website is the quickest start, but you can give Jawaf your files (price lists, brochures, menus), write down your facts and prices, and add the questions people always ask. Many businesses that live on Facebook start that way.",
    },
    {
        q: "Where is my data kept?",
        a: "Your pages, files and conversations are stored in Boli's database and file storage, and answers run on Boli's own open model. Files and voice are read by a speech and document partner until our own models are ready. Deleting your Jawaf deletes all of it. We never train on your conversations unless you turn that on, and it is off by default.",
    },
    {
        q: "Can I edit what it says?",
        a: "Yes. You review the fact sheet Jawaf drafts from your website before it goes live, edit any section, add question and answer pairs, and pick a tone. Your facts win over the website when the two disagree, and the page that disagrees is flagged for you.",
    },
    {
        q: "What does it cost?",
        a: `The planned price is ${JAWAF_PRICE_LINE}, from the same credits as the rest of Boli (1 credit = Rs 1). Website pages and file pages cost a little the first time they are read. During the pilot it is free; prices are reviewed after the pilot.`,
    },
    {
        q: "How do I put it on my website?",
        a: "Copy one script tag into your site and a chat bubble appears; it only works on the domains you allow. Without a website, share the link or print the QR poster. Developers can call it through the API with the same keys as the rest of Boli.",
    },
    {
        q: "Can customers ask by voice?",
        a: "Yes, on the Jawaf page customers can hold to speak in Nepali and get a written answer. Voice is included in the answer price.",
    },
    {
        q: "Can my staff see the conversations?",
        a: "Yes. Every conversation and every number left with Jawaf shows in your dashboard, and you choose which team members can see conversations, answer questions, edit what Jawaf knows or change its settings.",
    },
]

const Q = "Admission kahile khulcha?"
const KEY = "BOLI_API_KEY"

/** A short API sample in the five tab languages (the OpenAI SDKs with Boli's base URL and a Jawaf model name). */
export function jawafSamples(origin: string): Record<SampleLanguage, string> {
    const base = `${origin}/v1`
    const url = `${origin}${API_PATHS.chatCompletions}`
    const body = JSON.stringify({ model: JAWAF_MODEL_EXAMPLE, messages: [{ role: "user", content: Q }] }, null, 2)
    return {
        curl: [`curl ${url} \\`, `  -H "Authorization: Bearer $${KEY}" \\`, `  -H "Content-Type: application/json" \\`, `  -d '${body}'`].join("\n"),
        python: [
            "import os",
            "from openai import OpenAI",
            "",
            `client = OpenAI(base_url="${base}", api_key=os.environ["${KEY}"])`,
            "",
            "response = client.chat.completions.create(",
            `    model="${JAWAF_MODEL_EXAMPLE}",`,
            `    messages=[{"role": "user", "content": "${Q}"}],`,
            ")",
            "print(response.choices[0].message.content)",
        ].join("\n"),
        typescript: [
            'import OpenAI from "openai";',
            "",
            `const client = new OpenAI({ baseURL: "${base}", apiKey: process.env.${KEY} });`,
            "",
            "const completion = await client.chat.completions.create({",
            `  model: "${JAWAF_MODEL_EXAMPLE}",`,
            `  messages: [{ role: "user", content: "${Q}" }],`,
            "});",
            "console.log(completion.choices[0]?.message.content);",
        ].join("\n"),
        javascript: [
            'import OpenAI from "openai";',
            "",
            `const client = new OpenAI({ baseURL: "${base}", apiKey: process.env.${KEY} });`,
            "",
            "const completion = await client.chat.completions.create({",
            `  model: "${JAWAF_MODEL_EXAMPLE}",`,
            `  messages: [{ role: "user", content: "${Q}" }],`,
            "});",
            "console.log(completion.choices[0].message.content);",
        ].join("\n"),
        go: [
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
            `\t\toption.WithBaseURL("${base}"),`,
            `\t\toption.WithAPIKey(os.Getenv("${KEY}")),`,
            "\t)",
            "",
            "\tcompletion, err := client.Chat.Completions.New(context.Background(), openai.ChatCompletionNewParams{",
            `\t\tModel: "${JAWAF_MODEL_EXAMPLE}",`,
            "\t\tMessages: []openai.ChatCompletionMessageParamUnion{",
            `\t\t\topenai.UserMessage("${Q}"),`,
            "\t\t},",
            "\t})",
            "\tif err != nil {",
            "\t\tpanic(err)",
            "\t}",
            "\tfmt.Println(completion.Choices[0].Message.Content)",
            "}",
        ].join("\n"),
    }
}
