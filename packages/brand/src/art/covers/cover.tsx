import { Frames, Pixels, PixelSvg } from "../pixel/pixels"
import { DHAKA } from "../dhaka/pattern"
import { VALLEY } from "../valley/palette"
import { PixelVignette, vignetteAspect } from "../vignettes/vignette"
import { VIGNETTES, type VignetteId } from "../vignettes/scenes"
import { COVER_H, COVER_W, COVERS, type CoverOverlay, type CoverSceneId } from "./scenes"

/*
 * Paints a story cover (scenes.ts) - or, for any other id, one of the 96 x 60 vignettes (Docs desk, the pasal with a
 * letter, ...), so a post or a guide can name either. Server component: the motion is CSS only (art.css) and stops under
 * prefers-reduced-motion. Wrap it in `ArtRoot`.
 */

export type CoverId = CoverSceneId | VignetteId

export const COVER_IDS = [...(Object.keys(COVERS) as CoverSceneId[]), ...(Object.keys(VIGNETTES) as VignetteId[])] as const

export function isCoverId(id: string): id is CoverId {
    return id in COVERS || id in VIGNETTES
}

/** The weave's colours under the keys the Dhaka cover uses (classic cloth). */
const DHAKA_KEYS: Readonly<Record<string, string>> = {
    dhakaBg: DHAKA.classic.bg ?? "#f3ede4",
    dhakaC1: DHAKA.classic.c1 ?? "#1d1b1a",
    dhakaC2: DHAKA.classic.c2 ?? "#b5603f",
    dhakaC3: DHAKA.classic.c3 ?? "#d89a2c",
    dhakaC4: DHAKA.classic.c4 ?? "#3f4d86",
}

function Overlay({ o, palette }: { o: CoverOverlay; palette: Readonly<Record<string, string>> }) {
    switch (o.kind) {
        case "frames":
            return <Frames a={o.pair.a} b={o.pair.b} palette={palette} x={o.x} y={o.y} dur={o.dur} delay={o.delay ?? 0} kind={o.motion ?? "flip"} />
        case "layer":
            return <Pixels grid={o.grid} palette={palette} x={o.x} y={o.y} />
        case "bubble":
            return (
                <g transform={`translate(${o.x} ${o.y}) scale(0.5)`}>
                    <Pixels grid={o.b.text} palette={palette} />
                </g>
            )
        case "half":
            return (
                <g transform={`translate(${o.x} ${o.y}) scale(0.5)`}>
                    <Pixels grid={o.grid} palette={palette} />
                </g>
            )
        case "blink":
            return (
                <g transform={`translate(${o.x} ${o.y})${o.half ? " scale(0.5)" : ""}`}>
                    <Pixels grid={o.grid} palette={palette} className="art-blink" style={{ "--art-dur": `${o.dur}s`, "--art-delay": `${-(o.delay ?? 0)}s` }} />
                </g>
            )
    }
}

/** One cover by id, crisp at any size. `preserve` as in an SVG (default: fill the box, cropping the edges). */
export function PixelCover({ id, className, preserve }: { id: CoverId; className?: string; preserve?: string }) {
    if (!(id in COVERS)) return <PixelVignette id={id as VignetteId} className={className} preserve={preserve} />
    const c = COVERS[id as CoverSceneId]
    const palette = { ...VALLEY[c.variant], ...DHAKA_KEYS }
    return (
        <PixelSvg w={COVER_W} h={COVER_H} label={c.label} className={className} preserve={preserve}>
            <Pixels grid={c.grid} palette={palette} />
            {c.overlays.map((o, i) => (
                <Overlay key={i} o={o} palette={palette} />
            ))}
        </PixelSvg>
    )
}

/** The cover's size, for an `aspect-[w/h]` box. */
export function coverAspect(id: CoverId): string {
    return id in COVERS ? `${COVER_W} / ${COVER_H}` : vignetteAspect(id as VignetteId)
}

/** The cover's alt text (for an OG image or a card that names it). */
export function coverLabel(id: CoverId): string {
    return id in COVERS ? COVERS[id as CoverSceneId].label : VIGNETTES[id as VignetteId].label
}
