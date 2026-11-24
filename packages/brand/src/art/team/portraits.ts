import { Grid, spriteGrid } from "../pixel/grid"
import { paintHills, paintRange, paintSky } from "../pixel/scenery"
import { CHAR3, ELDER, outlined, stamp, STUDENT } from "../valley/kit"

/*
 * Team v2 - placeholder people as larger pixel portraits, each standing in a small scene that hints at the role. Same
 * world and palette as P1 v3, one step closer: a 16-pixel face (2x2 eyes with a catchlight on the lit side, brows, a
 * shaded nose, blush, a mouth) on a 24-pixel bust. No real person is drawn; names are "Your name here".
 */

export const PORTRAIT_W = 56
export const PORTRAIT_H = 56

/** The shared face, 16 wide. Rows 0-15. `s` skin, `S` shade, `h` light, `e` eye, `w` catchlight, `r` blush, `m` mouth. */
const FACE = [
    ".....ssssss.....",
    "...ssssssssss...",
    "..ssssssssssss..",
    ".ssssssssssssss.",
    "ssssssssssssssss",
    "ssssssssssssssss",
    "ssskkkssssskkkss",
    "ssssssssssssssss",
    "Ssssewssssewsshs",
    "Sssseesssseesshs",
    ".ssssssSSsssssh.",
    ".srrssssssssrrs.",
    "..sssssmmssssh..",
    "..Sssssssssssh..",
    "....Sssssssh....",
    "......SssS......",
]

/** Hair, glasses, a moustache: overlays on the face. `.` keeps what is under it. */
const OVER = {
    short: ["....kkkkkkkK....", "..kkkkkkkkkkKk..", ".kkkkkkkkkkkkKk.", "kkkkkkkkkkkkkkKk", "kkkkkskkkkkkkkkk", "kk............kk", "k..............k"],
    long: [
        "....kkkkkkkK....",
        "..kkkkkkkkkkKk..",
        ".kkkkkkkkkkkkKk.",
        "kkkkkkkkkkkkkkKk",
        "kkkkkkkkkkkkkkkk",
        "kkkkkkk......kkk",
        "kk............kk",
        "k..............k",
        "k..............k",
        "k..............k",
        "k..............k",
        "k..............k",
        "k..............k",
        "kk............kk",
    ],
    bun: ["......kkkK......", "..kkkkkkkkkkKk..", ".kkkkkkkkkkkkKk.", "kkkkkkkkkkkkkkKk", "kkk..........Kkk", "kk............kk", "k..............k"],
    topi: ["....1423142.....", "..314231423142..", ".14231423142314.", "2222222222222222", "g..............g", "g..............g", "g..............g"],
    glasses: ["", "", "", "", "", "", "", "..ccccc..ccccc..", "..c...cccc...c..", "..c...c..c...c..", "..ccccc..ccccc.."],
    moustache: ["", "", "", "", "", "", "", "", "", "", "", "...GGGGGGGGGG...", "...G..mmmm..G..."],
} as const

/** The bun sits above the head (rows -3 to -1). */
const BUN_TOP = ["......kkkK......", ".....kkkkKK.....", "......kkkk......"]

type Look = {
    hair: keyof typeof OVER
    extras?: readonly (keyof typeof OVER)[]
    skin2?: boolean
    /** Torso rows, 24 wide (row 0 sits right under the neck). */
    torso: readonly string[]
}

function overlay(rows: string[], over: readonly string[]): void {
    over.forEach((o, i) => {
        const r = rows[i]
        if (!r || !o) return
        rows[i] = [...r].map((ch, c) => (o[c] && o[c] !== "." ? o[c] : ch)).join("")
    })
}

/** A bust: 24 wide, 3 rows of headroom (bun, topi), the 16-wide face, then the torso. Outlined. */
function bust(look: Look): Grid {
    const face = [...FACE]
    overlay(face, OVER[look.hair])
    for (const e of look.extras ?? []) overlay(face, OVER[e])
    const skinMap: Readonly<Record<string, string>> = look.skin2 ? { s: "a", S: "A", h: "H" } : {}
    const head = face.map((r) => `....${[...r].map((ch) => skinMap[ch] ?? ch).join("")}....`)
    const top = look.hair === "bun" ? BUN_TOP.map((r) => `....${r}....`) : ["", "", ""].map(() => ".".repeat(24))
    const last = look.torso[look.torso.length - 1] ?? ".".repeat(24)
    const torso = [...look.torso, ...Array.from({ length: Math.max(0, 16 - look.torso.length) }, () => last)]
    return outlined(spriteGrid([...top, ...head, ...torso], CHAR3))
}

const NECK_OPEN = "......nnnnSssSnnnn......"

const FOUNDER = bust({
    hair: "short",
    torso: [
        NECK_OPEN,
        "....nnnnnnnSSnnnnnnn....",
        "..NNnnnnnnnnnnnnnnnnnn..",
        ".NNNnnnnnnnnnnnnnnnnnnn.",
        ".NNNnnnnnnnnnnnnnnnnnnn.",
        ".NNNnnnnnnnnnnnnnnnnnnn.",
        ".NNNnnnnnnnnnnnnnnnnnnn.",
    ],
})

const ML = bust({
    hair: "bun",
    extras: ["glasses"],
    skin2: true,
    torso: [
        "......ttttAaaAtttt......",
        "....tttttttAAttttttu....",
        "..TTttttttttttttttttuu..",
        ".TTTtttttttttttttttttuu.",
        ".TTTtttttttttttttttttuu.",
        ".TTTtttttttttttttttttuu.",
        ".TTTtttttttttttttttttuu.",
    ],
})

const DESIGNER = bust({
    hair: "long",
    torso: [
        "...k..ooooSssSoooo..k...",
        "...kooooooooOooooooyk...",
        "..kkOOooooooooooooyyk...",
        ".OOOkoooooooooooooookyy.",
        ".OOOOoooooooooooooooyyy.",
        ".OOOOoooooooooooooooyyy.",
        ".OOOOoooooooooooooooyyy.",
    ],
})

const COMMUNITY = bust({
    hair: "topi",
    extras: ["moustache"],
    torso: [
        "......vvvvdSsdvvvv......",
        "....vvvvvvddddvvvvvv....",
        "..VVvvvvvvddddvvvvvvvv..",
        ".VVVvvvvvvddddvvvvvvvvv.",
        ".VVVvvvvvvddddvvvvvvvvv.",
        ".VVVvvvvvvddddvvvvvvvvv.",
        ".VVVvvvvvvddddvvvvvvvvv.",
    ],
})

/** A layer that blinks over the portrait (LEDs, a cursor). */
export type TeamOverlay = { kind: "blink"; grid: Grid; x: number; y: number; dur: number }

export type TeamScene = { grid: Grid; overlays: readonly TeamOverlay[]; label: string }

/** Stands a bust on the bottom edge (its outline's last row falls off the frame). Centre is x 16. */
function placeBust(g: Grid, b: Grid, x = 16): void {
    stamp(g, b, x - 1, PORTRAIT_H - b.h + 1)
}

function room(g: Grid, wall: string, wallShade: string): void {
    g.rect(0, 0, PORTRAIT_W, PORTRAIT_H, wall)
    for (let x = 0; x < PORTRAIT_W; x += 8) g.rect(x, 0, 1, PORTRAIT_H, wallShade)
}

/** Founder: a desk by a window, a laptop open with code on the screen, a glass of chiya. */
function founder(): TeamScene {
    const g = new Grid(PORTRAIT_W, PORTRAIT_H)
    room(g, "wall", "wallShade")
    const win = new Grid(18, 16)
    win.rect(0, 0, 18, 16, "wood")
    const view = new Grid(16, 14)
    paintSky(view, 14)
    paintRange(view, [[5, 4, 1, 1], [12, 2, 1, 1]], 14, 7, { lit: "far", shade: "farShade", snow: "snow", snowShade: "snowShade" })
    view.rect(0, 11, 16, 3, "hill")
    stamp(win, view, 1, 1)
    stamp(g, outlined(win, "line"), 34, 3)
    placeBust(g, FOUNDER, 6)
    // The laptop, seen from behind its screen edge: the lid is low, the code faces the viewer on a second monitor.
    const desk = new Grid(PORTRAIT_W, 8)
    desk.rect(0, 0, PORTRAIT_W, 1, "woodHi")
    desk.rect(0, 1, PORTRAIT_W, 7, "wood")
    stamp(g, desk, 0, 48)
    const screen = new Grid(22, 15)
    screen.rect(0, 0, 22, 13, "laptopShade")
    screen.rect(1, 1, 20, 11, "screen")
    const code: readonly [number, number, string][] = [
        [2, 4, "sticker"],
        [2, 9, "screenText"],
        [4, 6, "gold"],
        [4, 5, "screenText"],
        [6, 8, "sticker"],
        [4, 3, "flagRed"],
        [8, 7, "screenText"],
    ]
    code.forEach(([x, w, key], i) => screen.rect(1 + x, 2 + Math.floor(i * 1.5), w, 1, key))
    screen.rect(0, 13, 22, 2, "laptop")
    stamp(g, outlined(screen, "line"), 32, 33)
    const cup = new Grid(4, 6)
    cup.rect(0, 0, 4, 6, "tea")
    cup.rect(0, 1, 4, 4, "wood")
    cup.rect(0, 0, 4, 1, "teaShade")
    stamp(g, outlined(cup, "line"), 25, 42)
    const cursor = new Grid(1, 1)
    cursor.set(0, 0, "screenText")
    return {
        grid: g,
        label: "Pixel portrait placeholder: the founder at a desk with code on the screen and a glass of tea",
        overlays: [{ kind: "blink", grid: cursor, x: 43, y: 45, dur: 1 }],
    }
}

/** ML engineer: in front of a GPU rack with blinking lights. */
function mlEngineer(): TeamScene {
    const g = new Grid(PORTRAIT_W, PORTRAIT_H)
    room(g, "wallShade", "wall")
    const rack = new Grid(16, 52)
    rack.rect(0, 0, 16, 52, "gpuShade")
    for (let y = 2; y < 50; y += 6) {
        rack.rect(2, y, 12, 5, "gpu")
        rack.rect(2, y, 12, 1, "gpuHi")
        for (let x = 4; x < 11; x += 2) rack.set(x, y + 2, "gpuShade")
    }
    stamp(g, outlined(rack, "line"), -1, 1)
    stamp(g, outlined(rack, "line"), 40, 1)
    const leds = new Grid(56, 56)
    for (let y = 4; y < 52; y += 6) {
        leds.set(12, y, y % 12 === 4 ? "ledAmber" : "led")
        leds.set(53, y, "led")
        leds.set(51, y, y % 18 === 4 ? "ledAmber" : "led")
    }
    // A cable tray runs between the racks behind the engineer.
    g.rect(15, 6, 26, 2, "gpuShade")
    for (let x = 17; x < 40; x += 4) g.rect(x, 8, 1, 3, "flagBlue")
    placeBust(g, ML)
    return {
        grid: g,
        label: "Pixel portrait placeholder: the ML engineer in front of a rack of GPU servers",
        overlays: [{ kind: "blink", grid: leds, x: 0, y: 0, dur: 1.2 }],
    }
}

/** Designer: a pin board of colour swatches, holding a sketchbook with a pixel mountain on it. */
function designer(): TeamScene {
    const g = new Grid(PORTRAIT_W, PORTRAIT_H)
    room(g, "wall", "wallShade")
    const board = new Grid(48, 18)
    board.rect(0, 0, 48, 18, "woodHi")
    const sw = ["sticker", "hoodie", "teal", "flagRed", "navy", "gold"]
    sw.forEach((k, i) => {
        board.rect(3 + i * 7, 3, 5, 5, k)
        board.rect(3 + i * 7, 9, 5, 2, "paper")
    })
    board.rect(4, 13, 16, 1, "woodShade")
    board.rect(4, 15, 10, 1, "woodShade")
    stamp(g, outlined(board, "line"), 4, 3)
    placeBust(g, DESIGNER, 5)
    const book = new Grid(22, 16)
    book.rect(0, 0, 22, 16, "paper")
    book.rect(0, 0, 1, 16, "book")
    const mini = new Grid(18, 11)
    paintSky(mini, 11)
    paintRange(mini, [[5, 3, 1, 1], [13, 1, 1, 1]], 11, 5, { lit: "far", shade: "farShade", snow: "snow", snowShade: "snowShade" })
    mini.rect(0, 9, 18, 2, "hill")
    stamp(book, mini, 2, 2)
    stamp(g, outlined(book, "line"), 32, 38)
    const pencil = new Grid(2, 12)
    pencil.rect(0, 0, 2, 10, "pencil")
    pencil.rect(0, 10, 2, 2, "wood")
    stamp(g, outlined(pencil, "line"), 28, 41)
    return { grid: g, label: "Pixel portrait placeholder: the designer with a sketchbook of the valley and a board of colour swatches", overlays: [] }
}

/** Community: the chautari under a pipal tree, two neighbours sitting on its stones. */
function community(): TeamScene {
    const g = new Grid(PORTRAIT_W, PORTRAIT_H)
    paintSky(g, 40)
    paintRange(g, [[10, 18, 1, 1], [40, 14, 1, 1]], 34, 22, { lit: "far", shade: "farShade", snow: "snow", snowShade: "snowShade" })
    paintHills(g, (x) => 30 + Math.round(Math.sin(x / 9)), 40, { lit: "hill", shade: "hillShade", hi: "hillHi" }, null)
    g.rect(0, 38, PORTRAIT_W, 18, "path")
    // The pipal tree: a broad crown in three greens, a thick trunk.
    const tree = new Grid(56, 34)
    for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 56; x++) {
            const d = ((x - 28) / 27) ** 2 + ((y - 11) / 11) ** 2
            if (d <= 1) tree.set(x, y, y < 7 || x > 34 ? (x > 30 ? "leafHi" : "leaf") : y > 15 ? "leafShade" : "leaf")
        }
    }
    tree.rect(25, 20, 6, 14, "trunk")
    tree.rect(25, 20, 2, 14, "woodShade")
    stamp(g, outlined(tree, "line"), -1, -2)
    // The chautari: two tiers of stone.
    const stone = new Grid(56, 8)
    stone.rect(0, 0, 56, 3, "stone")
    stone.rect(0, 0, 56, 1, "pathHi")
    stone.rect(0, 3, 56, 5, "stoneShade")
    for (let x = 3; x < 56; x += 7) stone.rect(x, 3, 1, 5, "rockShade")
    stamp(g, outlined(stone, "line"), -1, 40)
    stamp(g, STUDENT.a, -2, 41 - STUDENT.a.h + 2)
    stamp(g, ELDER.a, 42, 41 - ELDER.a.h + 2)
    placeBust(g, COMMUNITY)
    return { grid: g, label: "Pixel portrait placeholder: the community lead at a chautari under a pipal tree, with two neighbours", overlays: [] }
}

export const TEAM_SCENES = { founder: founder(), ml: mlEngineer(), designer: designer(), community: community() } as const
export type TeamRole = keyof typeof TEAM_SCENES
