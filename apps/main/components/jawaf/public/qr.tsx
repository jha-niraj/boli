import { encode } from "uqr"
import { SITE } from "@repo/core/site"

/**
 * Jawaf QR codes (plan/main/jawaf/jawaf-v1.md "ways in"): the poster, and the dashboard's Share page later. The code
 * always points at `<app>/j/<slug>?src=qr`, so a conversation started from paper is recorded with channel "qr".
 *
 * - `<JawafQr slug />`: an inline SVG (crisp at any print size; server or client).
 * - `jawafQrSvg(slug)`: the same as an SVG string (GET /j/<slug>/api/qr.svg).
 * - `jawafQrPng(slug, scale)`: a PNG (GET /j/<slug>/api/qr.png) - a tiny encoder over CompressionStream, no canvas.
 * Encoding by `uqr` (MIT, dependency-free). Error correction M: survives a smudge or a fold on a counter poster.
 */

export function jawafPublicUrl(slug: string): string {
    return `${SITE.url}/j/${slug}`
}

export function jawafQrUrl(slug: string): string {
    return `${jawafPublicUrl(slug)}?src=qr`
}

/** "app.bolihq.com/j/slug" - what the poster prints under the code. */
export function jawafShortLink(slug: string): string {
    return jawafPublicUrl(slug).replace(/^https?:\/\//, "")
}

function matrix(text: string): boolean[][] {
    return encode(text, { ecc: "M", border: 2 }).data
}

/** One path of 1x1 squares, run-length joined per row (small markup even for a long URL). */
function modulesPath(data: boolean[][]): string {
    let d = ""
    data.forEach((row, y) => {
        let x = 0
        while (x < row.length) {
            if (!row[x]) {
                x++
                continue
            }
            let w = 1
            while (row[x + w]) w++
            d += `M${x} ${y}h${w}v1h-${w}z`
            x += w
        }
    })
    return d
}

export function jawafQrSvg(slug: string, opts: { dark?: string; light?: string } = {}): string {
    const data = matrix(jawafQrUrl(slug))
    const n = data.length
    const dark = opts.dark ?? "#141414"
    const light = opts.light ?? "#ffffff"
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="${light}"/><path d="${modulesPath(data)}" fill="${dark}"/></svg>`
}

export function JawafQr({ slug, className, label }: { slug: string; className?: string; label?: string }) {
    const data = matrix(jawafQrUrl(slug))
    const n = data.length
    return (
        <svg viewBox={`0 0 ${n} ${n}`} shapeRendering="crispEdges" role="img" aria-label={label ?? `QR code for ${jawafShortLink(slug)}`} className={className}>
            <rect width={n} height={n} fill="#ffffff" />
            <path d={modulesPath(data)} fill="#141414" />
        </svg>
    )
}

// --- PNG ---------------------------------------------------------------------------------------------------------------

const CRC_TABLE = (() => {
    const t = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
        let c = n
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
        t[n] = c >>> 0
    }
    return t
})()

function crc32(bytes: Uint8Array): number {
    let c = 0xffffffff
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
}

function chunk(type: string, body: Uint8Array): Uint8Array {
    const out = new Uint8Array(12 + body.length)
    const view = new DataView(out.buffer)
    view.setUint32(0, body.length)
    for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
    out.set(body, 8)
    view.setUint32(8 + body.length, crc32(out.subarray(4, 8 + body.length)))
    return out
}

async function deflate(raw: Uint8Array): Promise<Uint8Array> {
    // "deflate" = zlib-wrapped, which is what a PNG IDAT holds.
    const stream = new Blob([raw.slice().buffer as ArrayBuffer]).stream().pipeThrough(new CompressionStream("deflate"))
    return new Uint8Array(await new Response(stream).arrayBuffer())
}

/** A 1-bit greyscale PNG of the QR code, `scale` pixels per module (default 16: about 600 px wide). */
export async function jawafQrPng(slug: string, scale = 16): Promise<Uint8Array> {
    const data = matrix(jawafQrUrl(slug))
    const n = data.length
    const size = n * scale
    const rowBytes = Math.ceil(size / 8)
    const raw = new Uint8Array((rowBytes + 1) * size)
    for (let y = 0; y < size; y++) {
        const off = y * (rowBytes + 1)
        raw[off] = 0 // filter: none
        const row = data[Math.floor(y / scale)]!
        for (let x = 0; x < size; x++) {
            // Bit 1 = white in greyscale; dark modules stay 0.
            if (!row[Math.floor(x / scale)]) {
                const i = off + 1 + (x >> 3)
                raw[i] = (raw[i] ?? 0) | (0x80 >> (x & 7))
            }
        }
    }
    const ihdr = new Uint8Array(13)
    const v = new DataView(ihdr.buffer)
    v.setUint32(0, size)
    v.setUint32(4, size)
    ihdr[8] = 1 // bit depth
    ihdr[9] = 0 // greyscale
    const idat = await deflate(raw)
    const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
    const parts = [sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", new Uint8Array(0))]
    const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0))
    let at = 0
    for (const p of parts) {
        out.set(p, at)
        at += p.length
    }
    return out
}
