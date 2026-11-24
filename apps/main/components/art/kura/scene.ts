import { Grid } from "../pixel/grid"
import { cord, paintCourtyard, paintHills, paintRange, paintSky, type Peak } from "../pixel/scenery"
import { type Bubble, bubble, ELDER, flag, type Pair, PIGEON, stamp, STUDENT, stupa } from "../valley/kit"

/*
 * K1 v2 - the scene above Kura's welcome. Kura means conversation, so it is one: the elder asks "k cha?", the student
 * answers, by the stupa with its flags. Same kit and palette as P1 v3; 112 x 48 so it sits above the title at about
 * 3x. Bubbles take turns (elder, student, elder, student).
 */

export const KURA_W = 112
export const KURA_H = 48

export type KuraScene = {
    land: Grid
    sky: Grid
    flags: { x: number; y: number; pair: Pair }[]
    people: { pair: Pair; x: number; y: number; kind: "flip" | "blink"; dur: number }[]
    pigeon: { x: number; y: number }
    turns: { b: Bubble; x: number; y: number }[]
}

function build(): KuraScene {
    const sky = new Grid(KURA_W, KURA_H)
    paintSky(sky, 32)
    const land = new Grid(KURA_W, KURA_H)
    const back: Peak[] = [
        [18, 6, 1, 1],
        [60, 3, 1, 1],
        [100, 5, 1, 1],
    ]
    const far: Peak[] = [
        [0, 14, 1, 1],
        [30, 9, 1, 1],
        [58, 13, 1, 1],
        [86, 8, 1, 1],
        [114, 12, 1, 1],
    ]
    paintRange(land, back, 30, 12, { lit: "back", shade: "back", snow: "backSnow", snowShade: "backSnow" })
    paintRange(land, far, 32, 16, { lit: "far", shade: "farShade", snow: "snow", snowShade: "snowShade" })
    paintHills(land, (x) => 27 + Math.round(1.5 * Math.sin(x / 17 + 1)), 34, { lit: "hill", shade: "hillShade", hi: "hillHi" }, [2, 10, 96, 104])
    paintCourtyard(land, 33, KURA_H)

    const st = stupa()
    const sx = 56 - st.cx
    const sy = 34 - st.grid.h + 2
    const fin = { x: sx + st.finial.x, y: sy + st.finial.y }
    const flags = [...cord(land, fin.x, fin.y + 1, 36, 24, 3, 3), ...cord(land, fin.x, fin.y + 1, 76, 24, 3, 3)]
    for (const px of [36, 76]) {
        land.rect(px, 24, 1, 10, "woodShade")
        land.set(px, 23, "gold")
    }
    stamp(land, st.grid, sx, sy)

    const base = 46
    const elder = { pair: ELDER, x: 22, y: base - ELDER.a.h + 2, kind: "flip" as const, dur: 0.7 }
    const student = { pair: STUDENT, x: 78, y: base - STUDENT.a.h + 2, kind: "blink" as const, dur: 3.8 }

    const ask = bubble(["k cha?"], { side: "bottom", at: 12 })
    const reply = bubble(["sanchai!"], { side: "bottom", at: 30 })
    const ask2 = bubble(["khana khayau?"], { side: "bottom", at: 12 })
    const reply2 = bubble(["khaye, tapai?"], { side: "bottom", at: 50 })
    return {
        land,
        sky,
        flags: flags.map((f) => ({ x: f.x, y: f.y, pair: flag(f.key) })),
        people: [elder, student],
        pigeon: { x: 52, y: 40 },
        turns: [
            { b: ask, x: 20, y: 9 },
            { b: reply, x: 70, y: 9 },
            { b: ask2, x: 20, y: 9 },
            { b: reply2, x: 62, y: 9 },
        ],
    }
}

export const KURA_SCENE = build()
export const KURA_PIGEON = PIGEON
