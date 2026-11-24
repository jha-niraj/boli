/*
 * Topics: the subject hubs under /blog/topics/<id>. A post or a guide names its topics in frontmatter
 * (`topics: [romanized-nepali, api]`) and scripts/build-content.ts rejects an id that is not here. Framework-free (the
 * build script imports it).
 *
 * A topic is a SUBJECT people search for, not a content type (Blog categories already say Launch / Product / Research).
 * Its page lists the published posts AND guides that carry it, newest first. A topic with nothing published is not
 * built in production, not in the sitemap and not linked (lib/content.ts `topicsInUse`).
 *
 * `title` is the h1 and the <title> (keep it under about 50 characters); `description` is the meta description and
 * the line under the h1 (110-160 characters, facts only). Ids are the URL: lowercase words joined by hyphens, never
 * renamed once published (an indexed URL would 404).
 */

export type Topic = {
    title: string
    description: string
}

export const TOPICS = {
    "romanized-nepali": {
        title: "Romanized Nepali",
        description: "How people in Nepal write Nepali in Latin letters and mix it with English, and how Boli's open model reads it and answers in the same script.",
    },
    api: {
        title: "Building with the API",
        description: "Guides and notes on Boli's OpenAI-compatible API: the first call, system prompts, memory, costs per call in rupees and handling errors.",
    },
    "open-models": {
        title: "Open models",
        description: "Which open models Boli runs, how we test them on real Nepali, Romanized Nepali and English, and where small open models still fall short.",
    },
    "document-intelligence": {
        title: "Document intelligence",
        description: "Reading Nepali bills, notices and forms with open models and open OCR: what we measured, where digits fail and what Boli builds next.",
    },
    kura: {
        title: "Kura",
        description: "Kura is Boli's chat app: talk to an open model in Romanized Nepali, English, Devanagari or a mix, and see what every reply cost.",
    },
} as const satisfies Record<string, Topic>

export type TopicId = keyof typeof TOPICS

export const TOPIC_IDS = Object.keys(TOPICS) as TopicId[]

export function isTopicId(v: string): v is TopicId {
    return Object.prototype.hasOwnProperty.call(TOPICS, v)
}
