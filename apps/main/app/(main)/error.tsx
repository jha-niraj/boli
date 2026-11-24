"use client"

import { BoliErrorView } from "@/components/status/error-view"

/** Inside the shell (St2, the hot laptop): classifyError decides the copy; a transient blip retries once by itself. */
export default function AppError(props: { error: Error & { digest?: string }; reset: () => void }) {
    return <BoliErrorView {...props} />
}
