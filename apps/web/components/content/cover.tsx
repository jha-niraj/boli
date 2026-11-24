import { ArtRoot } from "@repo/brand/art/art-root"
import { PixelCover } from "@repo/brand/art/covers/cover"
import { cn } from "@repo/ui/lib/utils"
import type { CoverName } from "@/lib/content-shared"

/**
 * A post's or a guide's pixel cover in its frame: 16:10, a hairline, rounded, white behind the art. The art is SVG with
 * crisp edges, so the same drawing is sharp in a card and at the top of the post. `decorative` hides it from screen
 * readers where the title next to it already says everything (cards).
 */
export function Cover({ name, className, rounded = "rounded-2xl", decorative }: { name: CoverName | undefined; className?: string; rounded?: string; decorative?: boolean }) {
    return (
        <ArtRoot className={cn("relative min-w-0 overflow-hidden border border-boli-line bg-white", rounded, className)}>
            <div className="relative w-full" style={{ aspectRatio: "96 / 60" }} aria-hidden={decorative || undefined}>
                <div className="absolute inset-0 [&>svg]:block [&>svg]:h-full [&>svg]:w-full">
                    <PixelCover id={name ?? "dhaka"} />
                </div>
            </div>
        </ArtRoot>
    )
}
