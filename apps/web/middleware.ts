import { NextResponse, type NextRequest } from "next/server"
import { MARKDOWN_PAGES } from "@/content/generated/markdown-pages"
import { prefersMarkdown } from "@/lib/accept-markdown"

/**
 * Markdown for agents (gurukulhq's middleware.ts, cut down to what this site needs). The ONLY thing this file does: a
 * request for a published post or guide that explicitly asks for `Accept: text/markdown` is redirected to its prebuilt
 * copy under /md/ (scripts/build-content.ts writes public/md/** and content/generated/markdown-pages.ts). Every other
 * request, and every other path, passes through untouched. Nothing here reads a cookie or a session.
 *
 * - `middleware.ts`, NOT `proxy.ts`: in Next 16 a `proxy.ts` is forced onto the Node.js runtime, and OpenNext on
 *   Cloudflare rejects Node middleware ("Node.js middleware is not currently supported"). This file, with no runtime
 *   export, is EDGE middleware - what OpenNext accepts. Do not rename it.
 * - REDIRECT, not rewrite: /md/*.md are static assets served by Cloudflare's asset layer BEFORE the Worker; a rewrite
 *   from inside the Worker cannot reach them, and gurukulhq measured it serving HTML under a text/markdown type.
 * - No fetch of our own pages: a Worker cannot fetch its own hostname (522 on the custom domain, 404 on workers.dev).
 * - The 307 is `private, no-store` with `Vary: Accept`: two representations live at one URL, and a cached redirect
 *   served to a browser would bounce people to a .md file. The asset's own Content-Type comes from public/_headers.
 * - A path with no prebuilt file (a draft, the topic hubs, the feed) falls through as HTML - never faked.
 */
export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl
    const key = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname
    const page = MARKDOWN_PAGES[key]
    if (!page) return NextResponse.next()

    if (prefersMarkdown(request.headers.get("accept"))) {
        const url = request.nextUrl.clone()
        url.pathname = page.file
        url.search = ""
        const res = NextResponse.redirect(url, 307)
        res.headers.set("Vary", "Accept")
        res.headers.set("Cache-Control", "private, no-store")
        res.headers.set("x-markdown-tokens", String(page.tokens))
        return res
    }
    const res = NextResponse.next()
    // The HTML of a page that also has a markdown copy varies by Accept (append: Next adds its own Vary later).
    res.headers.append("Vary", "Accept")
    return res
}

export const config = {
    // Posts and guides only (one segment under each). The rest of the site never runs this function.
    matcher: ["/blog/:slug", "/guides/:slug"],
}
