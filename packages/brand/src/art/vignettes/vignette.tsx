import type { ArtStyle } from "../frame"
import { Frames, Pixels, PixelSvg } from "../pixel/pixels"
import { VALLEY, type ValleyVariant } from "../valley/palette"
import { VIGNETTES, type VignetteId, type VignetteOverlay } from "./scenes"

/*
 * Paints a round-4 vignette (scenes.ts). Server component: the motion is CSS only (art.css) and stops
 * under prefers-reduced-motion, where every scene shows a finished still. Wrap it in `ArtRoot`.
 */

function Overlay({ o, palette }: { o: VignetteOverlay; palette: Readonly<Record<string, string>> }) {
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
        case "mail": {
            // Drawn where it rests; travels from its start toward the target, phase set by `delay`.
            const f = (o.delay % o.dur) / o.dur
            const style: ArtStyle = {
                "--art-from": `${-o.dx * f}px`,
                "--art-to": `${o.dx * (1 - f)}px`,
                "--art-dur": `${o.dur}s`,
                "--art-delay": `${-f * o.dur}s`,
            }
            return (
                <g transform={`translate(${Math.round(o.x + o.dx * f)} ${o.y})`}>
                    <Pixels grid={o.grid} palette={palette} className="art-mail" style={style} />
                </g>
            )
        }
    }
}

/** One vignette by id, crisp at any size. `preserve` as in an SVG (default: fill the box, cropping the edges). */
export function PixelVignette({
    id,
    variant = "day",
    className,
    preserve,
}: {
    id: VignetteId
    variant?: ValleyVariant
    className?: string
    preserve?: string
}) {
    const v = VIGNETTES[id]
    const palette = VALLEY[variant]
    return (
        <PixelSvg w={v.w} h={v.h} label={v.label} className={className} preserve={preserve}>
            <Pixels grid={v.grid} palette={palette} />
            {v.overlays.map((o, i) => (
                <Overlay key={i} o={o} palette={palette} />
            ))}
        </PixelSvg>
    )
}

/** The size of a vignette, for an `aspect-[w/h]` box. */
export function vignetteAspect(id: VignetteId): string {
    const v = VIGNETTES[id]
    return `${v.w} / ${v.h}`
}
