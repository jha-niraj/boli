"use client"

import { BoliErrorView } from "@repo/brand/status/error-view"
import { ROUTES } from "@/lib/navigation"

/** Inside the shell: Boli's St2 screen in the page area; a transient blip is retried once by itself (classifyError). */
export default function ConsoleError(props: { error: Error & { digest?: string }; reset: () => void }) {
    return <BoliErrorView {...props} homeHref={ROUTES.home} />
}
