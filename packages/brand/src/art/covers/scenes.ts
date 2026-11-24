import { Grid } from "../pixel/grid"
import { cord, disc, paintHills, paintRange, paintSky, paintTerraces, type Peak } from "../pixel/scenery"
import { DHAKA_TILES } from "../dhaka/pattern"
import { measure, write } from "../valley/font"
import { type Bubble, bubble, flag, outlined, type Pair, PIGEON, stamp, stupa } from "../valley/kit"
import type { ValleyVariant } from "../valley/palette"

/*
 * Covers (2026-11-24): one pixel scene per story on the public site's Blog (and the Dhaka cover for company news). Same
 * P1 v3 kit and palette as the valley, the story scenes and the vignettes - coloured outlines, perfect slopes, light
 * from the upper right. Every cover is 96 x 60 (16:10), so one drawing is crisp at a card and at a post's hero. Pure
 * data; `cover.tsx` paints them.
 *
 *  launch    - the valley at golden hour, a Newari house whose windows light up one by one ("Introducing Boli").
 *  keyboard  - a phone with a keyboard of Latin and Devanagari keys, a Romanized question and a reply ("How Nepal types").
 *  bill      - a government notice on a desk under a magnifier, the digits highlighted and checked ("Reading bills").
 *  dhaka     - a Dhaka topi over the hills, the weave in the cloth (company news).
 */

export const COVER_W = 96
export const COVER_H = 60

/** Something drawn over the static grid. `half` layers are drawn at half the world pixel (small text, bubbles). */
export type CoverOverlay =
    | { kind: "frames"; pair: Pair; x: number; y: number; dur: number; motion?: "flip" | "wave" | "blink"; delay?: number }
    | { kind: "bubble"; b: Bubble; x: number; y: number }
    | { kind: "blink"; grid: Grid; x: number; y: number; dur: number; delay?: number; half?: boolean }
    | { kind: "half"; grid: Grid; x: number; y: number }
    | { kind: "layer"; grid: Grid; x: number; y: number }

export type CoverScene = { grid: Grid; overlays: readonly CoverOverlay[]; label: string; variant: ValleyVariant }

/* ------------------------------------------------------------------------------------------------------------------ */
/* Small shared pieces                                                                                                */
/* ------------------------------------------------------------------------------------------------------------------ */

/** Plain wall with regular vertical seams. */
function room(g: Grid): void {
    g.rect(0, 0, g.w, g.h, "wall")
    for (let x = 0; x < g.w; x += 8) g.rect(x, 0, 1, g.h, "wallShade")
}

/** A desk top running the full width from `y` down: lit edge, wood, a shaded front. */
function deskTop(g: Grid, y: number): void {
    g.rect(0, y, g.w, 1, "woodHi")
    for (let r = y + 1; r < g.h; r++) {
        for (let x = 0; x < g.w; x++) g.set(x, r, r >= g.h - 3 ? "woodShade" : (x + (r - y) * 7) % 17 === 0 ? "woodShade" : "wood")
    }
}

/** Text at half the world pixel. */
function smallText(lines: readonly { text: string; key: string }[]): Grid {
    const w = Math.max(...lines.map((l) => measure(l.text))) + 2
    const g = new Grid(w, lines.length * 10 + 2)
    lines.forEach((l, i) => write(g, 0, i * 10, l.text, l.key))
    return g
}

/** A glass of chiya. */
function chiya(): Grid {
    const cup = new Grid(4, 5)
    cup.rect(0, 0, 4, 5, "tea")
    cup.rect(0, 1, 4, 3, "wood")
    cup.rect(0, 0, 4, 1, "teaShade")
    return outlined(cup, "line")
}

/** A window onto the valley, `w` x `h` including the frame. */
function valleyWindow(w: number, h: number): Grid {
    const win = new Grid(w, h)
    win.rect(0, 0, w, h, "wood")
    const view = new Grid(w - 2, h - 2)
    paintSky(view, h - 2)
    paintRange(
        view,
        [
            [Math.round(w * 0.3), Math.round(h * 0.3), 1, 1],
            [Math.round(w * 0.7), Math.round(h * 0.15), 1, 1],
        ],
        h - 2,
        Math.round(h * 0.55),
        { lit: "far", shade: "farShade", snow: "snow", snowShade: "snowShade" },
    )
    view.rect(0, h - 5, w - 2, 3, "hill")
    stamp(win, view, 1, 1)
    win.rect(Math.floor(w / 2), 1, 1, h - 2, "wood")
    return outlined(win, "line")
}

/*
 * Devanagari letters and digits, hand-set at half the world pixel (the bubble font is Latin only). Each sits under a
 * headline (shirorekha) where the letter has one. Approximations at 7 rows - read as Nepali at a glance, not as type.
 */
const DEVA: Readonly<Record<string, readonly string[]>> = {
    ka: ["#######", "...#...", ".#.###.", "#.##..#", ".#.#..#", "...#.#.", "...#..."],
    ma: ["#######", "#.#..#.", "#.#..#.", ".##..#.", "....##.", ".....#.", ".....#."],
    na: ["#######", "....#..", "###.#..", "..###..", "....#..", "....#..", "....#.."],
    ga: ["#######", ".#..#..", ".#..#..", ".#..#..", ".##.#..", "....#..", "....#.."],
    "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
    "0": [".....", ".###.", "#...#", "#...#", "#...#", ".###.", "....."],
    "8": ["..#..", ".#.#.", "#...#", "#...#", "#...#", "#...#", "....."],
    "3": ["###..", "...#.", ".##..", "...#.", "...#.", "###..", "....."],
}

/** One Devanagari glyph at half scale, painted with `key`. */
function deva(name: keyof typeof DEVA, key: string): Grid {
    const rows = DEVA[name] ?? []
    const g = new Grid(rows[0]?.length ?? 5, rows.length)
    rows.forEach((row, y) => [...row].forEach((ch, x) => (ch === "#" ? g.set(x, y, key) : undefined)))
    return g
}

/** A row of glyphs side by side, `gap` half-pixels apart. */
function devaRow(names: readonly (keyof typeof DEVA)[], key: string, gap = 2): Grid {
    const glyphs = names.map((n) => deva(n, key))
    const w = glyphs.reduce((s, g) => s + g.w + gap, -gap)
    const out = new Grid(Math.max(1, w), 7)
    let x = 0
    for (const g of glyphs) {
        stamp(out, g, x, 0)
        x += g.w + gap
    }
    return out
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* launch - the valley at golden hour, a house lighting up                                                            */
/* ------------------------------------------------------------------------------------------------------------------ */

/** A three-storey Newari house with carved windows; returns the window boxes (so the lights can sit on them). */
function boliHouse(): { grid: Grid; windows: { x: number; y: number }[] } {
    const W = 26
    const H = 30
    const g = new Grid(W, H)
    // Tiered roof with wide eaves.
    for (let r = 0; r < 5; r++) g.rect(5 - r, r, W - 10 + 2 * r, 1, r === 4 ? "roofShade" : "roof")
    for (let r = 0; r < 3; r++) g.rect(2 - Math.min(r, 2), 11 + r, W - 4 + 2 * Math.min(r, 2), 1, r === 2 ? "roofShade" : "roof")
    // Brick walls: the top storey, then the lower two under the second eave.
    for (let y = 5; y < 11; y++) for (let x = 3; x < W - 3; x++) g.set(x, y, x < 5 ? "brickShade" : (x + y) % 5 === 0 ? "brickShade" : "brick")
    for (let y = 14; y < H; y++) for (let x = 2; x < W - 2; x++) g.set(x, y, x < 4 ? "brickShade" : (x * 3 + y) % 7 === 0 ? "brickShade" : "brick")
    // Windows: a wooden frame round a dark pane, three across the middle storey, one up top, the door below.
    const windows: { x: number; y: number }[] = []
    const box = (x: number, y: number) => {
        g.rect(x, y, 5, 5, "wood")
        g.rect(x + 1, y + 1, 3, 3, "window")
        g.rect(x, y + 5, 5, 1, "woodShade")
        windows.push({ x: x + 1, y: y + 1 })
    }
    box(Math.floor(W / 2) - 2, 6)
    box(4, 16)
    box(Math.floor(W / 2) - 2, 16)
    box(W - 9, 16)
    g.rect(Math.floor(W / 2) - 2, H - 7, 4, 7, "woodShade")
    g.rect(Math.floor(W / 2) - 1, H - 6, 2, 6, "wood")
    return { grid: outlined(g, "midLine"), windows }
}

function launch(): CoverScene {
    const g = new Grid(COVER_W, COVER_H)
    paintSky(g, 40)
    disc(g, 76, 12, 5, "sunGlow")
    disc(g, 76, 12, 3, "sun")
    const back: Peak[] = [
        [18, 14, 1, 1],
        [52, 10, 1, 1],
        [90, 15, 1, 1],
    ]
    paintRange(g, back, 36, 20, { lit: "back", shade: "back", snow: "backSnow", snowShade: "backSnow" })
    paintRange(
        g,
        [
            [8, 22, 1, 1],
            [38, 18, 1, 1],
            [70, 21, 1, 1],
        ],
        40,
        27,
        { lit: "far", shade: "farShade", snow: "snow", snowShade: "snowShade" },
    )
    paintHills(g, (x) => 34 + Math.round(1.5 * Math.sin(x / 13)), 46, { lit: "hill", shade: "hillShade", hi: "hillHi" }, [4, 16, 82, 90])
    paintTerraces(g, 44, COVER_H)

    // The stupa far left, the house in the middle, prayer flags strung from the house to a pole on the right.
    const st = stupa()
    stamp(g, st.grid, 2, 46 - st.grid.h + 6)
    const house = boliHouse()
    const hx = 38
    const hy = COVER_H - house.grid.h - 3
    stamp(g, house.grid, hx, hy)
    g.rect(88, 22, 1, 24, "woodShade")
    g.set(88, 21, "gold")
    const flags = cord(g, hx + 24, hy + 3, 88, 23, 3, 3)

    // The lights: each window glows gold in turn and stays lit (blink: on most of the cycle, off for a beat).
    const lights = house.windows.map((w, i) => {
        const glow = new Grid(3, 3)
        glow.rect(0, 0, 3, 3, i === 0 ? "sun" : "gold")
        glow.set(1, 1, "sun")
        return { kind: "blink" as const, grid: glow, x: hx + 1 + w.x, y: hy + 1 + w.y, dur: 3.2, delay: i * 0.8 }
    })

    return {
        grid: g,
        variant: "gold",
        label: "Pixel illustration: the Kathmandu valley at golden hour, a Newari house whose windows light up one by one, prayer flags strung to a pole, a stupa on the left",
        overlays: [
            ...lights,
            ...flags.map((f, i) => ({ kind: "frames" as const, pair: flag(f.key), x: f.x, y: f.y, dur: 1.1 + (i % 3) * 0.15, delay: i * 0.17 })),
            { kind: "frames", pair: PIGEON, x: 26, y: COVER_H - 6, dur: 1.5 },
            { kind: "bubble", b: bubble(["namaste!"], { side: "bottom", at: 10 }), x: 44, y: 1 },
        ],
    }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* keyboard - a phone with Latin and Devanagari keys                                                                  */
/* ------------------------------------------------------------------------------------------------------------------ */

function keyboard(): CoverScene {
    const g = new Grid(COVER_W, COVER_H)
    room(g)
    stamp(g, valleyWindow(22, 16), 4, 4)
    deskTop(g, 50)
    stamp(g, chiya(), 12, 45)

    // The phone, upright on the desk: 36 x 46, the chat up top and the keyboard below.
    const PW = 36
    const PH = 46
    const px = 30
    const py = 4
    const ph = new Grid(PW, PH)
    ph.rect(0, 0, PW, PH, "phone")
    ph.rect(2, 3, PW - 4, PH - 6, "page")
    ph.rect(Math.floor(PW / 2) - 3, 1, 6, 1, "gpuHi")
    // Two chat lines: the question (right, sky) and the reply (left, white with a line).
    ph.rect(PW - 22, 6, 18, 6, "phoneScreen")
    ph.rect(4, 14, 18, 6, "bubble")
    ph.rect(4, 14, 18, 1, "bubbleShade")
    // The keyboard: three rows of keys on a sand ground.
    const ky = 23
    ph.rect(2, ky, PW - 4, PH - ky - 3, "laptop")
    const keyRow = (y: number, n: number, offset: number, face: string) => {
        for (let i = 0; i < n; i++) {
            const x = 3 + offset + i * 5
            ph.rect(x, y, 4, 4, face)
            ph.rect(x, y + 4, 4, 1, "laptopShade")
        }
    }
    keyRow(ky + 1, 6, 0, "page")
    keyRow(ky + 6, 6, 0, "page")
    keyRow(ky + 11, 5, 2, "page")
    // The space bar, with a small globe key that switches the script.
    ph.rect(8, PH - 7, 20, 2, "page")
    ph.rect(3, PH - 7, 4, 2, "phoneScreen")
    stamp(g, outlined(ph, "line"), px - 1, py - 1)

    // Letters on the keys, at half the pixel: Latin on the first row, Devanagari on the second.
    const keyX = (i: number) => px + 3 + i * 5
    const latin = ["k", "c", "h", "a", "x", "y"].map((ch, i) => ({
        kind: "half" as const,
        grid: smallText([{ text: ch, key: "bubbleInk" }]),
        x: keyX(i) + 1,
        y: py + ky + 0.5,
    }))
    const devanagari = (["ka", "ma", "na", "ga", "ka", "na"] as const).map((n, i) => ({
        kind: "half" as const,
        grid: deva(n, "bubbleInk"),
        x: keyX(i) + 0.5,
        y: py + ky + 6.25,
    }))
    const chatQ = smallText([{ text: "k cha?", key: "bubbleInk" }])
    const chatA = smallText([{ text: "thik cha!", key: "bubbleInk" }])

    return {
        grid: g,
        variant: "day",
        label: "Pixel illustration: a phone on a desk with a keyboard of Latin and Devanagari keys, a Romanized Nepali question on the screen and the reply in the same letters",
        overlays: [
            ...latin,
            ...devanagari,
            { kind: "half", grid: chatQ, x: px + PW - 21, y: py + 6 },
            { kind: "half", grid: chatA, x: px + 5, y: py + 14 },
            { kind: "bubble", b: bubble(["k cha", "khabar?"], { side: "left", at: 8 }), x: px + PW + 1, y: 6 },
            { kind: "bubble", b: bubble(["ramro!"], { side: "right", at: 6 }), x: 3, y: 24 },
        ],
    }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* bill - a notice under a magnifier                                                                                  */
/* ------------------------------------------------------------------------------------------------------------------ */

function bill(): CoverScene {
    const g = new Grid(COVER_W, COVER_H)
    room(g)
    deskTop(g, 20)

    // The notice: paper, a headline bar, lines of text, a table of digits, the seal and the signature.
    const PW = 46
    const PH = 38
    const paper = new Grid(PW, PH)
    paper.rect(0, 0, PW, PH, "paper")
    paper.rect(0, 0, 2, PH, "page")
    paper.rect(16, 3, 14, 2, "line")
    paper.rect(12, 6, 22, 1, "string")
    const lens = [30, 26, 34, 22, 30]
    lens.forEach((l, i) => paper.rect(5, 10 + i * 3, l, 1, "string"))
    // The table of amounts: three rows with a digit cell each.
    for (let r = 0; r < 3; r++) {
        paper.rect(5, 26 + r * 3, 22, 1, "string")
        paper.rect(30, 26 + r * 3, 10, 1, r === 1 ? "sticker" : "laptopShade")
    }
    paper.rect(34, 30, 5, 4, "flagRed")
    paper.rect(35, 31, 3, 1, "awningEdge")
    stamp(g, outlined(paper, "line"), 6, 14)

    // The magnifier over the date: a ring, the glass, a handle down to the right.
    const M = 26
    const mag = new Grid(M + 14, M + 14)
    disc(mag, 13, 13, 13, "laptopShade")
    disc(mag, 13, 13, 11, "lens")
    disc(mag, 9, 9, 3, "bubble")
    for (let i = 0; i < 12; i++) {
        mag.rect(23 + i, 23 + i, 3, 3, i < 2 ? "laptopShade" : "wood")
    }
    stamp(g, outlined(mag, "line"), 44, 2)

    // Inside the glass, the date in Nepali digits (२०८३) on a highlight, a tick beside the glass.
    const date = devaRow(["2", "0", "8", "3"], "line", 2)
    const tick = new Grid(7, 6)
    for (const [x, y] of [
        [0, 3],
        [1, 4],
        [2, 5],
        [3, 4],
        [4, 3],
        [5, 2],
        [6, 1],
    ] as const)
        tick.rect(x, y, 1, 1, "led")
    const highlight = new Grid(16, 5)
    highlight.rect(0, 0, 16, 5, "jarA")

    return {
        grid: g,
        variant: "day",
        label: "Pixel illustration: a printed government notice on a desk, a magnifier over its date showing the Nepali digits large, a green tick beside them, a red seal on the page",
        overlays: [
            { kind: "layer", grid: highlight, x: 51, y: 12 },
            { kind: "half", grid: date, x: 52.5, y: 12.75 },
            { kind: "blink", grid: outlined(tick, "line"), x: 69, y: 8, dur: 2.6 },
            { kind: "layer", grid: chiya(), x: 84, y: 48 },
        ],
    }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* dhaka - the topi over the hills (company news)                                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

/** The weave's own keys, renamed so they never meet a valley key in the shared palette (cover.tsx adds them). */
const DHAKA_KEY: Readonly<Record<string, string>> = { bg: "dhakaBg", c1: "dhakaC1", c2: "dhakaC2", c3: "dhakaC3", c4: "dhakaC4" }

function dhaka(): CoverScene {
    const g = new Grid(COVER_W, COVER_H)
    paintSky(g, 44)
    paintRange(
        g,
        [
            [14, 22, 1, 1],
            [48, 16, 1, 1],
            [84, 20, 1, 1],
        ],
        44,
        26,
        { lit: "far", shade: "farShade", snow: "snow", snowShade: "snowShade" },
    )
    paintHills(g, (x) => 42 + Math.round(1.5 * Math.sin(x / 11)), COVER_H, { lit: "hill", shade: "hillShade", hi: "hillHi" }, [6, 20, 74, 88])

    // The topi: taller at the front, the crown sloping back, filled with the weave thread by thread.
    const TW = 52
    const TH = 30
    const topi = new Grid(TW, TH)
    const tile = DHAKA_TILES.full
    for (let x = 0; x < TW; x++) {
        const top = Math.floor((x * 9) / TW)
        for (let y = top; y < TH; y++) {
            const k = tile.get(x % tile.w, (y - top) % tile.h)
            topi.set(x, y, k ? (DHAKA_KEY[k] ?? k) : "dhakaBg")
        }
    }
    // The band round the base: a dark stripe.
    topi.rect(0, TH - 3, TW, 3, "dhakaC1")
    stamp(g, outlined(topi, "line"), 22, 18)

    return {
        grid: g,
        variant: "day",
        label: "Pixel illustration: a Dhaka topi woven in its black, terracotta and gold pattern, resting over the green hills under the Himalaya",
        overlays: [
            { kind: "frames", pair: PIGEON, x: 8, y: COVER_H - 7, dur: 1.5 },
            { kind: "frames", pair: PIGEON, x: 84, y: COVER_H - 6, dur: 1.8, delay: 0.6 },
        ],
    }
}

/* ------------------------------------------------------------------------------------------------------------------ */

export const COVERS = {
    launch: launch(),
    keyboard: keyboard(),
    bill: bill(),
    dhaka: dhaka(),
} as const

export type CoverSceneId = keyof typeof COVERS
