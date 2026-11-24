import type { ReactNode } from "react"
import { ArrowLeft, ArrowRight, Info, KeyRound, TriangleAlert } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { cn } from "@repo/ui/lib/utils"
import { CodeBody, CopyButton } from "@/components/brand/code-tabs"
import { DISPLAY } from "@/components/brand/type"
import { WELCOME_CREDITS } from "@/lib/boli"
import { highlight, type CodeLang } from "@/lib/highlight"
import { DOCS_PAGES, ROUTES } from "@/lib/navigation"
import { DocsMobileNav } from "./docs-mobile-nav"
import { DocsToc, type DocHeading } from "./docs-toc"

/** The building blocks every docs page uses, so the four pages read as one manual. Server Components. */

export type { DocHeading }

/** The three columns (page list, page, "On this page") start on one line: each opens with this label style. */
export const DOCS_LABEL = "text-xs font-medium leading-5 text-boli-muted"

export function DocPage({ slug, lead, headings, children }: { slug: string; lead: ReactNode; headings: DocHeading[]; children: ReactNode }) {
    const index = DOCS_PAGES.findIndex((p) => p.slug === slug)
    const page = DOCS_PAGES[index]
    const prev = index > 0 ? DOCS_PAGES[index - 1] : undefined
    const next = index >= 0 && index < DOCS_PAGES.length - 1 ? DOCS_PAGES[index + 1] : undefined
    return (
        <div className="grid gap-12 font-sans xl:grid-cols-[minmax(0,1fr)_208px]">
            <div className="min-w-0">
                <DocsMobileNav current={page?.title ?? "Docs"} />
                <header className="mt-6 max-w-3xl border-b border-boli-line pb-8 lg:mt-0">
                    <p className={DOCS_LABEL}>Docs</p>
                    <h1 className="mt-2 font-serif text-4xl leading-[1.05] text-boli-ink sm:text-5xl" style={DISPLAY.h2}>
                        {page?.title}
                    </h1>
                    <div className="mt-3 max-w-2xl text-base leading-7 text-boli-text">{lead}</div>
                </header>
                <div className="max-w-3xl">{children}</div>
                <div className="mt-14 max-w-3xl">
                    <GetKeyCard />
                </div>
                <nav aria-label="Pages" className="mt-8 grid max-w-3xl gap-3 sm:grid-cols-2">
                    {prev ? <PagerLink href={ROUTES.doc(prev.slug)} label="Previous" title={prev.title} dir="prev" /> : <span />}
                    {next ? <PagerLink href={ROUTES.doc(next.slug)} label="Next" title={next.title} dir="next" /> : null}
                </nav>
            </div>
            {/* Below xl the column is too narrow for a third column: the TOC is left out (the page list and the
                headings' own anchors remain). */}
            <nav aria-label="On this page" className="hidden xl:block">
                <div className="sticky top-[6.5rem]">
                    <DocsToc headings={headings} />
                </div>
            </nav>
        </div>
    )
}

function PagerLink({ href, label, title, dir }: { href: string; label: string; title: string; dir: "prev" | "next" }) {
    return (
        <AppLink
            href={href}
            className={cn("group cursor-pointer rounded-2xl border border-boli-line bg-white p-4 transition-colors hover:border-boli-ink/20", dir === "next" && "sm:text-right")}
        >
            <span className={cn("flex items-center gap-1.5 text-xs text-boli-muted", dir === "next" && "sm:justify-end")}>
                {dir === "prev" ? <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> : null}
                {label}
                {dir === "next" ? <ArrowRight className="h-3.5 w-3.5" aria-hidden /> : null}
            </span>
            <span className="mt-1 block text-sm font-semibold text-boli-ink">{title}</span>
        </AppLink>
    )
}

export function H2({ id, children }: { id: string; children: ReactNode }) {
    return (
        <h2 id={id} className="mt-12 scroll-mt-24 font-serif text-3xl leading-tight text-boli-ink first:mt-10" style={DISPLAY.h3}>
            <a href={`#${id}`} className="cursor-pointer hover:underline hover:decoration-boli-line hover:underline-offset-8">
                {children}
            </a>
        </h2>
    )
}

export function H3({ id, children }: { id?: string; children: ReactNode }) {
    return (
        <h3 id={id} className="mt-8 scroll-mt-24 text-base font-semibold text-boli-ink">
            {children}
        </h3>
    )
}

export function P({ children }: { children: ReactNode }) {
    return <p className="mt-4 text-base leading-7 text-boli-text">{children}</p>
}

export function List({ children, ordered }: { children: ReactNode; ordered?: boolean }) {
    const cls = "mt-4 space-y-2 pl-6 text-base leading-7 text-boli-text marker:text-boli-muted"
    return ordered ? <ol className={cn(cls, "list-decimal")}>{children}</ol> : <ul className={cn(cls, "list-disc")}>{children}</ul>
}

export function C({ children }: { children: ReactNode }) {
    return <code className="rounded-md bg-boli-sand px-1.5 py-0.5 font-mono text-[0.85em] text-boli-ink">{children}</code>
}

/**
 * A single code block (a shell line, a JSON shape, a prompt) with Copy, highlighted on the server when `lang` is set.
 * `wrap` for prose-like text (the coding-agent prompt) that reads better wrapped than scrolled. Multi-language
 * examples use CodeTabs.
 */
export async function CodeBlock({ code, label, lang, wrap, className }: { code: string; label?: string; lang?: CodeLang; wrap?: boolean; className?: string }) {
    const lines = lang ? await highlight(code, lang) : null
    return (
        <div className={cn("mt-5 min-w-0 overflow-hidden rounded-2xl border border-boli-line bg-white", className)}>
            <div className="flex min-w-0 items-center justify-between gap-2 border-b border-boli-line py-1.5 pl-4 pr-1.5">
                <span className="min-w-0 truncate text-xs text-boli-muted">{label ?? ""}</span>
                <CopyButton text={code} />
            </div>
            <CodeBody code={code} lines={lines} wrap={wrap} />
        </div>
    )
}

/** A note beside the text: neutral card, a small icon, ink title. `warn` only changes the icon - colour stays out of it. */
export function Callout({ title, children, tone = "info" }: { title: string; children: ReactNode; tone?: "info" | "warn" }) {
    const Icon = tone === "warn" ? TriangleAlert : Info
    return (
        <div className="mt-6 flex gap-3 rounded-2xl border border-boli-line bg-white px-4 py-3.5">
            <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", tone === "warn" ? "text-boli-ink" : "text-boli-muted")} aria-hidden />
            <div className="min-w-0">
                <p className="text-sm font-semibold text-boli-ink">{title}</p>
                <div className="mt-0.5 text-sm leading-6 text-boli-text">{children}</div>
            </div>
        </div>
    )
}

/** A reference table that scrolls sideways inside its card on a phone (its own ScrollArea, never the page). */
export function DocTable({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
    return (
        <ScrollArea orientation="horizontal" className="mt-5 min-w-0 rounded-2xl border border-boli-line bg-white">
            <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                <thead>
                    <tr className="border-b border-boli-line bg-boli-ground/60">
                        {head.map((h) => (
                            <th key={h} scope="col" className="px-4 py-2.5 text-xs font-semibold text-boli-muted">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={i} className="border-b border-boli-line align-top last:border-0">
                            {r.map((cell, j) => (
                                <td key={j} className="px-4 py-3 leading-6 text-boli-text">
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </ScrollArea>
    )
}

export function GetKeyCard({ compact }: { compact?: boolean }) {
    if (compact) {
        return (
            <div className="rounded-2xl border border-boli-line bg-white p-4">
                <p className="text-sm font-semibold text-boli-ink">Get an API key</p>
                <p className="mt-1 text-xs leading-5 text-boli-muted">{WELCOME_CREDITS} free credits when you verify your email.</p>
                <Button asChild size="sm" className="mt-3 w-full bg-boli-ink text-white hover:bg-boli-ink/90">
                    <AppLink href={ROUTES.keys}>Get API key</AppLink>
                </Button>
            </div>
        )
    }
    return (
        <div className="flex flex-col gap-4 rounded-2xl border border-boli-line bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-4">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-boli-ground text-boli-ink ring-1 ring-boli-line">
                    <KeyRound className="h-5 w-5" aria-hidden />
                </span>
                <div>
                    <p className="font-serif text-2xl leading-tight text-boli-ink" style={DISPLAY.card}>
                        Ready to build?
                    </p>
                    <p className="mt-1 text-sm text-boli-text">Create a key and start with {WELCOME_CREDITS} free credits.</p>
                </div>
            </div>
            <Button asChild className="h-11 shrink-0 gap-2 bg-boli-ink px-6 text-white hover:bg-boli-ink/90">
                <AppLink href={ROUTES.keys}>
                    Get API key <ArrowRight className="h-4 w-4" aria-hidden />
                </AppLink>
            </Button>
        </div>
    )
}
