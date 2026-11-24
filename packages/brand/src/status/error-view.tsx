"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowLeft, RotateCcw } from "lucide-react"
import { classifyError } from "@repo/errors"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "../loaders/spinners"
import { BoliStatus } from "./status-screen"
import { CurrentPath } from "./current-path"

/**
 * Boli's error boundary view (each app's AppErrorView; shared by main and web): St2, the hot laptop, with Try again and Go home.
 *
 *   - classifyError (@repo/errors) decides the copy; the raw message is never shown (it can hold SQL).
 *   - A transient `network` error says "Reconnecting..." and retries ONCE by itself (a warm compute usually answers).
 *   - `forbidden` draws St3 (the pasal shutter), `notfound` St1a (the porter) - the scene says what happened.
 *   - Next's digest is shown as the reference to quote.
 *
 * `fullScreen` for the root and global boundaries (outside the shell); inside the shell it fills the page area.
 */
export function BoliErrorView({ error, reset, fullScreen = false, homeHref = "/" }: {
    error: Error & { digest?: string }
    reset: () => void
    fullScreen?: boolean
    /** Where Go home leads: Kura in the app, the landing on the site. */
    homeHref?: string
}) {
    // classifyError may re-throw Next control flow; guard so the boundary itself never crashes while rendering.
    let kind = "unknown"
    let safeMessage = "Our server tripped while loading this. It was not something you did - try again in a moment."
    try {
        const c = classifyError(error)
        kind = c.kind
        safeMessage = c.userMessage
    } catch {
        // Not ours to classify - the generic copy stands.
    }
    const transient = kind === "network"

    const [retrying, setRetrying] = useState(transient)
    const autoRetried = useRef(false)

    useEffect(() => {
        console.error("[BoliErrorView]", error)
    }, [error])

    useEffect(() => {
        if (!transient || autoRetried.current) return
        autoRetried.current = true
        const t = setTimeout(() => reset(), 1200)
        return () => clearTimeout(t)
    }, [transient, reset])

    function retry() {
        setRetrying(true)
        reset()
    }

    const home = (
        <Button asChild variant="outline" className="h-10 cursor-pointer gap-2 px-5">
            <AppLink href={homeHref}><ArrowLeft className="h-4 w-4" /> Go home</AppLink>
        </Button>
    )

    if (kind === "forbidden") {
        return <BoliStatus kind="forbidden" fullScreen={fullScreen} path={<CurrentPath />} description={safeMessage} actions={home} />
    }
    if (kind === "notfound") {
        return <BoliStatus kind="not-found" fullScreen={fullScreen} path={<CurrentPath />} actions={home} />
    }

    return (
        <BoliStatus
            kind="error"
            fullScreen={fullScreen}
            title={transient ? "Reconnecting..." : undefined}
            description={transient ? "We had trouble reaching the server for a moment. This usually clears up on its own - retrying now." : safeMessage}
            path={<CurrentPath />}
            digest={error.digest}
            actions={(
                <>
                    <Button type="button" onClick={retry} disabled={retrying} className="h-10 cursor-pointer gap-2 px-5">
                        {retrying ? <InlineLoader size={14} label="Retrying" /> : <RotateCcw className="h-4 w-4" />}
                        {retrying ? "Retrying..." : "Try again"}
                    </Button>
                    {home}
                </>
            )}
        />
    )
}
