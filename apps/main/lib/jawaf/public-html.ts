import "server-only"

/**
 * An ALLOWLIST sanitiser for owner rich text shown to anonymous visitors on /j/<slug> (custom sections, About, Hours).
 * Stricter than @repo/ui's sanitizeRichText (a strip-list): every tag not listed is dropped (its text kept, except for
 * script / style / iframe / object / svg / math / template, whose contents go too), every attribute is dropped except an
 * http(s) / mailto / tel `href` on <a>, which gets rel="nofollow noopener noreferrer" and target="_blank".
 */

const ALLOWED = new Set(["p", "br", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li", "h2", "h3", "h4", "blockquote", "a", "table", "thead", "tbody", "tr", "th", "td", "hr", "code"])
const DROP_WITH_CONTENT = /<(script|style|iframe|object|embed|svg|math|template|noscript|textarea|select|form)\b[\s\S]*?<\/\1\s*>/gi

function escapeAttr(v: string): string {
    return v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function decodeEntities(v: string): string {
    return v
        .replace(/&#(\d+);?/g, (_m, n: string) => String.fromCharCode(Number(n)))
        .replace(/&#x([0-9a-f]+);?/gi, (_m, n: string) => String.fromCharCode(parseInt(n, 16)))
        .replace(/&colon;/gi, ":")
        .replace(/&tab;|&newline;/gi, "")
        .replace(/&amp;/g, "&")
}

/** A safe href, or null. Decodes entities first so `jav&#x61;script:` cannot slip through. */
export function safeHref(raw: string): string | null {
    const v = decodeEntities(raw).replace(/[\u0000- \u007f]/g, "")
    if (/^(https?:|mailto:|tel:)/i.test(v)) {
        try {
            if (/^https?:/i.test(v)) new URL(v)
            return v
        } catch {
            return null
        }
    }
    return null
}

export function sanitizePublicHtml(html: string | null | undefined): string {
    if (!html) return ""
    let s = html.replace(/<!--[\s\S]*?-->/g, "").replace(DROP_WITH_CONTENT, "")
    s = s.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (whole, rawTag: string, attrs: string) => {
        const tag = rawTag.toLowerCase()
        if (!ALLOWED.has(tag)) return ""
        const closing = whole.startsWith("</")
        if (closing) return tag === "br" || tag === "hr" ? "" : `</${tag}>`
        if (tag === "a") {
            const m = /\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs)
            const href = m ? safeHref(m[2] ?? m[3] ?? m[4] ?? "") : null
            return href ? `<a href="${escapeAttr(href)}" rel="nofollow noopener noreferrer" target="_blank">` : "<a>"
        }
        return `<${tag}>`
    })
    // A stray "<" that did not form an allowed tag (e.g. "<img" cut off) must not open one.
    return s.replace(/<(?!\/?(?:p|br|strong|b|em|i|u|s|ul|ol|li|h2|h3|h4|blockquote|a|table|thead|tbody|tr|th|td|hr|code)\b)/gi, "&lt;").trim()
}

/** Rich text -> one plain line set (for "is it empty?"). */
export function htmlIsEmpty(html: string): boolean {
    return !html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim()
}
