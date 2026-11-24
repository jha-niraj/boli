import "server-only"
import { SAMPLE_LANGUAGES, type SampleLanguage } from "@repo/boli/code-samples"
import { highlight, type HlLine } from "@repo/boli/highlight"
import { CodeTabs } from "./code-tabs"

/**
 * CodeTabs for server-rendered pages (landing, docs): every language is highlighted here, on the server, and handed to
 * the client tabs as plain data - the browser never loads Shiki. Same props as CodeTabs.
 */
export async function HighlightedCodeTabs(props: {
    samples: Record<SampleLanguage, string>
    className?: string
    bodyViewportClassName?: string
    defaultLanguage?: SampleLanguage
}) {
    const entries = await Promise.all(SAMPLE_LANGUAGES.map(async (l) => [l.id, await highlight(props.samples[l.id], l.grammar)] as const))
    const highlighted: Partial<Record<SampleLanguage, HlLine[] | null>> = Object.fromEntries(entries)
    return <CodeTabs {...props} highlighted={highlighted} />
}
