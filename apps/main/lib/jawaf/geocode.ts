import "server-only"

/**
 * An address -> a map centre for the OpenStreetMap embed on /j/<slug>. OpenStreetMap's embed needs coordinates (a
 * bbox), so the business's PUBLIC address (from its approved facts, never a visitor's data) is looked up once with
 * Nominatim (usage policy: an identifying User-Agent, at most about one request a second, results cached). Cached per
 * isolate and, through fetch's cache, for a week. Any failure = null, and the card shows an "Open in map" link instead.
 */

export interface MapPoint {
    lat: number
    lon: number
}

const memo = new Map<string, MapPoint | null>()

export async function geocode(query: string): Promise<MapPoint | null> {
    const q = query.trim().slice(0, 200)
    if (!q) return null
    if (memo.has(q)) return memo.get(q) ?? null
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=np&q=${encodeURIComponent(q)}`
        const res = await fetch(url, {
            headers: { "User-Agent": "Boli-Jawaf/1.0 (business page map)", Accept: "application/json" },
            signal: AbortSignal.timeout(3000),
            cache: "force-cache",
            next: { revalidate: 7 * 24 * 60 * 60 },
        })
        if (!res.ok) return null
        const rows = (await res.json().catch(() => [])) as { lat?: string; lon?: string }[]
        const r = rows[0]
        const point = r && r.lat && r.lon ? { lat: Number(r.lat), lon: Number(r.lon) } : null
        const ok = point && Number.isFinite(point.lat) && Number.isFinite(point.lon) ? point : null
        if (memo.size > 500) memo.clear()
        memo.set(q, ok)
        return ok
    } catch {
        return null
    }
}

/** The OpenStreetMap embed URL around a point (about 1.2 km across) with a marker. */
export function osmEmbedUrl(p: MapPoint): string {
    const d = 0.006
    const bbox = [p.lon - d, p.lat - d * 0.6, p.lon + d, p.lat + d * 0.6].map((n) => n.toFixed(5)).join(",")
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${p.lat.toFixed(5)},${p.lon.toFixed(5)}`
}

/** A full map page for "Open in map" (works with or without coordinates). */
export function osmLink(query: string, p: MapPoint | null): string {
    return p
        ? `https://www.openstreetmap.org/?mlat=${p.lat.toFixed(5)}&mlon=${p.lon.toFixed(5)}#map=16/${p.lat.toFixed(5)}/${p.lon.toFixed(5)}`
        : `https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`
}
