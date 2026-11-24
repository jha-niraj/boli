import { Fragment, type ReactNode } from "react"
import type { JawafAnswerSource } from "@/types/jawaf"

/**
 * Markdown-lite for Jawaf replies: paragraphs, "-" / "1." lists, **bold**, *italic* and [n] citations. Nothing else is
 * interpreted - a URL the model writes stays plain text, so a reply can never send a visitor somewhere. The only links
 * are the citations, and only to the bot's OWN source pages (http(s) URLs from its sources).
 */

function inline(text: string, sources: JawafAnswerSource[], key: string): ReactNode[] {
    const out: ReactNode[] = []
    const re = /\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*|\[(\d{1,2})\]/g
    let last = 0
    let i = 0
    for (const m of text.matchAll(re)) {
        if (m.index! > last) out.push(text.slice(last, m.index))
        const k = `${key}-${i++}`
        if (m[1]) out.push(<strong key={k} className="font-semibold">{m[1]}</strong>)
        else if (m[2]) out.push(<em key={k}>{m[2]}</em>)
        else if (m[3]) {
            const n = Number(m[3])
            const s = sources.find((x) => x.n === n)
            const chip = "mx-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-neutral-100 px-1 align-[0.1em] font-mono text-xs leading-none text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
            if (s?.url) {
                out.push(
                    <a key={k} href={s.url} target="_blank" rel="noopener noreferrer nofollow" title={s.title} className={`${chip} cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-700`}>
                        {n}
                    </a>,
                )
            } else if (s) {
                out.push(<span key={k} title={s.title} className={chip}>{n}</span>)
            }
            // A citation with no visible source (sources hidden) is dropped.
        }
        last = m.index! + m[0].length
    }
    if (last < text.length) out.push(text.slice(last))
    return out
}

export function AnswerText({ text, sources }: { text: string; sources: JawafAnswerSource[] }) {
    const blocks = text.replace(/\r/g, "").split(/\n{2,}/)
    return (
        <div className="flex min-w-0 flex-col gap-2 break-words text-sm leading-6">
            {blocks.map((block, bi) => {
                const lines = block.split("\n").map((l) => l.trimEnd()).filter((l) => l.trim())
                if (!lines.length) return null
                const bullet = lines.every((l) => /^\s*[-*•]\s+/.test(l))
                const numbered = lines.every((l) => /^\s*\d{1,2}[.)]\s+/.test(l))
                if (bullet || numbered) {
                    const Tag = numbered ? "ol" : "ul"
                    return (
                        <Tag key={bi} className={numbered ? "list-decimal pl-5" : "list-disc pl-5"}>
                            {lines.map((l, li) => (
                                <li key={li} className="mt-0.5">{inline(l.replace(/^\s*(?:[-*•]|\d{1,2}[.)])\s+/, ""), sources, `${bi}-${li}`)}</li>
                            ))}
                        </Tag>
                    )
                }
                return (
                    <p key={bi}>
                        {lines.map((l, li) => (
                            <Fragment key={li}>
                                {li ? <br /> : null}
                                {inline(l, sources, `${bi}-${li}`)}
                            </Fragment>
                        ))}
                    </p>
                )
            })}
        </div>
    )
}
