// Renders one @repo/legal document in the public reading layout: Fraunces (font-serif) title, Instrument Sans body, a table of contents on wide
// screens, readable body type. Server component (react-markdown renders on the server; no client JS).
import { Children, isValidElement, type ReactNode } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AppLink } from '@repo/ui/components/app-link'
import { SITE } from '@repo/core/site'
import { getLegalDocument, listLegalDocuments, type LegalContext, type LegalDocumentSlug } from '@repo/legal/documents'
import { DISPLAY } from '@/components/brand/type'
import { BRAND, RATE_LIMIT_PER_MIN, WELCOME_CREDITS } from '@/lib/boli'

/** The operator and address are placeholders in lib/boli.ts (BRAND) until the owner gives them (plan Q13). */
export const LEGAL_CONTEXT: LegalContext = {
    productName: SITE.name,
    siteUrl: SITE.url,
    contactEmail: BRAND.contactEmail,
    companyName: BRAND.legalEntity,
    platform: { welcomeCredits: WELCOME_CREDITS, rateLimitPerMin: RATE_LIMIT_PER_MIN, paymentMethods: 'eSewa or Khalti' },
}

function textOf(node: ReactNode): string {
    return Children.toArray(node)
        .map((c) => (typeof c === 'string' || typeof c === 'number' ? String(c) : isValidElement<{ children?: ReactNode }>(c) ? textOf(c.props.children) : ''))
        .join('')
}

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

const components: Components = {
    h2: ({ children }) => (
        <h2 id={slugify(textOf(children))} className="mt-12 scroll-mt-24 font-serif text-3xl leading-tight text-boli-ink" style={DISPLAY.h3}>
            {children}
        </h2>
    ),
    h3: ({ children }) => <h3 className="mt-8 text-base font-semibold text-boli-ink">{children}</h3>,
    p: ({ children }) => <p className="mt-4 text-base leading-7 text-boli-text">{children}</p>,
    ul: ({ children }) => <ul className="mt-4 list-disc space-y-2 pl-6 text-base leading-7 text-boli-text marker:text-boli-muted">{children}</ul>,
    ol: ({ children }) => <ol className="mt-4 list-decimal space-y-2 pl-6 text-base leading-7 text-boli-text">{children}</ol>,
    strong: ({ children }) => <strong className="font-semibold text-boli-ink">{children}</strong>,
    a: ({ href, children }) => (
        <a href={href} className="cursor-pointer text-boli-sky-ink underline underline-offset-2">
            {children}
        </a>
    ),
}

function formatDate(iso: string): string {
    return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
}

export function LegalDocumentPage({ slug }: { slug: LegalDocumentSlug }) {
    const doc = getLegalDocument(slug, LEGAL_CONTEXT)
    const others = listLegalDocuments().filter((d) => d.slug !== slug)
    const toc = doc.markdown
        .split('\n')
        .filter((l) => l.startsWith('## '))
        .map((l) => {
            const title = l.slice(3).trim()
            return { title, id: slugify(title) }
        })
    return (
        <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-14 font-sans sm:px-6 sm:pt-20 lg:px-10">
            <div className="grid gap-12 lg:grid-cols-[200px_minmax(0,1fr)]">
                <nav aria-label="Contents" className="hidden lg:block">
                    <div className="sticky top-24 max-h-[calc(100dvh-8rem)] overflow-y-auto pt-2">
                        <p className="text-xs font-medium text-boli-muted">Contents</p>
                        <ol className="mt-4 space-y-2 border-l border-boli-line">
                            {toc.map((t) => (
                                <li key={t.id}>
                                    <a href={`#${t.id}`} className="-ml-px block cursor-pointer border-l border-transparent pl-4 text-sm leading-5 text-boli-text hover:border-boli-ink hover:text-boli-ink">
                                        {t.title}
                                    </a>
                                </li>
                            ))}
                        </ol>
                    </div>
                </nav>
                <div className="mx-auto w-full min-w-0 max-w-2xl lg:mx-0">
                    <header>
                        <p className="text-sm font-[450] text-boli-sky-ink">Legal</p>
                        <h1 className="mt-3 font-serif text-[44px] leading-[1.04] text-boli-ink sm:text-5xl" style={DISPLAY.h2}>
                            {doc.title}
                        </h1>
                        <p className="mt-3 text-sm text-boli-muted">
                            Effective {formatDate(doc.effectiveDate)} - version {doc.version}
                        </p>
                        {doc.template ? (
                            <p role="note" className="mt-6 rounded-2xl border border-boli-line bg-white px-4 py-3 text-sm leading-6 text-boli-ink">
                                <strong className="font-semibold">Draft - to be reviewed by a lawyer before launch.</strong> Placeholders such as {BRAND.legalEntity}{' '}
                                and {BRAND.contactEmail} will be filled in then.
                            </p>
                        ) : null}
                    </header>
                    <article className="mt-4">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                            {doc.markdown}
                        </ReactMarkdown>
                    </article>
                    {others.length > 0 ? (
                        <nav aria-label="Other documents" className="mt-14 flex flex-wrap gap-4 border-t border-boli-line pt-6 text-sm">
                            {others.map((d) => (
                                <AppLink key={d.slug} href={d.path} className="cursor-pointer text-boli-sky-ink hover:underline">
                                    Read the {d.title}
                                </AppLink>
                            ))}
                        </nav>
                    ) : null}
                </div>
            </div>
        </div>
    )
}
