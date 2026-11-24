import { Grid, spriteGrid, type CharMap, type Palette } from "@repo/brand/art/pixel/grid"
import { cord, disc, paintCourtyard, paintHills, paintRange, paintSky, paintTerraces, type Peak } from "@repo/brand/art/pixel/scenery"
import { DHAKA_TILES } from "@repo/brand/art/dhaka/pattern"
import { write, measure } from "@repo/brand/art/valley/font"
import { bubble, ELDER, outlined, stamp, type Bubble, type Pair } from "@repo/brand/art/valley/kit"
import { VALLEY_DAY } from "@repo/brand/art/valley/palette"

/*
 * Pixel art for the Loaders tab, drawn with the production kit (components/art, imported read-only) so every piece
 * shares the P1 v3 palette, outlines and perfect slopes. Pure data, built once at module load.
 *
 * New pieces: the porter with a doko, the fork in the trail with its signpost, the pasal with its shutter down, the
 * Boli house at night, a prayer-flag string, a valley strip for the sunrise, and six small empty-state icons.
 */

/* ------------------------------------------------------------------------------------------------ palettes */

const EXTRA = {
    shutter: "#c3c8d1",
    shutterShade: "#959caa",
    shutterHi: "#e2e6ec",
    moon: "#f6efd2",
    star: "#f6efd2",
    windowLit: "#f2c66b",
    sunHi: "#fff8d8",
}

export const DAY: Palette = { ...VALLEY_DAY, ...EXTRA }

/** Night: the same world after dark - cool, low, the snow faintly lit by the moon. */
export const NIGHT: Palette = {
    ...DAY,
    sky0: "#121829",
    sky1: "#172036",
    sky2: "#1c2843",
    sky3: "#233152",
    back: "#283352",
    backSnow: "#3f4d72",
    far: "#2e3b5c",
    farShade: "#25304d",
    snow: "#7e8fb8",
    snowShade: "#62729d",
    hill: "#22372e",
    hillShade: "#1a2b24",
    hillHi: "#2d4639",
    pine: "#12221b",
    pineShade: "#0e1a15",
    trunk: "#2a1d17",
    field: "#2a3a29",
    fieldSoft: "#31432f",
    fieldEdge: "#213021",
    path: "#4d4757",
    pathShade: "#3c3746",
    pathHi: "#5b5466",
    brick: "#6a4136",
    brickShade: "#52312a",
    roof: "#271d24",
    roofShade: "#1c151a",
    wood: "#4a3123",
    woodShade: "#352318",
    woodHi: "#5d3f2c",
    page: "#cfc7b8",
    window: "#120f16",
    gpu: "#1b1c25",
    gpuHi: "#272938",
    midLine: "#120d16",
    line: "#0c0a10",
    string: "#4a4450",
    flagBlue: "#2f528f",
    flagWhite: "#c9c4ba",
    flagRed: "#9a3a2d",
    flagGreen: "#2f6a42",
    flagYellow: "#b5922f",
    bubble: "#232426",
    bubbleInk: "#f5f3f0",
    bubbleShade: "#0b0c0d",
    cloud: "#2b3553",
    cloudShade: "#222a45",
}

/** The bubble keys only, for a dark card (Kura's bubble on near-black). */
export const DARK_BUBBLE: Palette = { ...DAY, bubble: "#232426", bubbleInk: "#f5f3f0", bubbleShade: "#0b0c0d" }

/** The 500 room after dark: the wall and floor dimmed, the laptop and its heat unchanged. */
export const DIM_ROOM: Palette = { ...DAY, wall: "#2a2a30", wallShade: "#232329", path: "#3a3540", pathShade: "#2c2832", pathHi: "#463f4c" }

/* ------------------------------------------------------------------------------------------------ helpers */

function backdrop(g: Grid, skyTo: number, base: number, peaks: readonly Peak[]): void {
    paintSky(g, skyTo)
    const back: Peak[] = peaks.map(([x, y, l, r]) => [x + 12, y - 4, l, r] as const)
    paintRange(g, back, base, base - 7, { lit: "back", shade: "back", snow: "backSnow", snowShade: "backSnow" })
    paintRange(g, peaks, base, base - 5, { lit: "far", shade: "farShade", snow: "snow", snowShade: "snowShade" })
}

/* ------------------------------------------------------------------------------------------------ F2 flags */

export type FlagSpot = { x: number; y: number; key: string }
export const FLAGS_W = 96
export const FLAGS_H = 40

/** Sky, two ranges and a hill line, two poles and a sagging string; the flags hang from the returned spots. */
export const FLAGS_SCENE = (() => {
    const g = new Grid(FLAGS_W, FLAGS_H)
    backdrop(g, 40, 40, [
        [18, 14, 1, 1],
        [52, 9, 1, 1],
        [84, 15, 1, 1],
    ])
    paintHills(g, (x) => 33 + Math.round(1.5 * Math.sin(x / 11)), 40, { lit: "hill", shade: "hillShade", hi: "hillHi" }, [10, 70, 88])
    const poles = new Grid(FLAGS_W, FLAGS_H)
    poles.rect(5, 7, 1, 33, "wood")
    poles.rect(90, 9, 1, 31, "wood")
    stamp(g, outlined(poles, "line"), -1, -1)
    const spots = cord(g, 6, 8, 89, 10, 9, 5)
    return { grid: g, spots }
})()

/** One flag: 4 wide, 5 tall, with a darker hem so the pixel reads as cloth. */
export function flagGrid(key: string): Grid {
    const g = new Grid(4, 5)
    g.rect(0, 0, 4, 5, key)
    g.rect(0, 4, 4, 1, key === "flagWhite" ? "stoneShade" : "line")
    return g
}

/* ------------------------------------------------------------------------------------------------ F5 valley strip */

export const STRIP_W = 120
export const STRIP_H = 36

/**
 * The strip in two layers so the sun can rise BETWEEN them: the sky with the pale ranges behind, then the hills and
 * terraces in front. The sun starts low behind the hills and climbs across the ranges.
 */
export const STRIP = (() => {
    const sky = new Grid(STRIP_W, STRIP_H)
    paintSky(sky, STRIP_H)
    const peaks: Peak[] = [
        [22, 14, 1, 1],
        [60, 11, 1, 1],
        [98, 13, 1, 1],
    ]
    paintRange(sky, peaks.map(([x, y, l, r]) => [x + 10, y - 3, l, r] as const), 30, 22, { lit: "back", shade: "back", snow: "backSnow", snowShade: "backSnow" })
    paintRange(sky, peaks, 30, 24, { lit: "far", shade: "farShade", snow: "snow", snowShade: "snowShade" })
    const land = new Grid(STRIP_W, STRIP_H)
    paintHills(land, (x) => 26 + Math.round(1.5 * Math.sin(x / 12)), 31, { lit: "hill", shade: "hillShade", hi: "hillHi" }, [8, 40, 76, 104])
    paintTerraces(land, 30, STRIP_H)
    const sun = new Grid(9, 9)
    disc(sun, 4, 4, 4, "sun")
    disc(sun, 5, 3, 1, "sunHi")
    return { sky, land, sun, sunAt: { x: 8, y: 24 } }
})()

/* ------------------------------------------------------------------------------------------------ F4 bubble */

export const NAMASTE: Bubble = bubble(["namaste"], { side: "bottom", at: 10 })

/* ------------------------------------------------------------------------------------------------ the porter */

const PORTER_MAP: CharMap = {
    y: "woodHi",
    b: "wood",
    B: "woodShade",
    n: "stick",
    "1": "topiA",
    "2": "topiB",
    "3": "topiC",
    "4": "topiD",
    s: "skin",
    S: "skinShade",
    h: "skinHi",
    e: "eye",
    r: "blush",
    m: "mouth",
    t: "teal",
    T: "tealShade",
    u: "tealHi",
    d: "daura",
    D: "dauraShade",
    f: "shoe",
}

/** A porter with a doko (the conical basket) on his back, its strap across his forehead under the topi. */
const PORTER_ROWS = [
    ".ybybybybybybyb.",
    ".BbBbBbBbBbBbBb.",
    "..bBbBbBbBbBbB..",
    "..Bb.142314.bB..",
    "..bB14231423Bb..",
    "..Bb22222222bB..",
    "..bBnnnnnnnnBb..",
    "..BbSsssssshbB..",
    "..bBSessssehBb..",
    "..BbSrssssrhbB..",
    "..bB.Ssmmsh.Bb..",
    "..Bb..Ssss..bB..",
    ".BbtttttttttubB.",
    ".bBtttttttttuBb.",
    ".BbstttttttTsbB.",
    "..BtttttttttTB..",
    "...sddddddddS...",
    "....dddddddd....",
    "....dddDDddd....",
    "....ss....ss....",
    "....ss....ss....",
    "....sS....sS....",
    "...fff....fff...",
]
const PORTER_LOOK = PORTER_ROWS.map((r, i) => (i === 8 ? "..bBSsesssseBb.." : r))

export const PORTER: Pair = { a: outlined(spriteGrid(PORTER_ROWS, PORTER_MAP)), b: outlined(spriteGrid(PORTER_LOOK, PORTER_MAP)) }

/* ------------------------------------------------------------------------------------------------ St1a the fork */

export const FORK_W = 120
export const FORK_H = 64

/** A trail climbing from the bottom splits in two at a signpost: "404" points one way, "home" the other. */
export const FORK = (() => {
    const g = new Grid(FORK_W, FORK_H)
    backdrop(g, 42, 40, [
        [20, 16, 1, 1],
        [60, 9, 1, 1],
        [100, 14, 1, 1],
    ])
    paintHills(g, (x) => 36 + Math.round(1.5 * Math.sin(x / 14)), 44, { lit: "hill", shade: "hillShade", hi: "hillHi" }, [6, 30, 92, 110])
    for (let y = 43; y < FORK_H; y++) for (let x = 0; x < FORK_W; x++) g.set(x, y, (x * 3 + y * 5) % 23 === 0 ? "hillHi" : (y - 43) % 6 === 5 ? "hillShade" : "hill")

    // The trail: a trunk widening toward the viewer, then two branches climbing 1:2 to the hills.
    const trail = new Grid(FORK_W, FORK_H)
    for (let y = 52; y < FORK_H; y++) {
        const half = 3 + Math.floor((y - 52) / 2)
        trail.rect(60 - half, y, half * 2, 1, (y - 52) % 4 === 3 ? "pathShade" : "path")
    }
    for (let y = 43; y < 52; y++) {
        const d = (52 - y) * 2
        trail.rect(57 - d, y, 4, 1, y % 3 === 0 ? "pathShade" : "path")
        trail.rect(59 + d, y, 4, 1, y % 3 === 0 ? "pathShade" : "path")
    }
    trail.rect(57, 51, 6, 1, "path")
    stamp(g, trail, 0, 0)

    // The signpost: two boards on a post, the left one says 404, the right one says home.
    const post = new Grid(FORK_W, FORK_H)
    post.rect(59, 30, 2, 22, "wood")
    post.rect(59, 30, 1, 22, "woodShade")
    const board = (x: number, y: number, w: number, left: boolean, text: string) => {
        post.rect(x, y, w, 11, "woodShade")
        post.rect(x, y, w, 1, "wood")
        for (let r = 0; r < 7; r++) {
            const tip = 4 - Math.abs(r - 3)
            post.rect(left ? x - tip : x + w, y + 2 + r, tip, 1, "woodShade")
        }
        write(post, x + Math.floor((w - measure(text)) / 2), y + 2, text, "page")
    }
    board(44, 29, 18, true, "404")
    board(58, 41, 24, false, "home")
    stamp(g, outlined(post, "line"), -1, -1)
    return { grid: g, porterAt: { x: 20, y: 33 } }
})()

/* ------------------------------------------------------------------------------------------------ St1b the elder */

export const MAP_W = 80
export const MAP_H = 72

/** The elder on a terrace path, holding a map that does not match the trail. */
export const ELDER_MAP = (() => {
    const g = new Grid(MAP_W, MAP_H)
    backdrop(g, 46, 40, [
        [14, 12, 1, 1],
        [44, 6, 1, 1],
        [72, 13, 1, 1],
    ])
    paintHills(g, (x) => 36 + Math.round(1.5 * Math.sin(x / 10)), 46, { lit: "hill", shade: "hillShade", hi: "hillHi" }, [4, 58, 70])
    paintTerraces(g, 46, MAP_H)
    const trail = new Grid(MAP_W, MAP_H)
    for (let y = 44; y < MAP_H; y++) {
        const half = 2 + Math.floor((y - 44) / 3)
        const cx = 40 + Math.floor((y - 44) / 2)
        trail.rect(cx - half, y, half * 2, 1, (y - 44) % 4 === 3 ? "pathShade" : "path")
    }
    stamp(g, trail, 0, 0)

    const map = new Grid(16, 12)
    map.rect(0, 0, 16, 12, "paper")
    map.rect(5, 0, 1, 12, "stoneShade")
    map.rect(10, 0, 1, 12, "stoneShade")
    ;[
        [2, 9],
        [3, 8],
        [4, 7],
        [6, 7],
        [7, 6],
        [8, 5],
        [9, 5],
        [11, 4],
        [12, 3],
    ].forEach(([x, y]) => map.set(x ?? 0, y ?? 0, "flagRed"))
    map.set(13, 2, "alert")
    map.set(14, 1, "alert")
    map.set(14, 3, "alert")
    map.set(12, 1, "alert")
    return { grid: g, elderAt: { x: 22, y: 62 - ELDER.a.h + 1 }, map: outlined(map, "line"), mapAt: { x: 35, y: 45 } }
})()

export const HMM: Bubble = bubble(["hmm?"], { side: "bottom", at: 8 })

/* ------------------------------------------------------------------------------------------------ St3 the pasal */

export const PASAL_W = 120
export const PASAL_H = 64

/** A pasal with its shutter down and padlocked, a "banda" note taped on, a pigeon pecking in front. */
export const PASAL = (() => {
    const g = new Grid(PASAL_W, PASAL_H)
    g.rect(0, 0, PASAL_W, 56, "wall")
    for (let y = 0; y < 56; y += 4) for (let x = (y / 4) % 2 === 0 ? 0 : 6; x < PASAL_W; x += 12) g.rect(x, y, 1, 4, "wallShade")
    for (let y = 3; y < 56; y += 4) g.rect(0, y, PASAL_W, 1, "wallShade")
    paintCourtyard(g, 56, PASAL_H)

    const shop = new Grid(PASAL_W, PASAL_H)
    // The upper floor: brick with two latticed windows.
    shop.rect(22, 0, 76, 12, "brick")
    for (let y = 2; y < 12; y += 3) for (let x = 24 + (y % 2) * 2; x < 98; x += 4) shop.set(x, y, "brickShade")
    for (const wx of [32, 80]) {
        shop.rect(wx, 2, 8, 8, "wood")
        shop.rect(wx + 1, 3, 6, 6, "window")
        shop.rect(wx + 3, 3, 1, 6, "wood")
        shop.rect(wx + 1, 5, 6, 1, "wood")
    }
    // The sign board.
    shop.rect(44, 3, 32, 11, "woodShade")
    shop.rect(44, 3, 32, 1, "wood")
    write(shop, 44 + Math.floor((32 - measure("pasal")) / 2), 4, "pasal", "page")
    // The awning, striped and scalloped.
    for (let c = 18; c < 102; c++) {
        const stripe = c % 4 < 2 ? "awningA" : "awningB"
        shop.set(c, 14, "awningEdge")
        shop.rect(c, 15, 1, 4, stripe)
        if (c % 4 === 1 || c % 4 === 2) shop.set(c, 19, stripe)
    }
    // Posts and the shutter: corrugated rows, a bottom rail, a padlock.
    shop.rect(24, 20, 3, 36, "wood")
    shop.rect(93, 20, 3, 36, "wood")
    for (let y = 20; y < 54; y++) shop.rect(27, y, 66, 1, (y - 20) % 3 === 0 ? "shutterHi" : (y - 20) % 3 === 1 ? "shutter" : "shutterShade")
    shop.rect(27, 54, 66, 2, "laptopShade")
    shop.rect(57, 49, 6, 5, "gold")
    shop.rect(57, 49, 1, 5, "goldShade")
    shop.rect(59, 51, 2, 2, "goldShade")
    shop.rect(58, 46, 1, 3, "laptopShade")
    shop.rect(61, 46, 1, 3, "laptopShade")
    shop.rect(58, 45, 4, 1, "laptopShade")
    // The note.
    const note = new Grid(30, 13)
    note.rect(0, 0, 30, 13, "paper")
    note.rect(0, 0, 4, 2, "shutterHi")
    note.rect(26, 0, 4, 2, "shutterHi")
    write(note, Math.floor((30 - measure("banda")) / 2), 2, "banda", "flagRed")
    stamp(shop, note, 45, 27)
    stamp(g, outlined(shop, "line"), -1, -1)
    return { grid: g, pigeonAt: { x: 100, y: 54 } }
})()

/* ------------------------------------------------------------------------------------------------ St4 the house at night */

export const NIGHT_W = 120
export const NIGHT_H = 64

/** The Boli house with its lights off under a crescent moon; one amber standby light, stars that twinkle. */
export const RESTING = (() => {
    const g = new Grid(NIGHT_W, NIGHT_H)
    backdrop(g, 46, 44, [
        [16, 20, 1, 1],
        [50, 14, 1, 1],
        [92, 18, 1, 1],
    ])
    disc(g, 98, 11, 5, "moon")
    // Carve the crescent with whatever sky band each row sits in, so no seam shows.
    const carve = new Grid(NIGHT_W, NIGHT_H)
    disc(carve, 100, 9, 5, "cut")
    const band = Math.ceil(46 / 4)
    for (let y = 0; y < 20; y++) for (let x = 90; x < 108; x++) if (carve.get(x, y)) g.set(x, y, `sky${Math.min(3, Math.floor(y / band))}`)
    paintHills(g, (x) => 40 + Math.round(1.5 * Math.sin(x / 13)), 50, { lit: "hill", shade: "hillShade", hi: "hillHi" }, [6, 20, 96, 110])
    paintTerraces(g, 50, NIGHT_H)

    // The house, its door the dark server rack, every window dark.
    const w = 34
    const h = 26
    const house = new Grid(w + 4, h)
    for (let r = 0; r < 5; r++) house.rect(4 - r, r, w - 4 + 2 * r, 1, r === 4 ? "roofShade" : "roof")
    house.rect(2, 5, w, h - 5, "brick")
    house.rect(2, 5, 2, h - 5, "brickShade")
    house.rect(2, 5, w, 1, "roofShade")
    for (let r = 7; r < h; r += 3) for (let c = 5 + (r % 2) * 2; c < w + 2; c += 4) house.set(c, r, "brickShade")
    const bx = Math.floor((w + 4 - 20) / 2)
    house.rect(bx, 7, 20, 11, "woodShade")
    house.rect(bx, 7, 20, 1, "wood")
    write(house, bx + 3, 8, "boli", "page")
    for (const wx of [4, w - 3]) {
        house.rect(wx, 9, 4, 5, "wood")
        house.rect(wx + 1, 10, 2, 3, "window")
    }
    const dx = Math.floor((w + 4) / 2) - 5
    house.rect(dx, h - 7, 10, 7, "gpu")
    for (let r = h - 6; r < h; r += 2) house.rect(dx + 1, r, 8, 1, "gpuHi")
    const hx = 41
    const hy = 52 - h
    stamp(g, outlined(house, "line"), hx, hy)

    const stars = [
        [8, 4],
        [22, 9],
        [34, 3],
        [46, 7],
        [62, 2],
        [74, 8],
        [84, 4],
        [112, 6],
        [116, 16],
        [4, 14],
        [28, 15],
        [68, 13],
    ] as const
    const zz = new Grid(12, 14)
    write(zz, 0, 0, "z", "page")
    write(zz, 6, 5, "z", "page")
    return { grid: g, stars, led: { x: hx + 1 + dx + 8, y: hy + 1 + h - 6 }, zz, zzAt: { x: hx + 30, y: hy - 10 } }
})()

/* ------------------------------------------------------------------------------------------------ empty-state icons */

const ICON_MAP: CharMap = {
    y: "gold",
    G: "goldShade",
    h: "sunHi",
    l: "leafHi",
    L: "leaf",
    t: "leafShade",
    e: "wood",
    E: "woodShade",
    g: "laptop",
    q: "laptopShade",
    b: "lens",
    w: "paper",
    s: "string",
}

function icon(rows: readonly string[]): Grid {
    return outlined(spriteGrid(rows, ICON_MAP))
}

/** E1 - a brass key. */
export const ICON_KEY = icon([
    "..yyy...............",
    ".yhGGy..............",
    "yh...Gy.............",
    "yG...Gyyyyyyyyyyyyy.",
    "yG...GyGGGGGGGGGGGGy",
    ".yGGGy.......yG.yG..",
    "..yyy........yG.yG..",
])

/** E2 - a seedling on a terrace edge: nothing yet, something soon. */
export const ICON_SPROUT = icon([
    ".lL.......Ll.",
    "lLLL.....LLLl",
    ".LLLL...LLLL.",
    "...LLt.tLL...",
    ".....ttt.....",
    "......t......",
    "......t......",
    "eeeeeeeeeeeee",
    "EEEEEEEEEEEEE",
])

/** E4 - two short stacks of coins. */
export const ICON_COINS = (() => {
    const g = new Grid(18, 13)
    const coin = (x: number, y: number) => {
        g.rect(x + 1, y, 6, 1, "sunHi")
        g.rect(x, y + 1, 8, 1, "gold")
        g.rect(x, y + 2, 8, 1, "goldShade")
    }
    ;[10, 7, 4, 1].forEach((y) => coin(0, y))
    ;[10, 7].forEach((y) => coin(10, y))
    return outlined(g, "line")
})()

/** E5 - a temple bell (ghanti) at rest; the clapper swings now and then. */
export const ICON_BELL = (() => {
    const g = new Grid(15, 16)
    g.rect(7, 0, 1, 3, "string")
    const HALF = [1, 2, 3, 3, 4, 4, 4, 5, 5, 5] as const
    for (let r = 0; r < 10; r++) {
        const half = HALF[r] ?? 5
        g.rect(7 - half, 3 + r, half * 2 + 1, 1, "gold")
        g.set(7 - half, 3 + r, "goldShade")
        if (r > 1 && r < 8) g.set(7 + half - 1, 3 + r, "sunHi")
    }
    g.rect(1, 13, 13, 1, "goldShade")
    g.rect(6, 2, 3, 1, "goldShade")
    return outlined(g, "line")
})()
export const ICON_CLAPPER = (() => {
    const g = new Grid(3, 3)
    g.rect(0, 0, 3, 3, "goldShade")
    return outlined(g, "line")
})()

/** E6 - a magnifier over a scrap of Dhaka. */
export const ICON_SEARCH = (() => {
    const g = new Grid(26, 20)
    const tile = DHAKA_TILES.slim
    for (let y = 0; y < tile.h; y++) for (let x = 0; x < 24; x++) {
        const k = tile.get(x, y)
        if (k) g.set(x, y + 8, `dk_${k}`)
    }
    const lens = new Grid(26, 20)
    for (let y = 0; y < 15; y++) for (let x = 2; x < 17; x++) {
        const d = (x - 9) ** 2 + (y - 7) ** 2
        if (d <= 49) lens.set(x, y, d >= 30 ? "laptopShade" : "lens")
    }
    lens.set(7, 4, "paper")
    lens.set(6, 5, "paper")
    for (let i = 0; i < 6; i++) lens.rect(15 + i, 13 + i, 2, 2, "wood")
    stamp(g, lens, 0, 0)
    return outlined(g, "line")
})()

/** The Dhaka keys the search icon borrows (prefixed so they never clash with the valley palette). */
export const DHAKA_ICON_KEYS: Palette = { dk_bg: "#e4f0fb", dk_c1: "#141414", dk_c2: "#3d8fd6", dk_c3: "#d8c7a8", dk_c4: "#1d64a3" }
export const DHAKA_ICON_KEYS_DARK: Palette = { dk_bg: "#1b3248", dk_c1: "#f5f3f0", dk_c2: "#6cb2ef", dk_c3: "#6b6560", dk_c4: "#6cb2ef" }

/** E3 - Kura's empty bubble, waiting (a cursor blinks inside). */
export const EMPTY_BUBBLE: Bubble = bubble([""], { side: "left", at: 4 })
