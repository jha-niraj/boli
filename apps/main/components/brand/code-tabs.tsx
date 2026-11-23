"use client"

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react"
import { Check, Copy } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { cn } from "@repo/ui/lib/utils"
import { SAMPLE_LANGUAGES, type SampleLanguage } from "@/lib/code-samples"

/**
 * Code samples in cURL / Python / JavaScript tabs with a Copy button. Light code block in Geist Mono on a white card;
 * long lines scroll inside the block, never the page. Plain buttons with tab semantics (no animation library: this
 * sits on public pages that must stay light). Strings and keys get a quiet colour; nothing else is highlighted.
 */
export function CodeTabs({
    samples,
    className,
    defaultLanguage = "curl",
}: {
    samples: Record<SampleLanguage, string>
    className?: string
    defaultLanguage?: SampleLanguage
}) {
    const [lang, setLang] = useState<SampleLanguage>(defaultLanguage)
    const id = useId()
    const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

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
        <div className={cn("min-w-0 overflow-hidden rounded-2xl border border-boli-line bg-white dark:border-neutral-800 dark:bg-neutral-900", className)}>
            <div className="flex items-center justify-between gap-2 border-b border-boli-line bg-boli-ground/60 px-2 py-1.5 dark:border-neutral-800 dark:bg-neutral-950/40">
                <div role="tablist" aria-label="Language" onKeyDown={onKey} className="flex min-w-0 gap-1">
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
                                variant="ghost"
                                size="sm"
                                onClick={() => setLang(l.id)}
                                className={cn(
                                    "h-8 px-3 text-xs",
                                    active ? "bg-white text-boli-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-boli-line hover:bg-white dark:bg-neutral-800 dark:text-white dark:ring-neutral-700 dark:hover:bg-neutral-800" : "text-boli-muted hover:bg-boli-sand hover:text-boli-ink dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white",
                                )}
                            >
                                {l.label}
                            </Button>
                        )
                    })}
                </div>
                <CopyButton text={samples[lang]} />
            </div>
            <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${lang}`} tabIndex={0} className="overflow-x-auto outline-none focus-visible:ring-2 focus-visible:ring-boli-blue/30">
                <pre className="min-w-max p-4 font-mono text-[13px] leading-6 text-boli-ink dark:text-neutral-100">
                    <code>
                        <Highlighted code={samples[lang]} />
                    </code>
                </pre>
            </div>
        </div>
    )
}

/** Copy to clipboard with a two-second "Copied" state. Exported for single code blocks (the coding-agent prompt). */
export function CopyButton({ text, label = "Copy", className }: { text: string; label?: string; className?: string }) {
    const [copied, setCopied] = useState(false)
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
    useEffect(() => () => {
        if (timer.current) clearTimeout(timer.current)
    }, [])

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
        <Button type="button" variant="ghost" size="sm" onClick={copy} className={cn("h-8 shrink-0 gap-1.5 px-3 text-xs text-boli-text hover:bg-boli-sand dark:text-neutral-300 dark:hover:bg-neutral-800", className)}>
            {copied ? <Check className="h-3.5 w-3.5 text-boli-blue" /> : <Copy className="h-3.5 w-3.5" />}
            <span aria-live="polite">{copied ? "Copied" : label}</span>
        </Button>
    )
}

/** Colours double-quoted strings (and the key before a colon) in the deep blue. Enough to read a sample at a glance. */
function Highlighted({ code }: { code: string }) {
    const parts = code.split(/("(?:[^"\\]|\\.)*")/g)
    return (
        <>
            {parts.map((p, i) =>
                p.startsWith('"') && p.endsWith('"') && p.length > 1 ? (
                    <span key={i} className="text-boli-blue dark:text-sky-300">
                        {p}
                    </span>
                ) : (
                    <span key={i}>{p}</span>
                ),
            )}
        </>
    )
}
