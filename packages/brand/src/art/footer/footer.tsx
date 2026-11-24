import { type ReactNode, useId } from "react"
import { SERIF_FAMILY } from "../../type"
import { svgId } from "../frame"
import { HERO_VALLEY } from "../valley/scene"
import { ValleyLayers } from "../valley/valley"

/*
 * F5 (owner pick): the footer's big "Boli" in Fraunces Soft (T1), filled with the P1 v3 day valley. The word is an SVG
 * <text> used as a clipPath, so the pixel scene shows through the letters; a hairline outline holds the shape where
 * the sky is pale. No bubbles inside the letters.
 */

const VB_W = 1200
const VB_H = 420

const WORD = {
    x: VB_W / 2,
    y: 392,
    textAnchor: "middle" as const,
    fontSize: 500,
    fontWeight: 420,
    letterSpacing: -14,
    style: { fontFamily: SERIF_FAMILY, fontVariationSettings: '"SOFT" 100, "WONK" 0, "opsz" 144' },
}

/** The day valley sized to the word's box, bottom-aligned so the range, the stupa and the people sit in the letters. */
function ValleyFill() {
    const { w, h } = HERO_VALLEY.layout
    return (
        <svg x={0} y={0} width={VB_W} height={VB_H} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges">
            <ValleyLayers valley={HERO_VALLEY} variant="day" bubbles={false} />
        </svg>
    )
}

/** F5: the serif "Boli" filled with the day valley. Scales to its container's width. */
export function ValleyWordmark() {
    const clip = svgId(useId(), "word")
    return (
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} role="img" aria-label="Boli" overflow="visible" className="block h-auto w-full">
            <defs>
                <clipPath id={clip}>
                    <text {...WORD}>Boli</text>
                </clipPath>
            </defs>
            <g clipPath={`url(#${clip})`}>
                <ValleyFill />
            </g>
            <text {...WORD} fill="none" stroke="rgba(20,20,20,0.22)" strokeWidth={1.25}>
                Boli
            </text>
        </svg>
    )
}

const COLUMNS = [
    { title: "Product", links: ["Kura", "API", "Pricing", "Models"] },
    { title: "Developers", links: ["Docs", "Quickstart", "Chat completions", "Status"] },
    { title: "Company", links: ["About", "Contact", "Terms", "Privacy"] },
] as const

/** The finished footer around the wordmark. `top` replaces the link columns (the landing wireframe passes its own). */
export function FooterF5({ top }: { top?: ReactNode }) {
    return (
        <div className="overflow-hidden bg-boli-ground text-boli-ink">
            {top ?? (
                <div className="grid gap-8 px-6 pt-10 sm:px-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
                    <div className="flex flex-col gap-2">
                        <p className="text-2xl" style={{ fontFamily: SERIF_FAMILY, fontVariationSettings: '"SOFT" 100, "opsz" 36' }}>
                            Boli
                        </p>
                        <p className="max-w-56 text-sm leading-6 text-boli-muted">Open AI for Nepal. Made in Kathmandu.</p>
                    </div>
                    {COLUMNS.map((col) => (
                        <div key={col.title} className="flex flex-col gap-2.5">
                            <p className="text-xs text-boli-muted">{col.title}</p>
                            {col.links.map((l) => (
                                <span key={l} className="text-sm text-boli-text">
                                    {l}
                                </span>
                            ))}
                        </div>
                    ))}
                </div>
            )}
            <div className="mx-6 mt-10 flex flex-wrap justify-between gap-2 border-t border-boli-line pt-4 text-xs text-boli-muted sm:mx-10">
                <span>2026 Boli. Open weights, run for you.</span>
                <span>English - नेपाली</span>
            </div>
            {/* The word runs off the bottom edge a little, like a signature on the last line. */}
            <div className="-mb-[3%] px-3 pt-4 sm:px-6">
                <ValleyWordmark />
            </div>
        </div>
    )
}
