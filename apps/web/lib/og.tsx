import { ImageResponse } from "next/og"
import { SITE } from "@repo/core/site"
import { COVERS, COVER_H, COVER_W, type CoverSceneId } from "@repo/brand/art/covers/scenes"
import { DHAKA } from "@repo/brand/art/dhaka/pattern"
import type { Grid } from "@repo/brand/art/pixel/grid"
import { VALLEY } from "@repo/brand/art/valley/palette"
import { VIGNETTES, type VignetteId } from "@repo/brand/art/vignettes/scenes"
import type { CoverName } from "./content-shared"

/**
 * The shared 1200 x 630 Open Graph card (learned from gurukulhq's lib/og.tsx), rendered with ImageResponse (Satori):
 * Boli's warm ground, the title in ink, a sky kicker, and the page's own pixel cover on the right - so every shared
 * link shows a different picture. Every route that uses it is prerendered at build (static params), so a card is a
 * static asset on the Worker, not a render per request.
 *
 * The pixel art is drawn as a plain SVG string (Satori cannot run the React art components: CSS classes and custom
 * properties), first animation frame only. No custom font: Satori cannot see next/font, and reading font files at
 * request time is not possible on a Worker.
 */

export const OG_SIZE = { width: 1200, height: 630 }
export const OG_CONTENT_TYPE = "image/png"

const INK = "#141414"
const GROUND = "#f7f5f3"
const LINE = "#e6e1db"
const SKY_INK = "#1d64a3"
const MUTED = "#6b6560"
const CRIMSON = "#c8102e"

type Layer = { grid: Grid; x: number; y: number; half?: boolean }

function layersOf(name: CoverName): { w: number; h: number; layers: Layer[]; palette: Record<string, string> } {
    const dhaka = { dhakaBg: DHAKA.classic.bg ?? "", dhakaC1: DHAKA.classic.c1 ?? "", dhakaC2: DHAKA.classic.c2 ?? "", dhakaC3: DHAKA.classic.c3 ?? "", dhakaC4: DHAKA.classic.c4 ?? "" }
    if (name in COVERS) {
        const c = COVERS[name as CoverSceneId]
        const layers: Layer[] = [{ grid: c.grid, x: 0, y: 0 }]
        for (const o of c.overlays) {
            if (o.kind === "frames") layers.push({ grid: o.pair.a, x: o.x, y: o.y })
            else if (o.kind === "bubble") layers.push({ grid: o.b.text, x: o.x, y: o.y, half: true })
            else if (o.kind === "half") layers.push({ grid: o.grid, x: o.x, y: o.y, half: true })
            else if (o.kind === "blink") layers.push({ grid: o.grid, x: o.x, y: o.y, half: o.half })
            else layers.push({ grid: o.grid, x: o.x, y: o.y })
        }
        return { w: COVER_W, h: COVER_H, layers, palette: { ...VALLEY[c.variant], ...dhaka } }
    }
    const v = VIGNETTES[name as VignetteId]
    const layers: Layer[] = [{ grid: v.grid, x: 0, y: 0 }]
    for (const o of v.overlays) {
        if (o.kind === "frames") layers.push({ grid: o.pair.a, x: o.x, y: o.y })
        else if (o.kind === "bubble") layers.push({ grid: o.b.text, x: o.x, y: o.y, half: true })
        else if (o.kind === "half") layers.push({ grid: o.grid, x: o.x, y: o.y, half: true })
        else if (o.kind === "blink") layers.push({ grid: o.grid, x: o.x, y: o.y, half: o.half })
        else layers.push({ grid: o.grid, x: o.x, y: o.y })
    }
    return { w: v.w, h: v.h, layers, palette: { ...VALLEY.day } }
}

/** The cover as an SVG data URI (crisp edges), for an <img> inside the card. */
export function coverDataUri(name: CoverName): string {
    const { w, h, layers, palette } = layersOf(name)
    const body = layers
        .map((l) => {
            const paths = l.grid
                .paths()
                .map(([key, d]) => `<path d="${d}" fill="${palette[key] ?? "transparent"}"/>`)
                .join("")
            return `<g transform="translate(${l.x} ${l.y})${l.half ? " scale(0.5)" : ""}">${paths}</g>`
        })
        .join("")
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * 6}" height="${h * 6}" shape-rendering="crispEdges">${body}</svg>`
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`
}

const DOMAIN = SITE.url.replace(/^https?:\/\//, "")

export function ogImage({ title, kicker, footer, cover }: { title: string; kicker?: string; footer?: string; cover: CoverName }): ImageResponse {
    const size = title.length > 70 ? 46 : title.length > 44 ? 54 : 62
    return new ImageResponse(
        (
            <div style={{ width: "100%", height: "100%", display: "flex", background: GROUND, color: INK, padding: 56, gap: 48, alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 40, fontWeight: 500, letterSpacing: "-0.02em" }}>
                        Boli
                        <div style={{ width: 11, height: 11, borderRadius: 11, background: CRIMSON, marginTop: 14 }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                        {kicker ? <div style={{ display: "flex", fontSize: 24, color: SKY_INK }}>{kicker}</div> : null}
                        <div style={{ display: "flex", fontSize: size, lineHeight: 1.08, letterSpacing: "-0.02em" }}>{title}</div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: MUTED }}>
                        <div style={{ display: "flex" }}>{footer ?? "Open AI for Nepal"}</div>
                    </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14, width: 540 }}>
                    <div style={{ display: "flex", borderRadius: 28, overflow: "hidden", border: `2px solid ${LINE}`, width: 540, height: 338 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={coverDataUri(cover)} width={540} height={338} alt="" style={{ objectFit: "cover" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", fontSize: 20, color: MUTED }}>{DOMAIN}</div>
                </div>
            </div>
        ),
        OG_SIZE,
    )
}
