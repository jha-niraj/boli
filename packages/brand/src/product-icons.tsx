import type { SVGProps } from "react"

/*
 * Boli's PRODUCT ICONS - one family for the product rail, the phone Products sheet and the Soon pages (owner,
 * 2026-11-25: the lucide picks for Kura and Jawaf read as ambiguous). Drawn to sit beside lucide's rail icons (bell,
 * feedback, coins): the same 24 grid, round caps and joins, currentColor, a 1.75 stroke so the slightly denser
 * drawings do not look heavier than lucide's 2. Each reads at 16-20px.
 *
 * - Kura: two overlapping speech bubbles - a conversation.
 * - API: curly braces with a cursor dot - code.
 * - Jawaf: a shopfront with a speech bubble at its corner - your business answers.
 * - Document AI: a page with a scan line across it.
 * - Speech: a waveform whose bars rise in the Boli mark's rhythm (a stressed crest, a lighter one) and end in its dot.
 *
 * Plain components (no hooks, no "use client"): server and client pages both render them.
 */

export type ProductIconProps = SVGProps<SVGSVGElement>

function Svg({ children, ...props }: ProductIconProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={24}
            height={24}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
            {...props}
        >
            {children}
        </svg>
    )
}

/** Home - a house with a rounded door: the overview of every product (main's rail, above Kura). */
export function HomeIcon(props: ProductIconProps) {
    return (
        <Svg {...props}>
            <path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19Z" />
            <path d="M9.5 20.5V15a2.5 2.5 0 0 1 5 0v5.5" />
        </Svg>
    )
}

/** Kura - two overlapping speech bubbles (the front one speaks down-left, the one behind down-right). */
export function KuraIcon(props: ProductIconProps) {
    return (
        <Svg {...props}>
            <path d="M6 8h6a3 3 0 0 1 3 3v3a3 3 0 0 1-3 3H9.5L6 20v-3a3 3 0 0 1-3-3v-3a3 3 0 0 1 3-3Z" />
            <path d="M9 8V6a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v3a3 3 0 0 1-3 3v2.5L15.5 12H15" />
        </Svg>
    )
}

/** API - curly braces with a cursor dot between them. */
export function ApiIcon(props: ProductIconProps) {
    return (
        <Svg {...props}>
            <path d="M8 4H7a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2 2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h1" />
            <path d="M16 4h1a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2 2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-1" />
            <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
        </Svg>
    )
}

/** Jawaf - a shopfront (awning over the walls) with a speech bubble at its corner: the shop answers. */
export function JawafIcon(props: ProductIconProps) {
    return (
        <Svg {...props}>
            <path d="M3 9.5 4.5 4h15L21 9.5" />
            <path d="M3 9.5a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
            <path d="M5 12.5V20h4.5" />
            <path d="M19 12.5V14" />
            <path d="M13 16.5h7a1.5 1.5 0 0 1 1.5 1.5v1.5a1.5 1.5 0 0 1-1.5 1.5h-3.5l-2.5 2v-2H13a1.5 1.5 0 0 1-1.5-1.5V18a1.5 1.5 0 0 1 1.5-1.5Z" />
        </Svg>
    )
}

/** Document AI - a page with a folded corner, a scan line running past both edges, and a line of text below it. */
export function DocumentAiIcon(props: ProductIconProps) {
    return (
        <Svg {...props}>
            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
            <path d="M14 3v5h5" />
            <path d="M3 13h18" />
            <path d="M9 17h6" />
        </Svg>
    )
}

/** Speech - waveform bars in the Boli mark's rhythm, ending in the mark's dot. */
export function SpeechIcon(props: ProductIconProps) {
    return (
        <Svg {...props}>
            <path d="M3 10.5v3" />
            <path d="M7 5v14" />
            <path d="M11 9v6" />
            <path d="M15 7v10" />
            <circle cx="19.5" cy="12" r="1.6" fill="currentColor" stroke="none" />
        </Svg>
    )
}
