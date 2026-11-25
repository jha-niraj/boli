"use client"

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type SVGProps } from "react"
import { Check, Copy } from "lucide-react"
import type { HighlighterCore } from "shiki/core"
import { Button } from "@repo/ui/components/ui/button"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { cn } from "@repo/ui/lib/utils"
import { SAMPLE_LANGUAGES, type SampleLanguage } from "@repo/boli/code-samples"
import type * as HighlightModule from "@repo/boli/highlight"
import type { CodeLang, HlLine } from "@repo/boli/highlight"

/**
 * Code samples in cURL / Python / TypeScript / JavaScript / Go tabs, each with a small language mark, and a Copy button.
 * Highlighted by Shiki (lib/highlight.ts) in Boli's quiet theme: names in ink, syntax in grey, values in the one blue.
 *
 * Two ways to get colours:
 * - Pre-highlighted: a server component (`HighlightedCodeTabs`, code-tabs-server.tsx) passes `highlighted`, so the
 *   public pages ship no highlighter at all.
 * - Lazily: without `highlighted` (Kura's Code tab, Home), the highlighter module is imported on first render and
 *   cached for the session; until it arrives the code shows plain, the same size, so nothing jumps.
 *
 * The tab strip lives in a container query: in a narrow block (a phone, Kura's column) only the active tab keeps its
 * label, the rest show their mark (with the name for screen readers and in a title). Long lines scroll sideways
 * inside the block's own ScrollArea, never the page.
 */
export function CodeTabs({
    samples,
    highlighted,
    className,
    bodyViewportClassName = CODE_CEILING,
    defaultLanguage = "curl",
    fill = false,
}: {
    samples: Record<SampleLanguage, string>
    /** Lines per language from `highlight()`; leave out to highlight in the browser. */
    highlighted?: Partial<Record<SampleLanguage, HlLine[] | null>>
    className?: string
    /**
     * Bounds the code. Default: a ceiling (CODE_CEILING) - short samples stay short, a long one scrolls inside its own
     * ScrollArea instead of stretching the page (owner, 2026-11-24). Pass a fixed height (e.g. `h-[26rem]`) where the
     * block must keep one size for every language.
     */
    bodyViewportClassName?: string
    defaultLanguage?: SampleLanguage
    /**
     * Fill the height the parent gives the block (`className` sets it, e.g. `h-[20rem] lg:h-full` in a stretched grid
     * cell) instead of sizing to the code - so a code block beside a card ends at the card's bottom. The code then
     * scrolls inside whatever is left under the tab strip; `bodyViewportClassName` is ignored.
     */
    fill?: boolean
}) {
    const [lang, setLang] = useState<SampleLanguage>(defaultLanguage)
    const id = useId()
    const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
    const grammar = SAMPLE_LANGUAGES.find((l) => l.id === lang)?.grammar ?? "shellscript"
    const pre = highlighted?.[lang]
    const hl = useLazyHighlighter(!pre)
    const lines = useLiveTokens(hl, pre ? null : samples[lang], grammar)

    function onKey(e: KeyboardEvent<HTMLDivElement>) {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return
        const i = SAMPLE_LANGUAGES.findIndex((l) => l.id === lang)
        const step = e.key === "ArrowRight" ? 1 : -1
        const next = SAMPLE_LANGUAGES[(i + step + SAMPLE_LANGUAGES.length) % SAMPLE_LANGUAGES.length]
        if (!next) return
        setLang(next.id)
        tabRefs.current[next.id]?.focus()
    }

    return (
        <div className={cn("@container min-w-0 overflow-hidden rounded-2xl border border-boli-line bg-white dark:border-neutral-800 dark:bg-neutral-900", fill && "flex flex-col", className)}>
            <div className="flex min-w-0 shrink-0 items-center justify-between gap-2 border-b border-boli-line px-1.5 py-1.5 dark:border-neutral-800">
                <div role="tablist" aria-label="Language" onKeyDown={onKey} className="flex min-w-0 items-center gap-0.5">
                    {SAMPLE_LANGUAGES.map((l) => {
                        const active = l.id === lang
                        return (
                            <Button
                                key={l.id}
                                ref={(el) => {
                                    tabRefs.current[l.id] = el
                                }}
                                type="button"
                                role="tab"
                                id={`${id}-tab-${l.id}`}
                                aria-selected={active}
                                aria-controls={`${id}-panel`}
                                tabIndex={active ? 0 : -1}
                                title={l.label}
                                variant="ghost"
                                size="sm"
                                onClick={() => setLang(l.id)}
                                className={cn(
                                    "h-8 shrink-0 cursor-pointer gap-1.5 px-2.5 text-xs",
                                    active
                                        ? "bg-boli-ground text-boli-ink ring-1 ring-boli-line hover:bg-boli-ground dark:bg-neutral-800 dark:text-white dark:ring-neutral-700 dark:hover:bg-neutral-800"
                                        : "text-boli-muted hover:bg-boli-ground hover:text-boli-ink dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white",
                                )}
                            >
                                <LanguageMark lang={l.id} className="h-3.5 w-3.5 shrink-0" />
                                <span className={cn(!active && "sr-only @min-[34rem]:not-sr-only")}>{l.label}</span>
                            </Button>
                        )
                    })}
                </div>
                <CopyButton text={samples[lang]} />
            </div>
            <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${lang}`} tabIndex={0} className={cn("outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-boli-blue/30", fill && "relative min-h-0 flex-1")}>
                {fill ? (
                    // Absolute so the scroller takes the panel's real height (a percentage height inside Radix ScrollArea collapses).
                    <CodeBody code={samples[lang]} lines={pre ?? lines} className="absolute inset-0" viewportClassName="h-full" />
                ) : (
                    <CodeBody code={samples[lang]} lines={pre ?? lines} viewportClassName={bodyViewportClassName} />
                )}
            </div>
        </div>
    )
}

/** The tallest a code block grows before it scrolls inside: about 16 lines of 24px plus padding. */
export const CODE_CEILING = "max-h-[26rem]"

/**
 * The code itself: warm off-white in light, near-black in dark, Geist Mono, scrolling sideways in its own ScrollArea.
 * Renders Shiki lines when given, else the plain text. Shared by CodeTabs and the docs' single CodeBlock.
 */
export function CodeBody({
    code,
    lines,
    wrap,
    className,
    viewportClassName,
}: {
    code: string
    lines?: HlLine[] | null
    wrap?: boolean
    className?: string
    /** Bounds the scroller. Default CODE_CEILING (about 16 lines); a fixed height keeps one size. */
    viewportClassName?: string
}) {
    const pre = (
        <pre
            className={cn(
                "p-4 font-mono text-[13px] leading-6 text-boli-ink [tab-size:4] dark:text-neutral-200",
                wrap ? "whitespace-pre-wrap break-words" : "min-w-max",
            )}
        >
            <code>{lines ? <Lines lines={lines} /> : code}</code>
        </pre>
    )
    if (wrap) {
        return (
            <ScrollArea orientation="vertical" viewportClassName={viewportClassName ?? CODE_CEILING} className={cn("min-w-0 bg-boli-ground/60 dark:bg-neutral-950", className)}>
                {pre}
            </ScrollArea>
        )
    }
    return (
        <ScrollArea
            orientation="both"
            viewportClassName={viewportClassName ?? CODE_CEILING}
            className={cn("min-w-0 bg-boli-ground/60 dark:bg-neutral-950", className)}
        >
            {pre}
        </ScrollArea>
    )
}

function Lines({ lines }: { lines: HlLine[] }) {
    return (
        <>
            {lines.map((line, i) => (
                <span key={i}>
                    {line.map((tok, j) =>
                        tok.l || tok.d ? (
                            <span key={j} style={tokenStyle(tok.l, tok.d)} className={cn(tok.l && "text-(--hl-l)", tok.d && "dark:text-(--hl-d)")}>
                                {tok.t}
                            </span>
                        ) : (
                            tok.t
                        ),
                    )}
                    {i < lines.length - 1 ? "\n" : null}
                </span>
            ))}
        </>
    )
}

function tokenStyle(l: string | undefined, d: string | undefined): CSSProperties {
    const vars: Record<string, string> = {}
    if (l) vars["--hl-l"] = l
    if (d) vars["--hl-d"] = d
    return vars as CSSProperties
}

type Highlight = typeof HighlightModule

/** The highlight module and its highlighter, loaded once per browser session on first use, then shared. */
let browserHighlighter: Promise<{ mod: Highlight; hl: HighlighterCore }> | null = null

function loadBrowserHighlighter() {
    browserHighlighter ??= import("@repo/boli/highlight")
        .then(async (mod) => ({ mod, hl: await mod.loadHighlighter() }))
        .catch((e: unknown) => {
            browserHighlighter = null
            throw e
        })
    return browserHighlighter
}

function useLazyHighlighter(enabled: boolean) {
    const [state, setState] = useState<{ mod: Highlight; hl: HighlighterCore } | null>(null)
    useEffect(() => {
        if (!enabled || state) return
        let live = true
        loadBrowserHighlighter()
            .then((s) => {
                if (live) setState(s)
            })
            .catch(() => {
                // Plain text stays; highlighting is a nicety, never a failure the reader sees.
            })
        return () => {
            live = false
        }
    }, [enabled, state])
    return state
}

/** Tokenises synchronously once loaded, so live edits (Kura settings, the draft) re-colour in the same frame. */
function useLiveTokens(state: { mod: Highlight; hl: HighlighterCore } | null, code: string | null, lang: CodeLang): HlLine[] | null {
    return useMemo(() => {
        if (!state || code === null) return null
        try {
            return state.mod.tokenize(state.hl, code, lang)
        } catch {
            return null
        }
    }, [state, code, lang])
}

/** Copy to clipboard with a two-second "Copied" state. Exported for single code blocks (the coding-agent prompt). */
export function CopyButton({ text, label = "Copy", className }: { text: string; label?: string; className?: string }) {
    const [copied, setCopied] = useState(false)
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
    useEffect(
        () => () => {
            if (timer.current) clearTimeout(timer.current)
        },
        [],
    )

    async function copy() {
        try {
            await navigator.clipboard.writeText(text)
            setCopied(true)
            if (timer.current) clearTimeout(timer.current)
            timer.current = setTimeout(() => setCopied(false), 2000)
        } catch {
            setCopied(false)
        }
    }

    return (
        <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={copy}
            className={cn("h-8 shrink-0 cursor-pointer gap-1.5 px-3 text-xs text-boli-text hover:bg-boli-ground dark:text-neutral-300 dark:hover:bg-neutral-800", className)}
        >
            {copied ? <Check className="h-3.5 w-3.5 text-boli-blue dark:text-sky-300" /> : <Copy className="h-3.5 w-3.5" />}
            <span aria-live="polite">{copied ? "Copied" : label}</span>
        </Button>
    )
}

/** Small one-colour language marks (inline SVG, currentColor): a terminal for cURL, the two snakes for Python, letter tiles for the rest. */
export function LanguageMark({ lang, ...props }: { lang: SampleLanguage } & SVGProps<SVGSVGElement>) {
    const common = { viewBox: "0 0 16 16", fill: "none", "aria-hidden": true, focusable: false, ...props } as const
    switch (lang) {
        case "curl":
            return (
                <svg {...common}>
                    <rect x="1.5" y="2.5" width="13" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M4.5 6.5 6.5 8l-2 1.5M8 10h3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            )
        case "python":
            return (
                <svg {...common}>
                    <path
                        d="M7.9 1.5c-2.5 0-2.9 1.1-2.9 2.1v1.6h3v.6H3.7c-1.3 0-2.2.9-2.2 2.4 0 1.6.9 2.5 2.1 2.5H5V9.1c0-1.1.9-2 2-2h2.9c.9 0 1.6-.7 1.6-1.6V3.6c0-1-.9-2.1-3.6-2.1Z"
                        fill="currentColor"
                        opacity="0.9"
                    />
                    <path
                        d="M8.1 14.5c2.5 0 2.9-1.1 2.9-2.1v-1.6H8v-.6h4.3c1.3 0 2.2-.9 2.2-2.4 0-1.6-.9-2.5-2.1-2.5H11v1.6c0 1.1-.9 2-2 2H6.1c-.9 0-1.6.7-1.6 1.6v1.9c0 1 .9 2.1 3.6 2.1Z"
                        fill="currentColor"
                        opacity="0.55"
                    />
                    <circle cx="6.4" cy="3.3" r="0.6" className="fill-white dark:fill-neutral-800" />
                    <circle cx="9.6" cy="12.7" r="0.6" className="fill-white dark:fill-neutral-800" />
                </svg>
            )
        case "typescript":
        case "javascript":
        case "go":
            return (
                <svg {...common}>
                    <rect x="1.5" y="1.5" width="13" height="13" rx="3" fill="currentColor" opacity="0.14" />
                    <rect x="1.5" y="1.5" width="13" height="13" rx="3" stroke="currentColor" strokeWidth="1.1" />
                    <text x="8" y="11.1" textAnchor="middle" fontSize="6.6" fontWeight="600" fontFamily="inherit" fill="currentColor" letterSpacing="-0.2">
                        {lang === "typescript" ? "TS" : lang === "javascript" ? "JS" : "Go"}
                    </text>
                </svg>
            )
    }
}
