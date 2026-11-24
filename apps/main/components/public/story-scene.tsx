"use client"

import { useOnView } from "@/components/art/story/on-view"
import { PixelReveal } from "@/components/art/story/reveal"
import { STORY_SCENES } from "@/components/art/story/scenes"
import { VALLEY_DAY } from "@/components/art/valley/palette"

/**
 * One PS1 story scene by index (0 the gap, 1 models need running, 2 Boli runs them, 3 anyone builds), revealed row by
 * row when it scrolls into view. The scenes are built in the client module itself - grids cannot cross the server
 * boundary as props. Finished at once under prefers-reduced-motion (art.css). Wrap it in ArtRoot.
 */
export function StoryScene({ index, className }: { index: 0 | 1 | 2 | 3; className?: string }) {
    const [ref, on] = useOnView<HTMLDivElement>()
    const scene = STORY_SCENES[index]
    return (
        <div ref={ref} className={className}>
            {scene ? <PixelReveal scene={scene} palette={VALLEY_DAY} on={on} className="block aspect-[96/60] w-full" /> : null}
        </div>
    )
}
