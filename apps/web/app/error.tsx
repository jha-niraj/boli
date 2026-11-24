"use client"

import { BoliErrorView } from "@repo/brand/status/error-view"
import { ROUTES } from "@/lib/routes"

/** Root error boundary (St2): classifyError decides the copy; a transient blip retries once by itself. */
export default function RootError(props: { error: Error & { digest?: string }; reset: () => void }) {
    return <BoliErrorView {...props} fullScreen homeHref={ROUTES.landing} />
}
