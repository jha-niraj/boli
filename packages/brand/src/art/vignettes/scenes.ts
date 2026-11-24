import { Grid, spriteGrid } from "../pixel/grid"
import { cord, disc, paintCourtyard, paintHills, paintRange, paintSky, type Peak } from "../pixel/scenery"
import { measure, write } from "../valley/font"
import { type Bubble, bubble, CHAR3, counter, DEVELOPER, ELDER, flag, outlined, type Pair, pagoda, PIGEON, SHOPKEEPER, stallBack, stamp, STUDENT, swap } from "../valley/kit"

/*
 * Vignettes (round 4, 2026-11-24): small pixel scenes for the public page heroes, the "Who it's for" portraits and the
 * About chapters. Same P1 v3 kit and palette as the valley and the story scenes - the same people, coloured outlines,
 * perfect slopes, light from the upper right. Pure data; `vignette.tsx` paints them.
 *
 *  Who it's for (64 x 48): developer at a desk with a terminal, student with books by the school, two founders at a
 *  whiteboard, the shopkeeper at the pasal with a phone.
 *  Heroes (96 x 60): the developer's desk (Docs), the pasal with a letter and a postbox (Contact), the elder with a
 *  scroll (Terms, Privacy).
 *  About (96 x 60): the scorecard (what we found) and the test bench (how we decided).
 */

/** Something drawn over the static grid. `half` layers are drawn at half the world pixel (small text, bubbles). */
export type VignetteOverlay =
    | { kind: "frames"; pair: Pair; x: number; y: number; dur: number; motion?: "flip" | "wave" | "blink"; delay?: number }
    | { kind: "bubble"; b: Bubble; x: number; y: number }
    | { kind: "blink"; grid: Grid; x: number; y: number; dur: number; delay?: number; half?: boolean }
    | { kind: "half"; grid: Grid; x: number; y: number }
    | { kind: "layer"; grid: Grid; x: number; y: number }
    | { kind: "mail"; grid: Grid; x: number; y: number; dx: number; dur: number; delay: number }

export type Vignette = { w: number; h: number; grid: Grid; overlays: readonly VignetteOverlay[]; label: string }

/* ------------------------------------------------------------------------------------------------------------------ */
/* People new in round 4                                                                                              */
/* ------------------------------------------------------------------------------------------------------------------ */

/** A founder standing: short hair, a teal shirt, navy trousers. Frame B blinks. */
const FOUNDER_ROWS = [
    "...kkkkkK...",
    "..kkkkkkkK..",
    ".kkkkkkkkkK.",
    ".kksssssshk.",
    ".kssesseshk.",
    ".kssesseshk.",
    "..srssssrs..",
    "..sssmmsss..",
    "...Sssssh...",
    "....SssS....",
    ".ttttttttu..",
    "tttttttttuu.",
    "Ttttttttttu.",
    "TTttttttttu.",
    "sTttttttttus",
    ".TTtttttttu.",
    "..NnnnnnnN..",
    "..Nnnn.nnN..",
    "..Nnn..nnN..",
    "..Nnn..nnN..",
    "..Nnn..nnN..",
    "..fff..fff..",
]

const BLINK_ROWS = { 4: ".kssssssshk.", 5: ".kssssssshk." }

/** Swaps materials in sprite rows (a second founder in a marigold hoodie, with the deeper skin). */
function recolour(rows: readonly string[], map: Readonly<Record<string, string>>): string[] {
    return rows.map((r) => [...r].map((ch) => map[ch] ?? ch).join(""))
}

const FOUNDER_A: Pair = {
    a: outlined(spriteGrid(FOUNDER_ROWS, CHAR3)),
    b: outlined(spriteGrid(swap(FOUNDER_ROWS, BLINK_ROWS), CHAR3)),
}

const HOODIE = { t: "o", T: "O", u: "y", s: "a", S: "A", h: "H" } as const
/** The second founder points at the board: frame B raises the near arm. */
const FOUNDER_B_ROWS = recolour(FOUNDER_ROWS, HOODIE)
const FOUNDER_B: Pair = {
    a: outlined(spriteGrid(FOUNDER_B_ROWS, CHAR3)),
    b: outlined(
        spriteGrid(
            swap(FOUNDER_B_ROWS, {
                10: "aoooooooooy.",
                11: "ooooooooooyy",
                12: "Ooooooooooy.",
                14: ".Ooooooooooa",
            }),
            CHAR3,
        ),
    ),
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* Props                                                                                                              */
/* ------------------------------------------------------------------------------------------------------------------ */

function feetY(pair: Pair, base: number): number {
    return base - pair.a.h + 2
}

/** Plain wall with regular vertical seams. */
function room(g: Grid, wall = "wall", seam = "wallShade"): void {
    g.rect(0, 0, g.w, g.h, wall)
    for (let x = 0; x < g.w; x += 8) g.rect(x, 0, 1, g.h, seam)
}

/** Floor planks from `y` down. */
function planks(g: Grid, y: number): void {
    for (let r = y; r < g.h; r++) {
        for (let x = 0; x < g.w; x++) g.set(x, r, r === y ? "woodHi" : (x + (r - y) * 5) % 14 === 0 ? "woodShade" : "wood")
    }
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

/** Outdoor backdrop: sky, two ranges, hills, then a stone courtyard from `court` down. */
function outdoors(g: Grid, court: number, peaks: readonly Peak[]): void {
    paintSky(g, court)
    const back: Peak[] = peaks.map(([x, y, l, r]) => [x + 11, y - 5, l, r] as const)
    paintRange(g, back, court - 6, court - 18, { lit: "back", shade: "back", snow: "backSnow", snowShade: "backSnow" })
    paintRange(g, peaks, court - 4, court - 15, { lit: "far", shade: "farShade", snow: "snow", snowShade: "snowShade" })
    paintHills(g, (x) => court - 8 + Math.round(1.5 * Math.sin(x / 11 + 1)), court + 1, { lit: "hill", shade: "hillShade", hi: "hillHi" }, null)
    paintCourtyard(g, court, g.h)
}

/** A monitor with a terminal on it: dark screen, prompt marks and code bars. Returns the grid and the screen box. */
function terminal(w: number, h: number): { grid: Grid; screen: { x: number; y: number; w: number; h: number } } {
    const g = new Grid(w, h + 5)
    g.rect(0, 0, w, h, "laptopShade")
    g.rect(1, 1, w - 2, h - 2, "screen")
    // Title bar with the three dots.
    g.rect(1, 1, w - 2, 2, "gpuHi")
    g.set(3, 2, "flagRed")
    g.set(5, 2, "gold")
    g.set(7, 2, "led")
    // Stand and foot.
    const sx = Math.floor(w / 2) - 2
    g.rect(sx, h, 4, 3, "laptop")
    g.rect(sx - 4, h + 3, 12, 2, "laptopShade")
    return { grid: outlined(g, "line"), screen: { x: 2, y: 4, w: w - 4, h: h - 5 } }
}

/** Code-like bars for a screen, starting at (x, y), one every two rows. */
function codeBars(g: Grid, x: number, y: number, w: number, rows: number): void {
    const widths = [0.55, 0.8, 0.4, 0.7, 0.5, 0.65, 0.35]
    const keys = ["sticker", "screenText", "gold", "screenText", "sticker", "screenText", "gold"]
    for (let i = 0; i < rows; i++) {
        const k = keys[i % keys.length] ?? "screenText"
        g.set(x, y + i * 2, "screenText")
        g.rect(x + 2, y + i * 2, Math.max(2, Math.round((w - 3) * (widths[i % widths.length] ?? 0.5))), 1, k)
    }
}

/** Text at half the world pixel, for screens and signs. */
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

/** A potted plant (marigold): green leaves, gold flowers, a clay pot. */
function plant(): Grid {
    const g = new Grid(8, 11)
    g.rect(2, 0, 4, 2, "leaf")
    g.rect(1, 2, 6, 3, "leaf")
    g.rect(5, 1, 2, 3, "leafHi")
    g.set(2, 1, "gold")
    g.set(5, 3, "gold")
    g.set(3, 4, "hoodie")
    g.rect(3, 5, 2, 1, "leafShade")
    g.rect(1, 6, 6, 1, "brickShade")
    g.rect(1, 7, 6, 4, "brick")
    g.rect(1, 7, 2, 4, "brickShade")
    return outlined(g, "line")
}

/** A stack of three school books. */
function books(): Grid {
    const g = new Grid(12, 9)
    const layers: readonly [number, number, string][] = [
        [0, 12, "navy"],
        [1, 10, "book"],
        [0, 11, "teal"],
    ]
    layers.forEach(([x, w, key], i) => {
        const y = 6 - i * 3
        g.rect(x, y, w, 3, key)
        g.rect(x + w - 2, y + 1, 2, 1, "page")
    })
    return outlined(g, "line")
}

/** The school from the story scenes: hipped roof, cream walls, two windows, the flag. */
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
    return outlined(g, "line")
}

/** A phone held up, screen lit. */
function phone(): Grid {
    const g = new Grid(4, 6)
    g.rect(0, 0, 4, 6, "phone")
    g.rect(1, 1, 2, 3, "phoneScreen")
    return outlined(g, "line")
}

/** An envelope. */
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

/** A red postbox on a post, with a slot and a gold band. */
function postbox(): Grid {
    const g = new Grid(10, 24)
    g.rect(1, 0, 8, 2, "awningEdge")
    g.rect(0, 2, 10, 12, "flagRed")
    g.rect(0, 2, 2, 12, "awningEdge")
    g.rect(2, 5, 6, 1, "line")
    g.rect(0, 9, 10, 1, "gold")
    g.rect(4, 14, 2, 10, "woodShade")
    g.rect(2, 22, 6, 2, "woodShade")
    return outlined(g, "line")
}

/** A model chip with pins (as in the story's first scene). */
function chip(core = "gold"): Grid {
    const g = new Grid(14, 14)
    g.rect(1, 1, 12, 12, "gpu")
    g.rect(1, 1, 12, 1, "gpuHi")
    g.rect(4, 4, 6, 6, core === "gold" ? "goldShade" : "gpuShade")
    g.rect(5, 5, 4, 4, core)
    for (let i = 2; i < 13; i += 3) {
        g.set(i, 0, "laptop")
        g.set(i, 13, "laptop")
        g.set(0, i, "laptop")
        g.set(13, i, "laptop")
    }
    return outlined(g, "line")
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* The developer's desk (Docs hero, and the first "Who it's for" portrait)                                            */
/* ------------------------------------------------------------------------------------------------------------------ */

function developerDesk(W: number, H: number): Vignette {
    const g = new Grid(W, H)
    room(g)
    const deskY = H - 12
    planks(g, H - 4)
    // Window behind, over the developer's shoulder.
    const winW = W >= 90 ? 22 : 18
    stamp(g, valleyWindow(winW, 14), 2, 2)

    // The desk runs right from the developer's own table piece.
    const desk = new Grid(W, 8)
    desk.rect(0, 0, W, 1, "woodHi")
    desk.rect(0, 1, W, 2, "wood")
    desk.rect(W - 6, 3, 2, 5, "woodShade")
    stamp(g, outlined(desk, "line"), -1, deskY - 1)

    // The terminal on its stand.
    const tw = W >= 90 ? 44 : 32
    const th = deskY - 6 - 5 - 3
    const term = terminal(tw, th)
    const tx = W >= 90 ? 30 : 28
    const ty = deskY - term.grid.h + 1
    stamp(g, term.grid, tx - 1, ty)
    const sx = tx + term.screen.x
    const sy = ty + term.screen.y + 1
    codeBars(g, sx + 1, sy + 1, term.screen.w - 2, W >= 90 ? 4 : 3)
    if (W >= 90) {
        stamp(g, plant(), W - 13, deskY - 10)
        stamp(g, chiya(), tx + tw + 1, deskY - 6)
    } else {
        stamp(g, chiya(), W - 9, deskY - 6)
    }

    // The words on the screen sit below the bars, at half the world pixel.
    const barsH = (W >= 90 ? 4 : 3) * 2 + 1
    const words = smallText(
        W >= 90
            ? [
                  { text: "curl /v1/chat", key: "screenText" },
                  { text: "200 ok", key: "led" },
                  { text: "namaste! k cha?", key: "phoneScreen" },
              ]
            : [
                  { text: "curl /v1", key: "screenText" },
                  { text: "200 ok", key: "led" },
              ],
    )
    const cursor = new Grid(1, 2)
    cursor.rect(0, 0, 1, 2, "screenText")

    const dev = { x: W >= 90 ? 8 : 5, y: deskY - 18 }
    return {
        w: W,
        h: H,
        grid: g,
        label: "Pixel illustration: a developer in a marigold hoodie at a desk, a terminal beside them showing a call to Boli's API and a 200 ok",
        overlays: [
            { kind: "half", grid: words, x: sx + 1, y: sy + barsH },
            { kind: "blink", grid: cursor, x: sx + 1 + Math.ceil(measure("200 ok") / 2) + 2, y: sy + barsH + 5, dur: 1 },
            { kind: "frames", pair: DEVELOPER, x: dev.x, y: dev.y, dur: 0.5 },
        ],
    }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* Student by the school                                                                                              */
/* ------------------------------------------------------------------------------------------------------------------ */

function studentSchool(): Vignette {
    const W = 64
    const H = 48
    const g = new Grid(W, H)
    outdoors(g, 40, [
        [10, 14, 1, 1],
        [40, 10, 1, 1],
        [66, 13, 1, 1],
    ])
    const sc = school()
    stamp(g, sc, W - sc.w - 1, 41 - sc.h + 1)
    // The flag on its pole by the school door.
    g.rect(35, 22, 1, 19, "woodShade")
    g.set(35, 21, "gold")
    const fl = flag("flagRed")
    stamp(g, books(), 18, 44 - 11 + 2)
    const pine1 = new Grid(5, 6)
    pine1.sprite(0, 0, ["..P..", ".PPQ.", ".PPQ.", "PPPQQ", "PPPQQ", "..T.."], { P: "pine", Q: "pineShade", T: "trunk" })
    stamp(g, pine1, 1, 29)
    return {
        w: W,
        h: H,
        grid: g,
        label: "Pixel illustration: a schoolgirl in a light blue shirt and navy tie with her phone, a stack of books beside her, the school behind",
        overlays: [
            { kind: "frames", pair: fl, x: 36, y: 22, dur: 1.2 },
            { kind: "frames", pair: STUDENT, x: 4, y: feetY(STUDENT, 46), dur: 3.8, motion: "blink" },
            { kind: "bubble", b: bubble(["padhna", "sajilo!"], { side: "bottom", at: 6 }), x: 13, y: 1 },
        ],
    }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* Two founders at a whiteboard                                                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

function startupBoard(): Vignette {
    const W = 64
    const H = 48
    const g = new Grid(W, H)
    room(g)
    planks(g, 43)

    // The whiteboard: a rising bar chart in the sky blue, a trend line, a sticky note.
    const board = new Grid(40, 22)
    board.rect(0, 0, 40, 22, "laptop")
    board.rect(1, 1, 38, 19, "paper")
    board.rect(0, 20, 40, 2, "laptopShade")
    const bars = [4, 6, 9, 13]
    bars.forEach((h, i) => board.rect(5 + i * 5, 18 - h, 3, h, i === bars.length - 1 ? "sticker" : "phoneScreen"))
    for (let i = 0; i < 14; i++) board.set(5 + i + Math.floor(i / 4), 13 - Math.floor(i / 2), "flagRed")
    board.rect(28, 3, 8, 7, "jarA")
    board.rect(29, 5, 5, 1, "hoodieShade")
    board.rect(29, 7, 4, 1, "hoodieShade")
    board.rect(27, 12, 10, 1, "laptopShade")
    board.rect(27, 15, 7, 1, "laptopShade")
    stamp(g, outlined(board, "line"), 2, 3)

    // A small desk on the right with an open laptop facing us.
    const desk = new Grid(22, 9)
    desk.rect(0, 0, 22, 1, "woodHi")
    desk.rect(0, 1, 22, 2, "wood")
    desk.rect(2, 3, 2, 6, "woodShade")
    desk.rect(18, 3, 2, 6, "woodShade")
    stamp(g, outlined(desk, "line"), 41, 34)
    const laptop = new Grid(16, 12)
    laptop.rect(0, 0, 16, 10, "laptopShade")
    laptop.rect(1, 1, 14, 8, "screen")
    laptop.rect(0, 10, 16, 2, "laptop")
    codeBars(laptop, 2, 2, 12, 3)
    stamp(g, outlined(laptop, "line"), 43, 23)

    return {
        w: W,
        h: H,
        grid: g,
        label: "Pixel illustration: two founders at a whiteboard with a rising bar chart, one pointing at it, a laptop open on the desk",
        overlays: [
            { kind: "frames", pair: FOUNDER_A, x: 11, y: feetY(FOUNDER_A, 46), dur: 4.2, motion: "blink" },
            { kind: "frames", pair: FOUNDER_B, x: 26, y: feetY(FOUNDER_B, 46), dur: 3.2, motion: "wave" },
        ],
    }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* The shopkeeper at the pasal with a phone                                                                           */
/* ------------------------------------------------------------------------------------------------------------------ */

function pasalPhone(): Vignette {
    const W = 64
    const H = 48
    const g = new Grid(W, H)
    outdoors(g, 40, [
        [8, 13, 1, 1],
        [38, 9, 1, 1],
        [62, 12, 1, 1],
    ])
    const back = stallBack()
    const sx = 2
    const sy = H - back.h + 2
    stamp(g, back, sx, sy)
    const front = counter("pasal")
    const cy = H - front.h + 2
    return {
        w: W,
        h: H,
        grid: g,
        label: "Pixel illustration: the shopkeeper in a teal kurta and marigold shawl at her pasal, reading an order on her phone",
        overlays: [
            { kind: "frames", pair: SHOPKEEPER, x: sx + 11, y: sy + 6, dur: 4.6, motion: "blink" },
            { kind: "layer", grid: front, x: sx, y: cy },
            { kind: "layer", grid: phone(), x: sx + 21, y: sy + 15 },
            { kind: "frames", pair: PIGEON, x: 44, y: 42, dur: 1.5 },
            { kind: "frames", pair: PIGEON, x: 54, y: 43, dur: 1.8, delay: 0.6 },
            { kind: "bubble", b: bubble(["order", "aayo!"], { side: "left", at: 8 }), x: 36, y: 11 },
        ],
    }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* Contact: the pasal with a letter and a postbox                                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

function pasalLetter(): Vignette {
    const W = 96
    const H = 60
    const g = new Grid(W, H)
    outdoors(g, 46, [
        [12, 16, 1, 1],
        [46, 11, 1, 1],
        [82, 15, 1, 1],
    ])
    // Prayer flags from the stall's awning to a pole on the right.
    const flags = cord(g, 40, 14, 92, 18, 3, 3)
    g.rect(92, 18, 1, 29, "woodShade")
    g.set(92, 17, "gold")

    const back = stallBack()
    const sx = 4
    const sy = H - back.h + 1
    stamp(g, back, sx, sy)
    const front = counter("pasal")
    const cy = H - front.h + 1
    const box = postbox()
    const bx = 70
    stamp(g, box, bx, H - box.h)
    const mail = envelope()
    const letterY = cy - 5
    return {
        w: W,
        h: H,
        grid: g,
        label: "Pixel illustration: the shopkeeper at her pasal with a letter on the counter, a red postbox beside the stall and letters on their way to it",
        overlays: [
            ...flags.map((f, i) => ({ kind: "frames" as const, pair: flag(f.key), x: f.x, y: f.y, dur: 1.1 + (i % 3) * 0.15, delay: i * 0.17 })),
            { kind: "frames", pair: SHOPKEEPER, x: sx + 11, y: sy + 6, dur: 4.5, motion: "wave" },
            { kind: "layer", grid: front, x: sx, y: cy },
            { kind: "layer", grid: mail, x: sx + 24, y: letterY },
            { kind: "mail", grid: mail, x: 42, y: H - 19, dx: bx - 42 - 3, dur: 4.2, delay: 0 },
            { kind: "frames", pair: PIGEON, x: 52, y: H - 6, dur: 1.5 },
            { kind: "bubble", b: bubble(["k sahayog", "garaun?"], { side: "left", at: 10 }), x: 33, y: 22 },
        ],
    }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* Terms and Privacy: the elder with a scroll                                                                         */
/* ------------------------------------------------------------------------------------------------------------------ */

function elderScroll(): Vignette {
    const W = 96
    const H = 60
    const g = new Grid(W, H)
    outdoors(g, 46, [
        [14, 16, 1, 1],
        [50, 11, 1, 1],
        [86, 14, 1, 1],
    ])
    const pg = pagoda()
    stamp(g, pg.grid, W - pg.grid.w + 2, 47 - pg.grid.h + 1)

    // The scroll hangs from a wooden stand: two rods, the paper, lines of writing, a red seal.
    const sc = new Grid(30, 36)
    sc.rect(0, 0, 30, 2, "wood")
    sc.rect(0, 0, 30, 1, "woodHi")
    sc.rect(2, 2, 26, 27, "paper")
    sc.rect(2, 2, 2, 27, "page")
    const lens = [20, 16, 21, 12, 19, 22, 14, 18]
    lens.forEach((l, i) => sc.rect(6, 5 + i * 3, l, 1, i === 0 ? "line" : "string"))
    sc.rect(22, 24, 4, 3, "flagRed")
    sc.rect(23, 25, 2, 1, "awningEdge")
    sc.rect(0, 29, 30, 2, "wood")
    sc.rect(1, 31, 2, 5, "woodShade")
    sc.rect(27, 31, 2, 5, "woodShade")
    stamp(g, outlined(sc, "line"), 36, H - 38)

    return {
        w: W,
        h: H,
        grid: g,
        label: "Pixel illustration: an elder in a Dhaka topi beside a hanging scroll of written rules with a red seal, a pagoda behind",
        overlays: [
            { kind: "frames", pair: ELDER, x: 12, y: feetY(ELDER, H - 1), dur: 0.8 },
            { kind: "frames", pair: PIGEON, x: 72, y: H - 6, dur: 1.6 },
            { kind: "bubble", b: bubble(["sabai kura", "lekhieko cha"], { side: "bottom", at: 10 }), x: 2, y: 4 },
        ],
    }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* About: the scorecard and the test bench                                                                            */
/* ------------------------------------------------------------------------------------------------------------------ */

/** Which of the fourteen checks the best platform passed (five; positions only - the scene names nobody). */
const PASSED = new Set([0, 1, 4, 9, 13])

function scorecard(): Vignette {
    const W = 96
    const H = 60
    const g = new Grid(W, H)
    room(g)
    planks(g, H - 4)
    stamp(g, valleyWindow(18, 14), 4, 4)

    // The developer at a desk on the left, looking up from the laptop.
    const deskY = H - 12
    const desk = new Grid(40, 8)
    desk.rect(0, 0, 40, 1, "woodHi")
    desk.rect(0, 1, 40, 2, "wood")
    desk.rect(34, 3, 2, 5, "woodShade")
    stamp(g, outlined(desk, "line"), -1, deskY - 1)
    stamp(g, chiya(), 24, deskY - 6)

    // The clipboard pinned on the wall: fourteen checks in two columns, five ticked.
    const cb = new Grid(42, 50)
    cb.rect(0, 0, 42, 50, "woodHi")
    cb.rect(0, 0, 2, 50, "wood")
    cb.rect(3, 4, 36, 44, "paper")
    cb.rect(15, 0, 12, 5, "laptopShade")
    cb.rect(17, 1, 8, 2, "laptop")
    for (let i = 0; i < 14; i++) {
        const col = i < 7 ? 0 : 1
        const row = i % 7
        const x = 6 + col * 17
        const y = 8 + row * 4
        const ok = PASSED.has(i)
        cb.rect(x, y, 3, 3, ok ? "led" : "laptop")
        if (!ok) cb.set(x + 1, y + 1, "paper")
        cb.rect(x + 5, y + 1, 7 + ((i * 3) % 4), 1, "string")
    }
    cb.rect(6, 38, 30, 1, "laptop")
    stamp(g, outlined(cb, "line"), 48, 3)
    const score = smallText([{ text: "5/14", key: "alert" }])

    return {
        w: W,
        h: H,
        grid: g,
        label: "Pixel illustration: a developer at a desk beside a clipboard of fourteen checks for a developer platform, only five ticked: 5 of 14",
        overlays: [
            { kind: "frames", pair: DEVELOPER, x: 6, y: deskY - 18, dur: 0.5 },
            { kind: "half", grid: score, x: 49 + Math.floor((42 - measure("5/14") / 2) / 2), y: 44 },
            { kind: "bubble", b: bubble(["sirf 5?"], { side: "bottom", at: 8 }), x: 4, y: 20 },
        ],
    }
}

function testBench(): Vignette {
    const W = 96
    const H = 60
    const g = new Grid(W, H)
    room(g)
    planks(g, H - 4)

    const deskY = 40
    const desk = new Grid(W, 12)
    desk.rect(0, 0, W, 1, "woodHi")
    desk.rect(0, 1, W, 3, "wood")
    desk.rect(6, 4, 3, 8, "woodShade")
    desk.rect(W - 9, 4, 3, 8, "woodShade")
    stamp(g, outlined(desk, "line"), -1, deskY - 1)

    // Three open models on the bench; the middle one (the pick) has the gold core and a stack of rupee coins.
    const xs = [10, 41, 72] as const
    xs.forEach((x, i) => stamp(g, chip(i === 1 ? "gold" : "laptopShade"), x, deskY - 16))
    const coins = new Grid(8, 7)
    for (let i = 0; i < 3; i++) {
        coins.rect(1, 5 - i * 2, 6, 2, i % 2 ? "goldShade" : "gold")
    }
    disc(coins, 4, 1, 1, "gold")
    stamp(g, outlined(coins, "line"), 58, deskY - 8)
    // A tick over the pick.
    const tick = new Grid(7, 6)
    ;[
        [0, 3],
        [1, 4],
        [2, 5],
        [3, 4],
        [4, 3],
        [5, 2],
        [6, 1],
    ].forEach(([x, y]) => tick.rect(x ?? 0, y ?? 0, 1, 1, "led"))
    stamp(g, outlined(tick, "line"), 45, 14)

    const label = (t: string) => smallText([{ text: t, key: "line" }])
    return {
        w: W,
        h: H,
        grid: g,
        label: "Pixel illustration: three open models on a test bench, each asked the same Romanized Nepali question; the middle one answers well and is ticked, with a stack of rupee coins beside it",
        overlays: [
            { kind: "bubble", b: bubble(["? ?"], { side: "bottom", at: 8 }), x: 8, y: 4 },
            { kind: "bubble", b: bubble(["sanchai!"], { side: "bottom", at: 14 }), x: 38, y: 2 },
            { kind: "bubble", b: bubble(["fine."], { side: "bottom", at: 10 }), x: 70, y: 4 },
            { kind: "half", grid: label("a"), x: 17, y: deskY + 5 },
            { kind: "half", grid: label("e4b"), x: 45, y: deskY + 5 },
            { kind: "half", grid: label("c"), x: 79, y: deskY + 5 },
        ],
    }
}

/* ------------------------------------------------------------------------------------------------------------------ */

export const VIGNETTES = {
    /** Who it's for (64 x 48). */
    whoDeveloper: developerDesk(64, 48),
    whoStudent: studentSchool(),
    whoStartup: startupBoard(),
    whoShop: pasalPhone(),
    /** Page heroes (96 x 60). */
    docsDesk: developerDesk(96, 60),
    contactPasal: pasalLetter(),
    legalElder: elderScroll(),
    /** About chapters (96 x 60). */
    aboutScorecard: scorecard(),
    aboutBench: testBench(),
} as const

export type VignetteId = keyof typeof VIGNETTES
