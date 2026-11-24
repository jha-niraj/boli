"use client"

import { BoliErrorView } from "@repo/brand/status/error-view"
import { ROUTES } from "@/lib/navigation"

/** Root error boundary (outside the shell): Boli's St2 screen; classifyError decides the copy, a blip retries once. */
export default function RootError(props: { error: Error & { digest?: string }; reset: () => void }) {
    return <BoliErrorView {...props} fullScreen homeHref={ROUTES.signIn} />
}
