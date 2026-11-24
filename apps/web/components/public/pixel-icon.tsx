import { cn } from "@repo/ui/lib/utils"
import { SKY } from "@repo/brand/sky"
import { PIXEL_ICONS, type PixelIconId } from "./pixel-icon-sprites"

/*
 * A 12 x 12 pixel icon (pixel-icon-sprites.ts) as crisp SVG: each row's same-colour runs become one rect. Server
 * component, no motion. Decorative by default (the words beside it carry the meaning).
 */

const FILL: Readonly<Record<string, string>> = { "#": "#141414", l: SKY.soft, s: SKY.fill, g: "#e8a33d" }

export function PixelIcon({ id, className }: { id: PixelIconId; className?: string }) {
    const rows = PIXEL_ICONS[id]
    const rects: { x: number; y: number; w: number; fill: string }[] = []
    rows.forEach((row, y) => {
        let x = 0
        while (x < row.length) {
            const ch = row[x] ?? "."
            const fill = FILL[ch]
            if (!fill) {
                x++
                continue
            }
            let end = x + 1
            while (row[end] === ch) end++
            rects.push({ x, y, w: end - x, fill })
            x = end
        }
    })
    return (
        <svg aria-hidden viewBox="0 0 12 12" shapeRendering="crispEdges" className={cn("block size-6 shrink-0", className)}>
            {rects.map((r) => (
                <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
            ))}
        </svg>
    )
}

/** The icon on a white tile with a hairline, the size of the landing's icon tiles. */
export function PixelIconTile({ id, className }: { id: PixelIconId; className?: string }) {
    return (
        <span className={cn("inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-boli-line", className)}>
            <PixelIcon id={id} className="size-7" />
        </span>
    )
}
