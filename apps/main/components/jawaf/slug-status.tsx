"use client"

import { useQuery } from "@tanstack/react-query"
import { Check, Loader2, X } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { useDebounce } from "@repo/ui/hooks/use-debounce"
import { JAWAF_SLUG_PATTERN } from "@repo/boli/jawaf"
import { checkJawafSlug } from "@/actions/jawaf/bots.action"
import { unwrap } from "./keys"
import { jawafPublicLabel } from "./public-link"

/** Live availability of `app.bolihq.com/j/<slug>` (debounced; the server is the judge). */
export function SlugStatus({ slug, onUse, botId, current }: { slug: string; onUse: (s: string) => void; botId?: string; current?: string }) {
    const debounced = useDebounce(slug, 400)
    const valid = JAWAF_SLUG_PATTERN.test(debounced)
    const check = useQuery({
        queryKey: ["jawaf", "slug", debounced, botId ?? ""],
        queryFn: async () => unwrap(await checkJawafSlug(debounced, botId)),
        enabled: valid && debounced !== current,
        staleTime: 10_000,
    })
    if (!slug || slug === current) return null
    if (!JAWAF_SLUG_PATTERN.test(slug)) return <p className="text-xs text-neutral-600 dark:text-neutral-400">Use 3-40 lower-case letters, numbers and single hyphens.</p>
    if (slug !== debounced || check.isFetching) return <p className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400"><Loader2 className="h-3 w-3 animate-spin" /> Checking...</p>
    if (check.isError) return <p className="text-xs text-neutral-600 dark:text-neutral-400">Could not check right now. We check again when you finish.</p>
    if (!check.data) return null
    if (check.data.available) return <p className="flex items-center gap-1.5 text-xs text-neutral-700 dark:text-neutral-300"><Check className="h-3.5 w-3.5 text-boli-sky-ink" /> {jawafPublicLabel(slug)} is free</p>
    return (
        <p className="flex flex-wrap items-center gap-1.5 text-xs text-neutral-700 dark:text-neutral-300">
            <X className="h-3.5 w-3.5 text-red-700 dark:text-red-400" />
            {check.data.reason === "reserved" ? "That name is reserved." : "That name is taken."}
            {check.data.suggestion ? (
                <Button type="button" variant="link" size="sm" className="h-auto cursor-pointer p-0 text-xs text-boli-sky-ink" onClick={() => onUse(check.data!.suggestion!)}>
                    Use {check.data.suggestion}
                </Button>
            ) : null}
        </p>
    )
}

