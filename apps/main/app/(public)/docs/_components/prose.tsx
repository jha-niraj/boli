import type { ReactNode } from "react"
import { ArrowLeft, ArrowRight, KeyRound } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { cn } from "@repo/ui/lib/utils"
import { CopyButton } from "@/components/brand/code-tabs"
import { WELCOME_CREDITS } from "@/lib/boli"
import { DOCS_PAGES, ROUTES } from "@/lib/navigation"
import { DocsMobileNav } from "./docs-mobile-nav"

/** The building blocks every docs page uses, so the four pages read as one manual. Server Components. */

export type DocHeading = { id: string; title: string }

export function DocPage({ slug, lead, headings, children }: { slug: string; lead: ReactNode; headings: DocHeading[]; children: ReactNode }) {
    const index = DOCS_PAGES.findIndex((p) => p.slug === slug)
    const page = DOCS_PAGES[index]
    const prev = index > 0 ? DOCS_PAGES[index - 1] : undefined
    const next = index >= 0 && index < DOCS_PAGES.length - 1 ? DOCS_PAGES[index + 1] : undefined
    return (
        <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_200px]">
            <div className="min-w-0">
                <DocsMobileNav current={page?.title ?? "Docs"} />
                <header className="mt-6 lg:mt-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-boli-crimson-ink">Docs</p>
                    <h1 className="mt-3 font-serif text-4xl leading-tight tracking-tight text-boli-ink sm:text-5xl">{page?.title}</h1>
                    <div className="mt-4 max-w-2xl text-base leading-7 text-boli-text">{lead}</div>
                </header>
                <div className="mt-4 max-w-3xl">{children}</div>
                <div className="mt-14 max-w-3xl">
                    <GetKeyCard />
                </div>
                <nav aria-label="Pages" className="mt-8 grid max-w-3xl gap-3 sm:grid-cols-2">
                    {prev ? <PagerLink href={ROUTES.doc(prev.slug)} label="Previous" title={prev.title} dir="prev" /> : <span />}
                    {next ? <PagerLink href={ROUTES.doc(next.slug)} label="Next" title={next.title} dir="next" /> : null}
                </nav>
            </div>
            <nav aria-label="On this page" className="hidden xl:block">
                <div className="sticky top-24">
                    <p className="text-xs font-semibold uppercase tracking-wider text-boli-muted">On this page</p>
                    <ul className="mt-4 space-y-2 border-l border-boli-line">
                        {headings.map((h) => (
                            <li key={h.id}>
                                <a href={`#${h.id}`} className="-ml-px block cursor-pointer border-l border-transparent pl-4 text-sm leading-5 text-boli-text hover:border-boli-ink hover:text-boli-ink">
                                    {h.title}
                                </a>
                            </li>
                        ))}
                    </ul>
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
        <h2 id={id} className="mt-14 scroll-mt-24 font-serif text-3xl leading-tight tracking-tight text-boli-ink">
            <a href={`#${id}`} className="cursor-pointer hover:underline hover:decoration-boli-line hover:underline-offset-8">
                {children}
            </a>
        </h2>
    )
}

export function H3({ children }: { children: ReactNode }) {
    return <h3 className="mt-8 text-base font-semibold text-boli-ink">{children}</h3>
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

/** A single code block (a shell line, a JSON shape, a prompt) with Copy. Multi-language examples use CodeTabs. */
export function CodeBlock({ code, label, className }: { code: string; label?: string; className?: string }) {
    return (
        <div className={cn("mt-5 min-w-0 overflow-hidden rounded-2xl border border-boli-line bg-white", className)}>
            <div className="flex items-center justify-between gap-2 border-b border-boli-line bg-boli-ground/60 px-4 py-1.5">
                <span className="truncate text-xs text-boli-muted">{label ?? ""}</span>
                <CopyButton text={code} />
            </div>
            <div className="overflow-x-auto">
                <pre className="min-w-max p-4 font-mono text-[13px] leading-6 text-boli-ink">
                    <code>{code}</code>
                </pre>
            </div>
        </div>
    )
}

export function Callout({ title, children, tone = "info" }: { title: string; children: ReactNode; tone?: "info" | "warn" }) {
    return (
        <div className={cn("mt-6 rounded-2xl border px-5 py-4", tone === "warn" ? "border-boli-crimson/25 bg-boli-crimson-soft" : "border-boli-blue/20 bg-boli-blue-soft")}>
            <p className="text-sm font-semibold text-boli-ink">{title}</p>
            <div className="mt-1 text-sm leading-6 text-boli-text">{children}</div>
        </div>
    )
}

/** A reference table that scrolls sideways inside its card on a phone. */
export function DocTable({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
    return (
        <div className="mt-5 overflow-x-auto rounded-2xl border border-boli-line bg-white">
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
        </div>
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
                    <p className="font-serif text-2xl leading-tight text-boli-ink">Ready to build?</p>
                    <p className="mt-1 text-sm text-boli-text">Create a key and start with {WELCOME_CREDITS} free credits.</p>
                </div>
            </div>
            <Button asChild className="h-11 shrink-0 gap-2 bg-boli-crimson px-6 text-white hover:bg-boli-crimson-ink">
                <AppLink href={ROUTES.keys}>
                    Get API key <ArrowRight className="h-4 w-4" aria-hidden />
                </AppLink>
            </Button>
        </div>
    )
}
