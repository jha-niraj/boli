import { createHighlighterCore, type HighlighterCore } from "shiki/core"
import { createJavaScriptRegexEngine } from "shiki/engine/javascript"
import { BOLI_CODE_DARK, BOLI_CODE_LIGHT } from "./highlight-theme"

/**
 * Shiki, fine-grained and small (the Worker has a 64 MiB ceiling): `shiki/core` plus the JavaScript regex engine (no
 * WASM), only the grammars Boli's samples use, and Boli's own two themes. Works on the server (docs and landing
 * highlight there, so no highlighter ships to the browser) and in the browser (Kura's Code tab and Home load this
 * module lazily, on first open). One highlighter per runtime, created once and cached.
 *
 * Output is plain serialisable data - lines of `{ t, l, d }` (text, light colour, dark colour) - so a server component
 * can hand it to a client component as props, and the client renders spans with no innerHTML.
 */

export type CodeLang = "shellscript" | "python" | "typescript" | "javascript" | "go" | "json"

export type HlToken = { t: string; l?: string; d?: string }
export type HlLine = HlToken[]

let highlighter: Promise<HighlighterCore> | null = null

export function loadHighlighter(): Promise<HighlighterCore> {
    highlighter ??= createHighlighterCore({
        themes: [BOLI_CODE_LIGHT, BOLI_CODE_DARK],
        langs: [
            import("@shikijs/langs/shellscript"),
            import("@shikijs/langs/python"),
            import("@shikijs/langs/typescript"),
            import("@shikijs/langs/javascript"),
            import("@shikijs/langs/go"),
            import("@shikijs/langs/json"),
        ],
        // Forgiving: a pattern the JS engine cannot compile is skipped (that token stays plain) instead of throwing.
        engine: createJavaScriptRegexEngine({ forgiving: true }),
    }).catch((e: unknown) => {
        highlighter = null
        throw e
    })
    return highlighter
}

function plain(color: string | undefined, theme: typeof BOLI_CODE_LIGHT): string | undefined {
    const fg = theme.colors?.["editor.foreground"]
    return color && fg && color.toLowerCase() === fg.toLowerCase() ? undefined : color
}

/** Synchronous once the highlighter is loaded - Kura re-highlights on every settings change without a flash. */
export function tokenize(hl: HighlighterCore, code: string, lang: CodeLang): HlLine[] {
    const lines = hl.codeToTokensWithThemes(code, { lang, themes: { light: BOLI_CODE_LIGHT.name ?? "boli-light", dark: BOLI_CODE_DARK.name ?? "boli-dark" } })
    return lines.map((line) => {
        const out: HlLine = []
        for (const tok of line) {
            // The default ink is left off (the block's own text colour draws it): most tokens carry no colour at all.
            const l = plain(tok.variants.light?.color, BOLI_CODE_LIGHT)
            const d = plain(tok.variants.dark?.color, BOLI_CODE_DARK)
            const prev = out[out.length - 1]
            // Merge neighbours of the same colour: fewer spans, smaller props.
            if (prev && prev.l === l && prev.d === d) prev.t += tok.content
            else out.push({ t: tok.content, ...(l ? { l } : {}), ...(d ? { d } : {}) })
        }
        return out
    })
}

/** Highlight one snippet; null when anything fails, so the caller shows plain text rather than breaking a page. */
export async function highlight(code: string, lang: CodeLang): Promise<HlLine[] | null> {
    try {
        return tokenize(await loadHighlighter(), code, lang)
    } catch (e) {
        console.error("[highlight] failed", e instanceof Error ? e.message : e)
        return null
    }
}
