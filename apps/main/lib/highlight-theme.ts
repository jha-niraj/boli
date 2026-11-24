import type { ThemeRegistration } from "shiki/core"

/**
 * Boli's two code themes for Shiki: neutral ink for names, a quieter grey for syntax and comments, and ONE soft accent
 * (the deep blue from app/boli.css) for values - strings, numbers, flags. No rainbow. The hex values mirror the boli
 * tokens because a TextMate theme cannot read CSS variables.
 */

type Palette = { fg: string; bg: string; syntax: string; punctuation: string; comment: string; value: string }

const LIGHT: Palette = { fg: "#1d1b19", bg: "#faf8f6", syntax: "#6b6560", punctuation: "#8a837c", comment: "#9a938c", value: "#1f3f8f" }
const DARK: Palette = { fg: "#e6e3df", bg: "#0a0a0a", syntax: "#a39d96", punctuation: "#857f78", comment: "#716c66", value: "#a9c0ee" }

function theme(name: string, type: "light" | "dark", p: Palette): ThemeRegistration {
    return {
        name,
        type,
        colors: { "editor.foreground": p.fg, "editor.background": p.bg },
        settings: [
            { settings: { foreground: p.fg, background: p.bg } },
            { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: p.comment } },
            {
                scope: ["keyword", "storage", "storage.type", "storage.modifier", "keyword.operator", "keyword.control", "variable.language", "support.type.builtin"],
                settings: { foreground: p.syntax },
            },
            {
                scope: ["punctuation", "meta.brace", "punctuation.separator", "punctuation.terminator", "punctuation.accessor", "meta.delimiter"],
                settings: { foreground: p.punctuation },
            },
            {
                scope: [
                    "string",
                    "string.quoted",
                    "punctuation.definition.string",
                    "constant.numeric",
                    "constant.language",
                    "constant.character.escape",
                    "constant.other.option",
                    "support.constant.property-value",
                ],
                settings: { foreground: p.value },
            },
            {
                scope: ["entity.name.function", "support.function", "entity.name.type", "support.type.property-name", "variable", "variable.other", "meta.object-literal.key"],
                settings: { foreground: p.fg },
            },
        ],
    }
}

export const BOLI_CODE_LIGHT = theme("boli-light", "light", LIGHT)
export const BOLI_CODE_DARK = theme("boli-dark", "dark", DARK)
