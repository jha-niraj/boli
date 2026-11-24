import type { Metadata } from "next"
import { pageMeta } from "@/lib/seo"
import { ArrowRight, ArrowUpRight } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { PixelVignette, vignetteAspect } from "@repo/brand/art/vignettes/vignette"
import { PillButton } from "@repo/brand/pill-button"
import { DISPLAY } from "@repo/brand/type"
import { PageHero } from "@/components/public/page-hero"
import { revealStep } from "@/components/public/section"
import { SKY_TEXT } from "@/components/public/tokens"
import { DOCS_PAGES, ROUTES } from "@/lib/routes"
import { DocsMobileNav } from "./_components/docs-mobile-nav"
import { SIGNUP_URL } from "@/lib/app-links"

/*
 * /docs (round 4, owner 2026-11-24): a real index instead of a redirect - the docs hero (the developer at a laptop with
 * a terminal), then one card per page. The four pages themselves are unchanged.
 */

export const metadata: Metadata = pageMeta({
    title: "Docs",
    description: "Build with the Boli API: a quickstart in five languages, authentication and errors, chat completions, models, prices and limits.",
    path: ROUTES.docs,
})

const BLURB: Record<(typeof DOCS_PAGES)[number]["slug"], string> = {
    quickstart: "Create a key and make your first call with the OpenAI SDK, in cURL, Python, TypeScript, JavaScript or Go.",
    authentication: "Send your key, and what every error code means and how to fix it.",
    chatcompletions: "The request fields, the response, streaming and thinking.",
    models: "Boli's models, prices per 1M tokens in rupees, a worked cost example and the limits.",
}

export default function DocsIndex() {
    const first = DOCS_PAGES[0]
    return (
        <div className="grid gap-10 font-sans">
            <DocsMobileNav current="Overview" />
            <PageHero
                inset
                kicker="Docs"
                title={
                    <>
                        Build with Boli <span className={SKY_TEXT}>in five minutes</span>
                    </>
                }
                line="An OpenAI-compatible API on an open model that reads English, Romanized Nepali and both. Keep your SDK, change the base URL."
                artAspect={vignetteAspect("docsDesk")}
                art={<PixelVignette id="docsDesk" />}
            >
                <div className="flex flex-wrap gap-3">
                    <PillButton asChild>
                        <AppLink href={ROUTES.doc(first.slug)}>
                            Start with the {first.title} <ArrowRight aria-hidden />
                        </AppLink>
                    </PillButton>
                    <PillButton asChild variant="secondary">
                        <a href={SIGNUP_URL}>Get an API key</a>
                    </PillButton>
                </div>
            </PageHero>
            <section aria-labelledby="docs-pages-title">
                <h2 id="docs-pages-title" className="text-2xl leading-tight text-boli-ink" style={DISPLAY.h3}>
                    Every page
                </h2>
                <ol className="mt-5 grid gap-3 sm:grid-cols-2">
                    {DOCS_PAGES.map((p, i) => (
                        <li key={p.slug} data-reveal={revealStep(i)} className="min-w-0">
                            <AppLink
                                href={ROUTES.doc(p.slug)}
                                className="group flex h-full cursor-pointer flex-col gap-2 rounded-3xl border border-boli-line bg-white p-5 transition-colors hover:border-[#d6d0c8] hover:bg-[#fbfaf8]"
                            >
                                <span className="flex items-center justify-between gap-3">
                                    <span className="font-mono text-xs text-boli-muted">{String(i + 1).padStart(2, "0")}</span>
                                    <ArrowUpRight
                                        aria-hidden
                                        strokeWidth={1.75}
                                        className="size-4 text-boli-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none"
                                    />
                                </span>
                                <span className="text-[22px] leading-tight text-boli-ink" style={DISPLAY.card}>
                                    {p.title}
                                </span>
                                <span className="text-sm leading-6 text-boli-text">{BLURB[p.slug]}</span>
                            </AppLink>
                        </li>
                    ))}
                </ol>
            </section>
        </div>
    )
}
