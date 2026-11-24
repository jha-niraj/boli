import type { ReactNode } from "react"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { cn } from "@repo/ui/lib/utils"
import { PillButton } from "@repo/brand/pill-button"
import { DISPLAY } from "@repo/brand/type"
import { KURA, WELCOME_CREDITS } from "@repo/boli"
import { DocsToc } from "@/app/(public)/docs/_components/docs-toc"
import { KEYS_URL, KURA_URL } from "@/lib/app-links"
import { adjacent, entryHref, formatContentDate, getAuthor, related, type ContentEntry } from "@/lib/content"
import { AuthorAvatar, AuthorBlock } from "./author"
import { Breadcrumb } from "./breadcrumb"
import { ContentBody } from "./content-body"
import { ContentFaqSection, FAQ_ANCHOR, FAQ_TITLE } from "./content-faq"
import { KeyTakeaways } from "./key-takeaways"
import { TopicChips } from "./topic-chips"
import { Cover } from "./cover"
import { DraftBadge } from "./draft-badge"
import { PostCard } from "./post-card"

/**
 * A long read (a blog post or a guide): breadcrumb, title, summary, byline, topic chips, the cover, then the article in
 * a reading column - "Key takeaways" first, the body, the questions (frontmatter faqs, same list as the page's FAQPage
 * JSON-LD), "Written by" - with the docs' bending "On this page" line on the right from xl, then "Read next" and the
 * older / newer pager. One h1 (the title); the body's ## are h2, ### h3; "Read next" is an h2 with h3 cards.
 */
export function ArticleLayout({ entry, crumbs, aside }: { entry: ContentEntry; crumbs: readonly { name: string; href: string }[]; aside?: ReactNode }) {
    const next = related(entry, 3)
    const { newer, older } = adjacent(entry)
    const updated = entry.updated && entry.updated !== entry.date ? entry.updated : undefined
    const author = getAuthor(entry.author)
    const toc = entry.faqs.length ? [...entry.toc, { id: FAQ_ANCHOR, title: FAQ_TITLE, depth: 2 as const }] : entry.toc
    return (
        <article className="mx-auto w-full max-w-6xl px-4 pb-20 pt-8 font-sans sm:px-6 sm:pt-10 lg:px-10">
            <header className="max-w-3xl">
                <Breadcrumb items={crumbs} />
                <h1 className="mt-5 text-[38px] leading-[1.04] text-boli-ink sm:text-[52px] sm:leading-[1.02]" style={DISPLAY.display}>
                    {entry.title}
                </h1>
                <p className="mt-5 text-lg leading-8 text-boli-text">{entry.summary}</p>
                <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-boli-muted">
                    <span className="flex items-center gap-2 text-boli-ink">
                        <AuthorAvatar author={author} size={24} />
                        {author.name}
                    </span>
                    <span aria-hidden>-</span>
                    <time dateTime={entry.date}>{formatContentDate(entry.date)}</time>
                    {updated ? (
                        <>
                            <span aria-hidden>-</span>
                            <span>
                                Updated <time dateTime={updated}>{formatContentDate(updated)}</time>
                            </span>
                        </>
                    ) : null}
                    <span aria-hidden>-</span>
                    <span>{entry.readingMinutes} min read</span>
                    <DraftBadge draft={entry.draft} />
                </p>
                <TopicChips topics={entry.topics} className="mt-4" />
            </header>

            <Cover name={entry.cover} rounded="rounded-3xl" className="mt-10 shadow-[0_1px_2px_rgba(20,20,20,0.04),0_12px_32px_-18px_rgba(20,20,20,0.18)]" />

            <div className="mt-12 grid gap-12 xl:grid-cols-[minmax(0,1fr)_208px]">
                <div className="min-w-0 max-w-3xl">
                    <KeyTakeaways items={entry.takeaways} className="mb-10" />
                    <ContentBody entry={entry} />
                    <ContentFaqSection items={entry.faqs} />
                    <AuthorBlock authorId={entry.author} className="mt-14" />
                    {aside ?? <EndCta />}
                </div>
                {toc.length > 1 ? (
                    <nav aria-label="On this page" className="hidden xl:block">
                        <div className="sticky top-[6.5rem]">
                            <DocsToc headings={toc} />
                        </div>
                    </nav>
                ) : null}
            </div>

            {next.length ? (
                <section aria-labelledby="read-next" className="mt-20 border-t border-boli-line pt-12">
                    <h2 id="read-next" className="font-serif text-3xl leading-tight text-boli-ink" style={DISPLAY.h3}>
                        Read next
                    </h2>
                    <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                        {next.map((e) => (
                            <PostCard key={e.slug} entry={e} headingLevel={3} />
                        ))}
                    </div>
                </section>
            ) : null}

            {newer || older ? (
                <nav aria-label={entry.kind === "blog" ? "More posts" : "More guides"} className="mt-14 grid gap-3 sm:grid-cols-2">
                    {older ? <Pager entry={older} dir="older" /> : <span />}
                    {newer ? <Pager entry={newer} dir="newer" /> : null}
                </nav>
            ) : null}
        </article>
    )
}

function Pager({ entry, dir }: { entry: ContentEntry; dir: "older" | "newer" }) {
    return (
        <AppLink
            href={entryHref(entry)}
            className={cn("group min-w-0 cursor-pointer rounded-2xl border border-boli-line bg-white p-4 transition-colors hover:border-boli-ink/20", dir === "newer" && "sm:text-right")}
        >
            <span className={cn("flex items-center gap-1.5 text-xs text-boli-muted", dir === "newer" && "sm:justify-end")}>
                {dir === "older" ? <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> : null}
                {dir === "older" ? "Older" : "Newer"}
                {dir === "newer" ? <ArrowRight className="h-3.5 w-3.5" aria-hidden /> : null}
            </span>
            <span className="mt-1 block text-sm font-semibold text-boli-ink">{entry.title}</span>
        </AppLink>
    )
}

/** The close of every post: try it in Kura, or build with a key. */
function EndCta() {
    return (
        <div className="mt-14 flex flex-col gap-5 rounded-2xl border border-boli-line bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <p className="font-serif text-2xl leading-tight text-boli-ink" style={DISPLAY.card}>
                    Try it in your own words
                </p>
                <p className="mt-1 text-sm text-boli-text">{WELCOME_CREDITS} free credits when you verify your email. No card.</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
                <PillButton asChild variant="secondary">
                    <a href={KEYS_URL}>Get API key</a>
                </PillButton>
                <PillButton asChild>
                    <a href={KURA_URL}>
                        Try {KURA.name} <ArrowRight aria-hidden />
                    </a>
                </PillButton>
            </div>
        </div>
    )
}
