import type { ArtStyle } from "../frame"
import { Frames, Pixels, PixelSvg } from "../pixel/pixels"
import { VALLEY, type ValleyVariant } from "../valley/palette"
import { KURA_BANNER, KURA_H, KURA_PIGEON, KURA_SCENE } from "./scene"

/*
 * K1 v2's pixel scene. Four turns in 16s (elder, student, elder, student); with motion off the first exchange shows.
 * `variant="gold"` is the dusk palette for Kura in dark mode. `wide` is the 200 x 48 banner crop (the /kura hero);
 * `preserve` as in an SVG.
 */
export function KuraScene({
    variant = "day",
    wide = false,
    className,
    preserve,
}: {
    variant?: ValleyVariant
    wide?: boolean
    className?: string
    preserve?: string
}) {
    const palette = VALLEY[variant]
    const s = wide ? KURA_BANNER : KURA_SCENE
    return (
        <PixelSvg w={s.w} h={KURA_H} className={className} preserve={preserve} label="Pixel illustration: an elder in a Dhaka topi asks a student 'k cha?' by the stupa, and she answers">
            <Pixels grid={s.sky} palette={palette} />
            <Pixels grid={s.land} palette={palette} />
            {s.flags.map((f, i) => (
                <Frames key={i} a={f.pair.a} b={f.pair.b} palette={palette} x={f.x} y={f.y} dur={1.1 + (i % 3) * 0.15} delay={i * 0.17} />
            ))}
            <Frames a={KURA_PIGEON.a} b={KURA_PIGEON.b} palette={palette} x={s.pigeon.x} y={s.pigeon.y} dur={1.5} />
            {s.people.map((p, i) => (
                <Frames key={i} a={p.pair.a} b={p.pair.b} palette={palette} x={p.x} y={p.y} dur={p.dur} kind={p.kind} />
            ))}
            {s.turns.map((t, i) => {
                const timing: ArtStyle = { "--art-dur": "16s", "--art-delay": `${i * 4}s` }
                return (
                    <g key={i} transform={`translate(${t.x} ${t.y}) scale(0.5)`}>
                        <g className={i > 1 ? "art-say2 art-say2-rest" : "art-say2"} style={timing}>
                            <g className="art-say2-text" style={timing}>
                                <Pixels grid={t.b.text} palette={palette} />
                            </g>
                            <g className="art-say2-dots" style={timing}>
                                <Pixels grid={t.b.frame} palette={palette} />
                                {[-5, 0, 5].map((dx, j) => (
                                    <rect
                                        key={dx}
                                        x={t.b.dots.x + dx}
                                        y={t.b.dots.y}
                                        width={3}
                                        height={3}
                                        fill={palette.bubbleInk}
                                        className="art-dot"
                                        style={{ "--art-delay": `${j * 0.3}s` } as ArtStyle}
                                    />
                                ))}
                            </g>
                        </g>
                    </g>
                )
            })}
        </PixelSvg>
    )
}
