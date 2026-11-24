import { Grid } from "../pixel/grid"
import { cord, paintCourtyard, paintHills, paintRange, paintSky, type Peak } from "../pixel/scenery"
import { type Bubble, bubble, ELDER, flag, house, type Pair, pagoda, PIGEON, stamp, STUDENT, stupa } from "../valley/kit"

/*
 * K1 v2 - the scene above Kura's welcome. Kura means conversation, so it is one: the elder asks "k cha?", the student
 * answers, by the stupa with its flags. Same kit and palette as P1 v3; 112 x 48 so it sits above the title at about
 * 3x. Bubbles take turns (elder, student, elder, student).
 */

export const KURA_W = 112
export const KURA_H = 48

export type KuraScene = {
    /** Width in world pixels (the height is always KURA_H). */
    w: number
    land: Grid
    sky: Grid
    flags: { x: number; y: number; pair: Pair }[]
    people: { pair: Pair; x: number; y: number; kind: "flip" | "blink"; dur: number }[]
    pigeon: { x: number; y: number }
    turns: { b: Bubble; x: number; y: number }[]
}

/** Peaks repeated one scene-width apart and shifted by `dx`, so a wider crop keeps the same ridge rhythm. */
function tile(peaks: readonly Peak[], dx: number, wide: boolean): Peak[] {
    const shifts = wide ? [-KURA_W, 0, KURA_W] : [0]
    return shifts.flatMap((k) => peaks.map(([x, y, l, r]) => [x + dx + k, y, l, r] as const))
}

/**
 * `w` = KURA_W is the original K1 v2 scene, pixel for pixel. A wider `w` (the /kura hero banner, owner 2026-11-25)
 * keeps the stupa, the two people and their bubbles in the middle and opens the valley out on both sides, with a
 * house on the left hill and a pagoda on the right.
 */
function build(w: number = KURA_W): KuraScene {
    const wide = w > KURA_W
    const dx = Math.round((w - KURA_W) / 2)
    const sky = new Grid(w, KURA_H)
    paintSky(sky, 32)
    const land = new Grid(w, KURA_H)
    const back: Peak[] = tile(
        [
            [18, 6, 1, 1],
            [60, 3, 1, 1],
            [100, 5, 1, 1],
        ],
        dx,
        wide,
    )
    const far: Peak[] = tile(
        [
            [0, 14, 1, 1],
            [30, 9, 1, 1],
            [58, 13, 1, 1],
            [86, 8, 1, 1],
            [114, 12, 1, 1],
        ],
        dx,
        wide,
    )
    paintRange(land, back, 30, 12, { lit: "back", shade: "back", snow: "backSnow", snowShade: "backSnow" })
    paintRange(land, far, 32, 16, { lit: "far", shade: "farShade", snow: "snow", snowShade: "snowShade" })
    const trees = [2, 10, 96, 104].map((x) => x + dx)
    if (wide) trees.push(8, 16, w - 30, w - 10)
    paintHills(land, (x) => 27 + Math.round(1.5 * Math.sin((x - dx) / 17 + 1)), 34, { lit: "hill", shade: "hillShade", hi: "hillHi" }, trees)
    if (wide) {
        const home = house(16, 10)
        stamp(land, home.grid, 26, 34 - home.grid.h + 1)
        const pg = pagoda()
        stamp(land, pg.grid, w - 46, 34 - pg.grid.h + 1)
    }
    paintCourtyard(land, 33, KURA_H)

    const st = stupa()
    const sx = 56 + dx - st.cx
    const sy = 34 - st.grid.h + 2
    const fin = { x: sx + st.finial.x, y: sy + st.finial.y }
    const flags = [...cord(land, fin.x, fin.y + 1, 36 + dx, 24, 3, 3), ...cord(land, fin.x, fin.y + 1, 76 + dx, 24, 3, 3)]
    for (const px of [36 + dx, 76 + dx]) {
        land.rect(px, 24, 1, 10, "woodShade")
        land.set(px, 23, "gold")
    }
    stamp(land, st.grid, sx, sy)

    const base = 46
    const elder = { pair: ELDER, x: 22 + dx, y: base - ELDER.a.h + 2, kind: "flip" as const, dur: 0.7 }
    const student = { pair: STUDENT, x: 78 + dx, y: base - STUDENT.a.h + 2, kind: "blink" as const, dur: 3.8 }

    const ask = bubble(["k cha?"], { side: "bottom", at: 12 })
    const reply = bubble(["sanchai!"], { side: "bottom", at: 30 })
    const ask2 = bubble(["khana khayau?"], { side: "bottom", at: 12 })
    const reply2 = bubble(["khaye, tapai?"], { side: "bottom", at: 50 })
    return {
        w,
        land,
        sky,
        flags: flags.map((f) => ({ x: f.x, y: f.y, pair: flag(f.key) })),
        people: [elder, student],
        pigeon: { x: 52 + dx, y: 40 },
        turns: [
            { b: ask, x: 20 + dx, y: 9 },
            { b: reply, x: 70 + dx, y: 9 },
            { b: ask2, x: 20 + dx, y: 9 },
            { b: reply2, x: 62 + dx, y: 9 },
        ],
    }
}

export const KURA_SCENE = build()
/** The /kura hero banner: the same conversation, the valley opened out (200 x 48). */
export const KURA_BANNER_W = 200
export const KURA_BANNER = build(KURA_BANNER_W)
export const KURA_PIGEON = PIGEON
