"use client"

import * as TabsPrimitive from "@radix-ui/react-tabs"
import { Check, Copy } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@repo/ui/components/ui/button"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { cn } from "@repo/ui/lib/utils"

export type CodeSample = { id: string; label: string; code: string }

/**
 * A code block in the editorial character: a header row with the languages as quiet text tabs (an ink dot marks the
 * active one, no chips), the endpoint in mono on the right and a round copy button. The body is plain mono here -
 * syntax colour comes from the shared code highlighter when this moves into components/brand.
 */
export function CodeFrame({ samples, meta, className }: { samples: CodeSample[]; meta?: string; className?: string }) {
    const [value, setValue] = useState(samples[0]?.id ?? "")
    const [copied, setCopied] = useState(false)
    const active = samples.find((s) => s.id === value)

    useEffect(() => {
        if (!copied) return
        const t = window.setTimeout(() => setCopied(false), 1600)
        return () => window.clearTimeout(t)
    }, [copied])

    return (
        <TabsPrimitive.Root value={value} onValueChange={setValue} className={cn("min-w-0 overflow-hidden rounded-2xl border border-boli-line bg-white", className)}>
            <div className="flex items-center justify-between gap-4 border-b border-boli-line px-4">
                <TabsPrimitive.List aria-label="Language" className="flex min-w-0 gap-5 overflow-hidden">
                    {samples.map((s) => (
                        <TabsPrimitive.Trigger
                            key={s.id}
                            value={s.id}
                            className="group/code relative inline-flex h-11 cursor-pointer items-center gap-1.5 text-[13px] tracking-[0.005em] text-boli-muted outline-none transition-colors hover:text-boli-ink focus-visible:text-boli-ink data-[state=active]:text-boli-ink"
                        >
                            <span aria-hidden className="size-1 rounded-full bg-boli-ink opacity-0 transition-opacity group-data-[state=active]/code:opacity-100" />
                            {s.label}
                        </TabsPrimitive.Trigger>
                    ))}
                </TabsPrimitive.List>
                <div className="flex shrink-0 items-center gap-3">
                    {meta ? <span className="hidden font-mono text-xs text-boli-muted sm:inline">{meta}</span> : null}
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={copied ? "Copied" : "Copy code"}
                        onClick={async () => {
                            if (!active) return
                            await navigator.clipboard.writeText(active.code)
                            setCopied(true)
                        }}
                        className="rounded-full text-boli-muted hover:bg-boli-sand hover:text-boli-ink"
                    >
                        {copied ? <Check strokeWidth={1.75} className="size-4" /> : <Copy strokeWidth={1.5} className="size-4" />}
                    </Button>
                </div>
            </div>
            {samples.map((s) => (
                <TabsPrimitive.Content key={s.id} value={s.id} className="outline-none">
                    <ScrollArea orientation="horizontal">
                        <pre className="w-max min-w-full px-5 py-4 font-mono text-[13px] leading-6 text-boli-text">
                            <code>{s.code}</code>
                        </pre>
                    </ScrollArea>
                </TabsPrimitive.Content>
            ))}
        </TabsPrimitive.Root>
    )
}
