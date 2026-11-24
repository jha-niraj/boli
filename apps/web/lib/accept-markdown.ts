/**
 * Accept-header negotiation for the markdown copy of a post or guide (gurukulhq's lib/accept-markdown.ts, same rule).
 *
 * Serve markdown only when the client named it EXPLICITLY and weighted it at least as high as HTML. A wildcard never
 * counts: Chrome sends `text/html,...,*\/*;q=0.8`, and "is markdown acceptable at all" would match the `*\/*` and hand
 * every visitor a .md file. `text/x-markdown` is accepted too (older tools still send it). A tie goes to markdown: an
 * agent sending `Accept: text/markdown, text/html` named markdown first.
 */

type AcceptEntry = { type: string; q: number }

function parseAccept(header: string): AcceptEntry[] {
    return header
        .split(",")
        .map((part) => {
            const [rawType, ...params] = part.trim().split(";")
            const type = (rawType ?? "").trim().toLowerCase()
            if (!type) return null
            let q = 1
            for (const p of params) {
                const [k, v] = p.split("=")
                if (k?.trim().toLowerCase() === "q") {
                    const parsed = Number.parseFloat(v ?? "")
                    if (!Number.isNaN(parsed)) q = parsed
                }
            }
            return { type, q }
        })
        .filter((e): e is AcceptEntry => e !== null)
}

function explicitQ(entries: AcceptEntry[], type: string): number {
    return entries.filter((e) => e.type === type).reduce((best, e) => Math.max(best, e.q), 0)
}

export function prefersMarkdown(acceptHeader: string | null): boolean {
    if (!acceptHeader) return false
    const entries = parseAccept(acceptHeader)
    const markdownQ = Math.max(explicitQ(entries, "text/markdown"), explicitQ(entries, "text/x-markdown"))
    if (markdownQ <= 0) return false
    const htmlQ = Math.max(explicitQ(entries, "text/html"), explicitQ(entries, "application/xhtml+xml"))
    return markdownQ >= htmlQ
}
