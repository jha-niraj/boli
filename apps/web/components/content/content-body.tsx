import { BODIES } from "@/content/generated/bodies"
import type { ContentEntry } from "@/lib/content-shared"
import { MDX_COMPONENTS } from "@/mdx-components"

/** An entry's MDX body, compiled at build by @next/mdx and loaded through content/generated/bodies.ts. */
export async function ContentBody({ entry }: { entry: ContentEntry }) {
    const load = BODIES[`${entry.kind}/${entry.slug}`]
    if (!load) return null
    const { default: Body } = await load()
    return <Body components={MDX_COMPONENTS} />
}
