/**
 * Generates the pixel-art Nepal scene behind `packages/brand/src/pixel-himalaya.tsx`.
 *
 *   node apps/main/scripts/pixel-himalaya.mts
 *
 * Deterministic (seeded PRNG): the same seed always writes the same file, so the output can be reviewed in a diff.
 * It paints a grid of colour keys (sky steps, peaks with snow, forest hills, a Boudhanath-like stupa with prayer flags,
 * a pagoda and Kathmandu rooftops, terraced fields), merges same-colour pixels into rectangles and writes one compact
 * SVG path per colour to `packages/brand/src/pixel-himalaya-data.ts`. The component only renders those paths.
 */
import { writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

type Color =
    | "skyDeep" | "sky" | "haze" | "ground" | "snow" | "rockDeep" | "rock" | "rockSoft"
    | "pineDeep" | "pine" | "field" | "fieldSoft" | "earth" | "brick" | "wood" | "gold"
    | "ink" | "crimson" | "blue" | "sand"

/** Tailwind classes from app/boli.css - written out in full so Tailwind sees them in the generated file. */
const CLASS: Record<Color, string> = {
    skyDeep: "fill-boli-sky-deep",
    sky: "fill-boli-sky",
    haze: "fill-boli-haze",
    ground: "fill-boli-ground",
    snow: "fill-boli-snow",
    rockDeep: "fill-boli-rock-deep",
    rock: "fill-boli-rock",
    rockSoft: "fill-boli-rock-soft",
    pineDeep: "fill-boli-pine-deep",
    pine: "fill-boli-pine",
    field: "fill-boli-field",
    fieldSoft: "fill-boli-field-soft",
    earth: "fill-boli-earth",
    brick: "fill-boli-brick",
    wood: "fill-boli-wood",
    gold: "fill-boli-gold",
    ink: "fill-boli-ink",
    crimson: "fill-boli-crimson",
    blue: "fill-boli-blue",
    sand: "fill-boli-sand",
}

/** Paint order of the output paths (back to front does not matter: each pixel has exactly one colour). */
const ORDER = Object.keys(CLASS) as Color[]

function mulberry32(seed: number) {
    let a = seed >>> 0
    return () => {
        a = (a + 0x6d2b79f5) >>> 0
        let t = a
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

type Scene = {
    w: number
    h: number
    seed: number
    /** Row (0 = top) where the far peaks may reach; smaller = taller mountains. */
    peakTop: number
    /** Row of the city's ground line. */
    cityBase: number
    /** Row where terraces start (to the bottom). */
    terraceTop: number
    /** Stupa centre column, or null for none. */
    stupaX: number | null
    stupaR: number
    pagodaX: number | null
    /** Draw the sky (the strip variant leaves it transparent). */
    sky: boolean
}

class Grid {
    cells: (Color | null)[]
    w: number
    h: number
    constructor(w: number, h: number) {
        this.w = w
        this.h = h
        this.cells = new Array(w * h).fill(null)
    }
    set(x: number, y: number, c: Color) {
        if (x < 0 || y < 0 || x >= this.w || y >= this.h) return
        this.cells[y * this.w + x] = c
    }
    get(x: number, y: number): Color | null {
        if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null
        return this.cells[y * this.w + x] ?? null
    }
    rect(x: number, y: number, w: number, h: number, c: Color) {
        for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c)
    }
    /** Fill column x from row y downward to `to` (exclusive). */
    column(x: number, y: number, to: number, c: Color) {
        for (let j = Math.max(0, y); j < Math.min(this.h, to); j++) this.set(x, j, c)
    }
}

/** A ridge line: smooth noise from summed sines with seeded phases, plus a few sharp peaks. */
function ridge(rand: () => number, w: number, base: number, amp: number, peaks: number, sharp: number): number[] {
    const p1 = rand() * Math.PI * 2
    const p2 = rand() * Math.PI * 2
    const centres = Array.from({ length: peaks }, (_, i) => ((i + 0.5 + (rand() - 0.5) * 0.6) / peaks) * w)
    const heights = centres.map(() => 0.55 + rand() * 0.45)
    const out: number[] = []
    for (let x = 0; x < w; x++) {
        let lift = 0
        centres.forEach((c, i) => {
            const d = Math.abs(x - c) / (w / peaks)
            lift = Math.max(lift, (heights[i] ?? 1) * Math.max(0, 1 - d * sharp))
        })
        const wobble = Math.sin(x * 0.21 + p1) * 0.06 + Math.sin(x * 0.53 + p2) * 0.03
        out.push(Math.round(base - amp * (lift + wobble)))
    }
    return out
}

function paintSky(g: Grid, s: Scene) {
    const bands: Color[] = ["skyDeep", "sky", "sky", "haze"]
    const bandH = Math.ceil(s.cityBase / bands.length)
    for (let y = 0; y < s.cityBase; y++) {
        const i = Math.min(bands.length - 1, Math.floor(y / bandH))
        const next = bands[Math.min(bands.length - 1, i + 1)] as Color
        const inBand = y - i * bandH
        for (let x = 0; x < g.w; x++) {
            // One dithered row at each band edge (every other pixel), the classic pixel gradient.
            const edge = inBand === bandH - 1 && x % 2 === y % 2
            g.set(x, y, edge ? next : (bands[i] as Color))
        }
    }
}

function paintClouds(g: Grid, rand: () => number, s: Scene) {
    const count = Math.max(1, Math.round(g.w / 60))
    for (let k = 0; k < count; k++) {
        const cx = Math.floor(rand() * (g.w - 16)) + 4
        const cy = Math.floor(s.peakTop * 0.35 + rand() * s.peakTop * 0.4)
        const len = 6 + Math.floor(rand() * 8)
        g.rect(cx, cy, len, 1, "snow")
        g.rect(cx + 2, cy - 1, Math.max(2, len - 5), 1, "snow")
        g.rect(cx - 2, cy + 1, len + 4, 1, "snow")
    }
}

/** Which flank of a ridge x sits on, over a 3-pixel window: -1 rising (sunlit, left), 1 falling (shadow, right). */
function flank(line: number[], x: number): number {
    const l = line[Math.max(0, x - 3)] ?? 0
    const r = line[Math.min(line.length - 1, x + 3)] ?? 0
    return r > l ? 1 : -1
}

function paintMountains(g: Grid, rand: () => number, s: Scene) {
    const far = ridge(rand, g.w, s.cityBase - 6, s.cityBase - 6 - s.peakTop, Math.max(2, Math.round(g.w / 45)), 1.15)
    const near = ridge(rand, g.w, s.cityBase - 2, (s.cityBase - s.peakTop) * 0.55, Math.max(2, Math.round(g.w / 35)), 1.3)
    const farTop = Math.min(...far)
    const snowLine = farTop + Math.round((s.cityBase - farTop) * 0.38)
    for (let x = 0; x < g.w; x++) {
        const top = far[x] ?? s.cityBase
        const shadow = flank(far, x) > 0
        const jag = Math.floor(rand() * 3)
        for (let y = top; y < s.cityBase; y++) {
            const snowy = y < snowLine + jag
            g.set(x, y, snowy ? (shadow ? "haze" : "snow") : shadow ? "rock" : "rockSoft")
        }
    }
    const nearTop = Math.min(...near)
    const nearSnow = nearTop + 3
    for (let x = 0; x < g.w; x++) {
        const top = near[x] ?? s.cityBase
        const shadow = flank(near, x) > 0
        const jag = Math.floor(rand() * 2)
        for (let y = top; y < s.cityBase + 2; y++) {
            g.set(x, y, y < nearSnow + jag ? (shadow ? "haze" : "snow") : shadow ? "rockDeep" : "rock")
        }
    }
}

function paintHills(g: Grid, rand: () => number, s: Scene) {
    const hills = ridge(rand, g.w, s.cityBase + 2, 6, Math.max(3, Math.round(g.w / 25)), 0.9)
    for (let x = 0; x < g.w; x++) {
        const top = hills[x] ?? s.cityBase
        for (let y = top; y < s.terraceTop; y++) g.set(x, y, y < top + 2 ? "pineDeep" : "pine")
        // Pine trees: little triangles on the hill line.
        if (rand() < 0.18) {
            g.set(x, top - 1, "pineDeep")
            g.set(x, top - 2, "pineDeep")
        }
    }
}

function paintHouse(g: Grid, x: number, base: number, w: number, h: number, rand: () => number) {
    g.rect(x, base - h, w, h, rand() < 0.75 ? "brick" : "sand")
    // Sloped roof of wood, one step overhang.
    g.rect(x - 1, base - h - 1, w + 2, 1, "wood")
    g.rect(x, base - h - 2, w, 1, "wood")
    for (let wy = base - h + 1; wy < base - 1; wy += 3) {
        for (let wx = x + 1; wx < x + w - 1; wx += 2) if (rand() < 0.7) g.set(wx, wy, "wood")
    }
}

function paintCity(g: Grid, rand: () => number, s: Scene) {
    const base = s.terraceTop
    let x = 0
    while (x < g.w) {
        const w = 4 + Math.floor(rand() * 4)
        const h = 3 + Math.floor(rand() * 5)
        paintHouse(g, x + 1, base, w, h, rand)
        x += w + 1 + Math.floor(rand() * 3)
    }
}

/** A Nepali pagoda: plinth steps, three tiered roofs, a gold finial. */
function paintPagoda(g: Grid, cx: number, base: number) {
    g.rect(cx - 7, base - 2, 15, 2, "sand")
    g.rect(cx - 6, base - 3, 13, 1, "sand")
    const tiers = [
        { w: 13, body: 4 },
        { w: 9, body: 3 },
        { w: 5, body: 3 },
    ]
    let y = base - 3
    for (const t of tiers) {
        const bodyW = t.w - 4
        g.rect(cx - Math.floor(bodyW / 2), y - t.body, bodyW, t.body, "brick")
        g.rect(cx - Math.floor(bodyW / 2) + 1, y - t.body + 1, 1, t.body - 1, "wood")
        g.rect(cx + Math.floor(bodyW / 2) - 1, y - t.body + 1, 1, t.body - 1, "wood")
        y -= t.body
        // Roof: wide, upturned eaves.
        g.rect(cx - Math.floor(t.w / 2), y - 1, t.w, 1, "wood")
        g.rect(cx - Math.floor(t.w / 2) + 1, y - 2, t.w - 2, 1, "wood")
        g.set(cx - Math.floor(t.w / 2) - 1, y - 2, "wood")
        g.set(cx + Math.floor(t.w / 2) + 1, y - 2, "wood")
        y -= 2
    }
    g.rect(cx, y - 3, 1, 3, "gold")
    g.rect(cx - 1, y - 1, 3, 1, "gold")
}

/** Boudhanath-like stupa: stepped white plinth, white dome, gold harmika with the eyes, a stepped gold spire. */
function paintStupa(g: Grid, cx: number, base: number, r: number) {
    g.rect(cx - r - 4, base - 2, 2 * r + 9, 2, "snow")
    g.rect(cx - r - 2, base - 3, 2 * r + 5, 1, "haze")
    g.rect(cx - r - 1, base - 4, 2 * r + 3, 1, "snow")
    const domeBase = base - 4
    for (let dx = -r; dx <= r; dx++) {
        const hh = Math.round(Math.sqrt(r * r - dx * dx) * 0.85)
        for (let j = 0; j < hh; j++) g.set(cx + dx, domeBase - 1 - j, dx > r * 0.35 ? "haze" : "snow")
    }
    const domeTop = domeBase - Math.round(r * 0.85)
    // Harmika (square tower) with the eyes and the nose.
    const hw = Math.max(5, Math.round(r * 0.75)) | 1
    const hx = cx - Math.floor(hw / 2)
    g.rect(hx, domeTop - 4, hw, 4, "gold")
    g.set(cx - 2, domeTop - 3, "ink")
    g.set(cx - 1, domeTop - 3, "ink")
    g.set(cx + 1, domeTop - 3, "ink")
    g.set(cx + 2, domeTop - 3, "ink")
    g.set(cx - 2, domeTop - 4, "blue")
    g.set(cx + 2, domeTop - 4, "blue")
    g.set(cx, domeTop - 2, "ink")
    // Spire: thirteen steps in the real one; a stepped triangle here.
    const spireH = Math.max(6, Math.round(r * 1.1))
    for (let j = 0; j < spireH; j++) {
        const half = Math.max(0, Math.floor(((spireH - j) / spireH) * (hw / 2)))
        g.rect(cx - half, domeTop - 5 - j, 2 * half + 1, 1, j % 2 === 0 ? "gold" : "earth")
    }
    const tip = domeTop - 5 - spireH
    g.rect(cx, tip - 2, 1, 2, "gold")
    // Prayer flags: strings from the tip down to both sides, five colours repeating.
    const flags: Color[] = ["blue", "snow", "crimson", "field", "gold"]
    for (const side of [-1, 1]) {
        const len = r * 3 + 8
        for (let i = 2; i < len; i++) {
            const x = cx + side * i
            const y = tip + Math.round(i * 0.55 + (i * i) / (len * 4))
            if (y >= base - 4) break
            if (i % 2 === 0) {
                const c = flags[(i / 2 + (side > 0 ? 2 : 0)) % flags.length] as Color
                g.set(x, y, c)
                g.set(x, y + 1, c)
            } else {
                g.set(x, y, "rockDeep")
            }
        }
    }
}

function paintTerraces(g: Grid, rand: () => number, s: Scene) {
    // Band boundaries (rows below terraceTop), then each pixel finds its band after a gentle sideways curve.
    const edges: number[] = [0]
    while ((edges[edges.length - 1] ?? 0) < g.h + 4) edges.push((edges[edges.length - 1] ?? 0) + 2 + Math.floor(rand() * 3))
    const phase = rand() * Math.PI * 2
    for (let x = 0; x < g.w; x++) {
        const curve = Math.round(Math.sin(x * 0.045 + phase) * 1.5)
        for (let y = s.terraceTop; y < g.h; y++) {
            const local = y - s.terraceTop - curve + 2
            let k = 0
            while (k < edges.length - 1 && (edges[k + 1] ?? 0) <= local) k++
            const first = local === (edges[k] ?? -1)
            g.set(x, y, first ? "earth" : k % 2 === 0 ? "field" : "fieldSoft")
        }
    }
}

function paint(s: Scene): Grid {
    const g = new Grid(s.w, s.h)
    const rand = mulberry32(s.seed)
    if (s.sky) {
        paintSky(g, s)
        paintClouds(g, rand, s)
    }
    paintMountains(g, rand, s)
    paintHills(g, rand, s)
    paintCity(g, rand, s)
    if (s.pagodaX !== null) paintPagoda(g, s.pagodaX, s.terraceTop)
    if (s.stupaX !== null) paintStupa(g, s.stupaX, s.terraceTop, s.stupaR)
    paintTerraces(g, rand, s)
    return g
}

/** Merge each colour's pixels into rectangles (row runs, extended downward while the run repeats) -> one path each. */
function toPaths(g: Grid): [string, string][] {
    const out: [string, string][] = []
    for (const color of ORDER) {
        type Rect = { x: number; y: number; w: number; h: number }
        const done: Rect[] = []
        let open = new Map<string, Rect>()
        for (let y = 0; y < g.h; y++) {
            const next = new Map<string, Rect>()
            let x = 0
            while (x < g.w) {
                if (g.get(x, y) !== color) {
                    x++
                    continue
                }
                const start = x
                while (x < g.w && g.get(x, y) === color) x++
                const key = `${start}:${x - start}`
                const prev = open.get(key)
                if (prev) {
                    prev.h++
                    next.set(key, prev)
                    open.delete(key)
                } else {
                    next.set(key, { x: start, y, w: x - start, h: 1 })
                }
            }
            for (const r of open.values()) done.push(r)
            open = next
        }
        for (const r of open.values()) done.push(r)
        if (!done.length) continue
        const d = done.map((r) => `M${r.x} ${r.y}h${r.w}v${r.h}h-${r.w}z`).join("")
        out.push([CLASS[color], d])
    }
    return out
}

const SCENES: Record<"panel" | "hero" | "strip", Scene> = {
    panel: { w: 84, h: 126, seed: 2081, peakTop: 26, cityBase: 78, terraceTop: 96, stupaX: 50, stupaR: 9, pagodaX: 18, sky: true },
    hero: { w: 200, h: 72, seed: 1951, peakTop: 6, cityBase: 44, terraceTop: 58, stupaX: 128, stupaR: 8, pagodaX: 62, sky: true },
    strip: { w: 200, h: 34, seed: 2015, peakTop: 2, cityBase: 16, terraceTop: 26, stupaX: 150, stupaR: 5, pagodaX: 48, sky: false },
}

const lines: string[] = [
    "// GENERATED by apps/main/scripts/pixel-himalaya.mts - do not edit by hand. Re-run: node apps/main/scripts/pixel-himalaya.mts",
    "",
    "export type PixelScene = { w: number; h: number; layers: readonly (readonly [className: string, d: string])[] }",
    "",
    "export const PIXEL_SCENES = {",
]
for (const [name, scene] of Object.entries(SCENES)) {
    const layers = toPaths(paint(scene))
    lines.push(`    ${name}: {`, `        w: ${scene.w},`, `        h: ${scene.h},`, "        layers: [")
    for (const [cls, d] of layers) lines.push(`            ["${cls}", "${d}"],`)
    lines.push("        ],", "    },")
}
lines.push("} as const satisfies Record<\"panel\" | \"hero\" | \"strip\", PixelScene>", "")

if (process.env.PREVIEW) {
    const dump = Object.fromEntries(Object.entries(SCENES).map(([n, sc]) => [n, { w: sc.w, h: sc.h, cells: paint(sc).cells }]))
    writeFileSync(process.env.PREVIEW, JSON.stringify(dump))
}

const here = dirname(fileURLToPath(import.meta.url))
const target = resolve(here, "../src/pixel-himalaya-data.ts")
writeFileSync(target, lines.join("\n"))
console.log(`wrote ${target} (${lines.join("\n").length} bytes)`)
