import type { Metadata } from "next"
import type { ComponentType } from "react"
import { notFound } from "next/navigation"
import { DOCS_PAGES, ROUTES } from "@/lib/navigation"
import { Authentication } from "../_content/authentication"
import { ChatCompletions } from "../_content/chat-completions"
import { Models } from "../_content/models"
import { Quickstart } from "../_content/quickstart"

type Slug = (typeof DOCS_PAGES)[number]["slug"]

const PAGES: Record<Slug, { Body: ComponentType; description: string }> = {
    quickstart: { Body: Quickstart, description: "Create an API key and make your first Boli call with the OpenAI SDK in Python, JavaScript or cURL." },
    authentication: { Body: Authentication, description: "Send your Boli API key, and what every error code means and how to fix it." },
    chatcompletions: { Body: ChatCompletions, description: "The Boli chat completions endpoint: request fields, response, streaming and thinking." },
    models: { Body: Models, description: "Boli's models, prices per 1M tokens in NPR, a worked cost example, credits and rate limits." },
}

function isSlug(s: string): s is Slug {
    return DOCS_PAGES.some((p) => p.slug === s)
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params
    if (!isSlug(slug)) return {}
    const page = DOCS_PAGES.find((p) => p.slug === slug)
    return {
        title: `${page?.title ?? "Docs"} - Docs`,
        description: PAGES[slug].description,
        alternates: { canonical: ROUTES.doc(slug) },
    }
}

export default async function DocPageRoute({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    if (!isSlug(slug)) notFound()
    const { Body } = PAGES[slug]
    return <Body />
}
