"use client"

import { BoliErrorView } from "@repo/brand/status/error-view"
import { ROUTES } from "@/lib/navigation"

/** Root error boundary (St2, outside the shell): classifyError decides the copy; a transient blip retries once by itself. */
export default function RootError(props: { error: Error & { digest?: string }; reset: () => void }) {
    return <BoliErrorView {...props} fullScreen homeHref={ROUTES.home} />
}
