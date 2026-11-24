import { Grid } from "../pixel/grid"
import { cord, paintHills, paintRange, paintSky, paintTerraces, type Peak } from "../pixel/scenery"
import { write } from "../valley/font"
import { type Bubble, bubble, DEVELOPER, flag, outlined, type Pair, stamp, STUDENT } from "../valley/kit"
import type { Motion } from "../valley/scene"

/*
 * The About / How-it-works story as four pixel scenes in the P1 v3 world: same palette, same people, same outlines and
 * perfect slopes, at 96 x 60. Pure data; `reveal.tsx` paints them outline first, then fills, row by row.
 *
 *  01 The gap - the student on one cliff asking in Romanized Nepali, a broken bridge, a model chip out of reach.
 *  02 Open models need running - a laptop overheating between two fans: "out of memory".
 *  03 Boli runs them for you - the Boli house in the valley, prayer flags, requests arriving as envelopes.
 *  04 Anyone builds on it - a pasal, a school, the student and the developer, each wired to the Boli house.
 */

export const STORY_W = 96
export const STORY_H = 60

/** Something animated that sits on top of the revealed scene. */
export type Overlay =
    | { kind: "frames"; pair: Pair; x: number; y: number; dur: number; motion?: Motion }
    | { kind: "bubble"; b: Bubble; x: number; y: number }
    | { kind: "blink"; grid: Grid; x: number; y: number; dur: number; delay: number; half?: boolean }
    | { kind: "mail"; grid: Grid; x: number; y: number; dx: number; dur: number; delay: number }
    | { kind: "pulse"; points: readonly { x: number; y: number; d: number }[] }

export type StoryScene = { grid: Grid; overlays: readonly Overlay[]; label: string }

function backdrop(g: Grid, skyTo: number, base: number, peaks: readonly Peak[]): void {
    paintSky(g, skyTo)
    const back: Peak[] = peaks.map(([x, y, l, r]) => [x + 12, y - 4, l, r] as const)
    paintRange(g, back, base, base - 7, { lit: "back", shade: "back", snow: "backSnow", snowShade: "backSnow" })
    paintRange(g, peaks, base, base - 5, { lit: "far", shade: "farShade", snow: "snow", snowShade: "snowShade" })
}

function feetY(pair: Pair, base: number): number {
    return base - pair.a.h + 2
}

function envelope(): Grid {
    const g = new Grid(7, 5)
    g.rect(0, 0, 7, 5, "envelope")
    g.set(1, 1, "line")
    g.set(2, 2, "line")
    g.set(3, 3, "line")
    g.set(4, 2, "line")
    g.set(5, 1, "line")
    return outlined(g, "line")
}

/** 01 - The gap. */
function gap(): StoryScene {
    const g = new Grid(STORY_W, STORY_H)
    backdrop(g, 44, 40, [
        [14, 18, 1, 1],
        [48, 12, 1, 1],
        [82, 16, 1, 1],
    ])
    paintHills(g, (x) => 36 + Math.round(1.5 * Math.sin(x / 13)), 42, { lit: "hill", shade: "hillShade", hi: "hillHi" }, [6, 40, 54, 88])

    // The gorge: a shaded far wall, the river at the bottom with regular glints.
    g.rect(0, 42, STORY_W, 18, "rockShade")
    for (let y = 54; y < STORY_H; y++) for (let x = 0; x < STORY_W; x++) g.set(x, y, (x + 3 * (y - 54)) % 9 === 0 ? "waterHi" : "water")

    // Two cliffs, faces stepping back as they fall (a perfect 1:2 slope).
    const cliffs = new Grid(STORY_W, STORY_H)
    for (let y = 40; y < STORY_H; y++) {
        const step = Math.floor((y - 40) / 2)
        for (let x = 0; x <= 28 - step; x++) cliffs.set(x, y, y < 42 ? "hill" : x > 25 - step ? "rock" : "rockShade")
        for (let x = 67 + step; x < STORY_W; x++) cliffs.set(x, y, y < 42 ? "hill" : x < 70 + step ? "rock" : "rockShade")
    }
    stamp(g, outlined(cliffs, "line"), -1, -1)

    // The bridge: two towers, cables that sag toward the middle and snap, deck planks that hang.
    const bridge = new Grid(STORY_W, STORY_H)
    for (const tx of [24, 70]) {
        bridge.rect(tx, 26, 2, 14, "wood")
        bridge.rect(tx, 26, 1, 14, "woodShade")
        bridge.rect(tx - 1, 26, 4, 1, "woodShade")
    }
    for (let i = 0; i <= 16; i++) {
        const ly = 27 + Math.floor(i / 2)
        bridge.set(26 + i, ly, "line")
        bridge.set(69 - i, ly, "line")
        if (i % 4 === 2 && i < 14) {
            for (let y = ly + 1; y < 40 + Math.floor(i / 4); y++) {
                bridge.set(26 + i, y, "string")
                bridge.set(69 - i, y, "string")
            }
        }
        if (i <= 13) {
            bridge.set(26 + i, 40 + Math.floor(i / 4), "wood")
            bridge.set(69 - i, 40 + Math.floor(i / 4), "wood")
        }
    }
    bridge.rect(39, 44, 1, 5, "wood")
    bridge.rect(56, 44, 1, 4, "wood")
    bridge.rect(42, 35, 1, 4, "line")
    bridge.rect(53, 35, 1, 5, "line")
    stamp(g, bridge, 0, 0)

    // The model, out of reach: a chip with pins.
    const chip = new Grid(14, 14)
    chip.rect(1, 1, 12, 12, "gpu")
    chip.rect(1, 1, 12, 1, "gpuHi")
    chip.rect(4, 4, 6, 6, "goldShade")
    chip.rect(5, 5, 4, 4, "gold")
    for (let i = 2; i < 13; i += 3) {
        chip.set(i, 0, "laptop")
        chip.set(i, 13, "laptop")
        chip.set(0, i, "laptop")
        chip.set(13, i, "laptop")
    }
    stamp(g, outlined(chip, "line"), 78, 25)

    return {
        grid: g,
        label: "The student on one cliff asking in Romanized Nepali, a broken suspension bridge, and a model chip out of reach on the other cliff",
        overlays: [
            { kind: "frames", pair: STUDENT, x: 4, y: feetY(STUDENT, 40), dur: 3.6, motion: "blink" },
            { kind: "bubble", b: bubble(["bujhchau?"], { side: "bottom", at: 12 }), x: 2, y: 4 },
            { kind: "bubble", b: bubble(["? ? ?"], { side: "bottom", at: 14 }), x: 74, y: 9 },
        ],
    }
}

/** 02 - Open models need running. */
function running(): StoryScene {
    const g = new Grid(STORY_W, STORY_H)
    g.rect(0, 0, STORY_W, 46, "wall")
    g.rect(0, 36, STORY_W, 10, "wallShade")
    g.rect(0, 36, STORY_W, 1, "pathShade")
    for (let y = 46; y < STORY_H; y++) {
        for (let x = 0; x < STORY_W; x++) {
            const r = y - 46
            g.set(x, y, r % 5 === 4 || (x + (Math.floor(r / 5) % 2) * 6) % 12 === 0 ? "pathShade" : r % 5 === 0 ? "pathHi" : "path")
        }
    }

    // A window onto the valley.
    const win = new Grid(24, 20)
    win.rect(0, 0, 24, 20, "wood")
    const view = new Grid(22, 18)
    paintSky(view, 18)
    paintRange(
        view,
        [
            [6, 5, 1, 1],
            [16, 3, 1, 1],
        ],
        18,
        8,
        { lit: "far", shade: "farShade", snow: "snow", snowShade: "snowShade" },
    )
    view.rect(0, 14, 22, 4, "hill")
    stamp(win, view, 1, 1)
    win.rect(11, 1, 1, 18, "wood")
    stamp(g, outlined(win, "line"), 4, 4)

    // The table, the laptop, two fans.
    const desk = new Grid(STORY_W, STORY_H)
    desk.rect(6, 41, 84, 1, "woodHi")
    desk.rect(6, 42, 84, 2, "wood")
    desk.rect(9, 44, 3, 14, "woodShade")
    desk.rect(84, 44, 3, 14, "woodShade")
    stamp(g, outlined(desk, "line"), -1, -1)

    const laptop = new Grid(40, 25)
    laptop.rect(3, 0, 34, 21, "laptopShade")
    laptop.rect(5, 2, 30, 17, "screen")
    laptop.rect(0, 21, 40, 4, "laptop")
    laptop.rect(0, 24, 40, 1, "laptopShade")
    laptop.rect(15, 22, 10, 1, "laptopShade")
    stamp(g, outlined(laptop, "line"), 28, 16)

    const fan = new Grid(13, 19)
    for (let y = 0; y < 13; y++) for (let x = 0; x < 13; x++) if ((x - 6) ** 2 + (y - 6) ** 2 <= 38) fan.set(x, y, (x - 6) ** 2 + (y - 6) ** 2 >= 26 ? "fanShade" : "fan")
    fan.rect(6, 13, 1, 4, "fanShade")
    fan.rect(3, 17, 7, 2, "fanShade")
    stamp(g, outlined(fan, "line"), 9, 22)
    stamp(g, outlined(fan, "line"), 74, 22)

    const blades = (cross: boolean) => {
        const b = new Grid(9, 9)
        if (cross) {
            b.rect(4, 0, 1, 9, "line")
            b.rect(0, 4, 9, 1, "line")
        } else {
            for (let i = 0; i < 9; i++) {
                b.set(i, i, "line")
                b.set(8 - i, i, "line")
            }
        }
        return b
    }
    const fanPair: Pair = { a: blades(true), b: blades(false) }

    // Heat rising off the laptop, in two frames: four columns that wiggle a pixel left and right.
    const heat = (shift: number) => {
        const h = new Grid(32, 10)
        for (const cx of [4, 12, 20, 28]) for (let y = 0; y < 10; y++) h.set(cx + ((Math.floor((y + shift) / 2) % 2) === 0 ? 0 : 1), y, "heat")
        return h
    }

    const screenText = new Grid(60, 34)
    write(screenText, 10, 5, "out of", "alert")
    write(screenText, 10, 17, "memory", "alert")

    return {
        grid: g,
        label: "A laptop overheating between two fans, its screen saying out of memory",
        overlays: [
            { kind: "frames", pair: fanPair, x: 12, y: 25, dur: 0.16 },
            { kind: "frames", pair: fanPair, x: 77, y: 25, dur: 0.16 },
            { kind: "frames", pair: { a: heat(0), b: heat(1) }, x: 32, y: 3, dur: 0.5 },
            { kind: "blink", grid: screenText, x: 34, y: 19, dur: 1.4, delay: 0, half: true },
        ],
    }
}

/** The Boli house: a Newari house with "boli" on its board and a server rack behind the open door. */
function boliHouse(w: number, h: number): { grid: Grid; door: { x: number; y: number }; peak: { x: number; y: number } } {
    const g = new Grid(w + 4, h)
    for (let r = 0; r < 5; r++) g.rect(4 - r, r, w - 4 + 2 * r, 1, r === 4 ? "roofShade" : "roof")
    g.rect(2, 5, w, h - 5, "brick")
    g.rect(2, 5, 2, h - 5, "brickShade")
    g.rect(2, 5, w, 1, "roofShade")
    for (let r = 7; r < h; r += 3) for (let c = 5 + (r % 2) * 2; c < w + 2; c += 4) g.set(c, r, "brickShade")
    const boardW = 20
    const bx = Math.floor((w + 4 - boardW) / 2)
    g.rect(bx, 7, boardW, 11, "woodShade")
    g.rect(bx, 7, boardW, 1, "wood")
    write(g, bx + 3, 8, "boli", "page")
    const dx = Math.floor((w + 4) / 2) - 5
    g.rect(dx, h - 11, 10, 11, "gpu")
    for (let r = h - 10; r < h; r += 2) g.rect(dx + 1, r, 8, 1, "gpuHi")
    return { grid: outlined(g, "line"), door: { x: dx + 1, y: h - 11 + 1 }, peak: { x: Math.floor((w + 4) / 2) + 1, y: 1 } }
}

function leds(): Grid {
    const g = new Grid(8, 10)
    for (let r = 0; r < 10; r += 2) {
        g.set(6, r, "led")
        if (r % 4 === 0) g.set(1, r, "ledAmber")
    }
    return g
}

/** 03 - Boli runs them for you. */
function runs(): StoryScene {
    const g = new Grid(STORY_W, STORY_H)
    backdrop(g, 40, 36, [
        [12, 14, 1, 1],
        [44, 9, 1, 1],
        [78, 13, 1, 1],
    ])
    paintHills(g, (x) => 30 + Math.round(1.5 * Math.sin(x / 11 + 1)), 42, { lit: "hill", shade: "hillShade", hi: "hillHi" }, [2, 10, 80, 88])
    paintTerraces(g, 38, 44)
    for (let y = 44; y < STORY_H; y++) {
        const r = y - 44
        for (let x = 0; x < STORY_W; x++) g.set(x, y, r % 5 === 4 || (x + (Math.floor(r / 5) % 2) * 6) % 12 === 0 ? "pathShade" : r % 5 === 0 ? "pathHi" : "path")
    }

    const house = boliHouse(32, 32)
    const hx = Math.floor((STORY_W - house.grid.w) / 2)
    const hy = 52 - house.grid.h
    const peak = { x: hx + house.peak.x, y: hy + house.peak.y }
    const flags = [...cord(g, peak.x - 8, peak.y + 1, 6, 28, 3, 3), ...cord(g, peak.x + 8, peak.y + 1, 89, 28, 3, 3)]
    for (const px of [6, 89]) {
        g.rect(px, 28, 1, 18, "woodShade")
        g.set(px, 27, "gold")
    }
    stamp(g, house.grid, hx, hy)
    const door = { x: hx + house.door.x, y: hy + house.door.y }
    const mail = envelope()

    return {
        grid: g,
        label: "The Boli house in the valley with prayer flags, a server rack behind its door, requests arriving as envelopes",
        overlays: [
            ...flags.map((f, i) => ({ kind: "frames" as const, pair: flag(f.key), x: f.x, y: f.y, dur: 1.1 + (i % 3) * 0.15 })),
            { kind: "blink", grid: leds(), x: door.x, y: door.y, dur: 0.9, delay: 0 },
            ...[0, 1, 2].map((i) => ({ kind: "mail" as const, grid: mail, x: -9, y: 48, dx: door.x + 1, dur: 4.5, delay: i * 1.5 })),
            ...[0, 1].map((i) => ({ kind: "mail" as const, grid: mail, x: STORY_W, y: 51, dx: door.x + 1 - STORY_W, dur: 5, delay: 0.7 + i * 2.5 })),
        ],
    }
}

/** A small pasal for the network scene. */
function miniStall(): Grid {
    const g = new Grid(20, 18)
    for (let c = 0; c < 20; c++) {
        g.set(c, 0, "awningEdge")
        g.rect(c, 1, 1, 2, c % 4 < 2 ? "awningA" : "awningB")
    }
    g.rect(1, 3, 18, 15, "woodShade")
    g.rect(0, 3, 1, 15, "wood")
    g.rect(19, 3, 1, 15, "wood")
    g.rect(1, 7, 18, 1, "wood")
    for (const [i, c] of [3, 7, 11, 15].entries()) g.rect(c, 4, 2, 3, ["jarA", "jarB", "jarC", "jarD"][i] ?? "jarA")
    g.rect(1, 11, 18, 7, "wood")
    g.rect(1, 11, 18, 1, "woodHi")
    return outlined(g, "line")
}

function school(): Grid {
    const g = new Grid(24, 19)
    for (let r = 0; r < 5; r++) g.rect(4 - r, r, 16 + 2 * r, 1, r === 4 ? "roofShade" : "roof")
    g.rect(1, 5, 22, 14, "school")
    g.rect(1, 5, 2, 14, "schoolShade")
    for (const c of [4, 16]) {
        g.rect(c, 8, 4, 4, "window")
        g.rect(c, 12, 4, 1, "woodShade")
    }
    g.rect(10, 12, 4, 7, "woodShade")
    g.rect(11, 6, 2, 4, "flagRed")
    g.set(11, 6, "flagBlue")
    return outlined(g, "line")
}

/** Points along an orthogonal wire, painted into `g`; returns them for the pulses (d = 0 at the far end). */
function wire(g: Grid, pts: readonly (readonly [number, number])[]): { x: number; y: number; d: number }[] {
    const out: { x: number; y: number; d: number }[] = []
    for (let i = 0; i + 1 < pts.length; i++) {
        const [x0, y0] = pts[i] ?? [0, 0]
        const [x1, y1] = pts[i + 1] ?? [0, 0]
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))
        for (let s = i === 0 ? 0 : 1; s <= n; s++) {
            const x = x0 + Math.sign(x1 - x0) * s
            const y = y0 + Math.sign(y1 - y0) * s
            g.set(x, y, "wire")
            out.push({ x, y, d: out.length })
        }
    }
    return out
}

/** 04 - Anyone builds on it. */
function builds(): StoryScene {
    const g = new Grid(STORY_W, STORY_H)
    backdrop(g, 20, 18, [
        [14, 5, 1, 1],
        [48, 2, 1, 1],
        [82, 4, 1, 1],
    ])
    paintTerraces(g, 16, STORY_H)

    const wires = new Grid(STORY_W, STORY_H)
    const paths = [
        wire(wires, [
            [23, 16],
            [30, 16],
            [30, 30],
            [37, 30],
        ]),
        wire(wires, [
            [27, 46],
            [30, 46],
            [30, 36],
            [37, 36],
        ]),
        wire(wires, [
            [72, 16],
            [66, 16],
            [66, 30],
            [60, 30],
        ]),
        wire(wires, [
            [72, 46],
            [66, 46],
            [66, 36],
            [60, 36],
        ]),
    ]
    stamp(g, wires, 0, 0)

    const house = boliHouse(18, 30)
    stamp(g, house.grid, 37, 19)
    stamp(g, miniStall(), 2, 6)
    stamp(g, school(), 2, 37)

    const pulses = paths.flatMap((p) => p.filter((_, i) => i % 2 === 0).map((pt) => ({ ...pt, d: pt.d / p.length })))
    return {
        grid: g,
        label: "A pasal, a school, the student and the developer, each wired to the Boli house",
        overlays: [
            { kind: "frames", pair: STUDENT, x: 74, y: feetY(STUDENT, 29), dur: 3.6, motion: "blink" },
            { kind: "frames", pair: DEVELOPER, x: 74, y: feetY(DEVELOPER, 58), dur: 0.5 },
            { kind: "blink", grid: leds(), x: 37 + house.door.x, y: 19 + house.door.y, dur: 0.9, delay: 0 },
            { kind: "pulse", points: pulses },
        ],
    }
}

export const STORY_SCENES: readonly StoryScene[] = [gap(), running(), runs(), builds()]
