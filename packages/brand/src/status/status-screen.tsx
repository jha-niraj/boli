import type { ReactNode } from "react"
import { cn } from "@repo/ui/lib/utils"
import { ForkScene, HotLaptopScene, PasalScene, RestingScene } from "../art/status/scenes"
import { BoliLogo } from "../boli-logo"
import { serif } from "../type"

/*
 * Boli's status screens (owner picks, 2026-11-24, /design Status St1a / St2 / St3 / St4) - this app's StatusView. A
 * pixel scene, a mono eyebrow with the code, a Fraunces title, one line, the asked-for path, then the actions the page
 * passes in. Light and dark; on a phone the scene sits on top and the actions stack full width. The admin app keeps
 * @repo/ui's StatusView.
 *
 *   not-found  St1a  the porter with his doko at a fork: "This page wandered off"
 *   error      St2   the hot laptop between two fans: "Something broke on our side" (a true error: the crimson dot)
 *   forbidden  St3   the pasal with its shutter down: "Not your door"
 *   resting    St4   the Boli house asleep at night: "The model is resting"
 */

export type BoliStatusKind = "not-found" | "error" | "forbidden" | "resting"

const COPY: Record<BoliStatusKind, { eyebrow: string; title: string; description: string }> = {
    "not-found": {
        eyebrow: "404 - Page not found",
        title: "This page wandered off",
        description: "Nothing lives at this address. It may have moved, or the link has a typo in it.",
    },
    error: {
        eyebrow: "500 - Server error",
        title: "Something broke on our side",
        description: "Our server tripped while loading this. It was not something you did - try again in a moment.",
    },
    forbidden: {
        eyebrow: "403 - No access",
        title: "Not your door",
        description: "This belongs to another account, or your role cannot open it. Ask the owner for access, or switch accounts.",
    },
    resting: {
        eyebrow: "boli-chat - Unavailable",
        title: "The model is resting",
        description: "boli-chat is offline for a moment - usually a restart, back within a few minutes. Your conversations are safe.",
    },
}

export function StatusScene({ kind, className }: { kind: BoliStatusKind; className?: string }) {
    if (kind === "error") return <HotLaptopScene className={className} />
    if (kind === "forbidden") return <PasalScene className={className} />
    if (kind === "resting") return <RestingScene className={className} />
    return <ForkScene className={className} />
}

export function BoliStatus({
    kind,
    eyebrow,
    title,
    description,
    path,
    digest,
    extra,
    actions,
    fullScreen = false,
    className,
}: {
    kind: BoliStatusKind
    eyebrow?: string
    title?: string
    description?: string
    /** The path that was asked for (`<CurrentPath />` reads it on the client). */
    path?: ReactNode
    /** A 500's reference (Next's digest), for the person to quote when writing in. */
    digest?: string
    /** Anything between the copy and the actions (a status line). */
    extra?: ReactNode
    /** The buttons - the page's own links and handlers. */
    actions?: ReactNode
    /** A standalone page (outside the shell): fills the viewport with the logo at the top. */
    fullScreen?: boolean
    className?: string
}) {
    const copy = COPY[kind]
    const Root = fullScreen ? "main" : "div"
    return (
        <Root
            className={cn(
                "relative flex w-full min-w-0 flex-col items-center justify-center px-4 text-neutral-900 dark:text-neutral-100",
                fullScreen ? "min-h-dvh bg-background pb-10 pt-20" : "min-h-[var(--app-page-h,60dvh)] py-10",
                className,
            )}
        >
            {fullScreen ? (
                <div className="absolute inset-x-0 top-0 flex h-14 items-center px-5 sm:px-8">
                    <BoliLogo size={18} />
                </div>
            ) : null}
            <div className="flex w-full max-w-lg flex-col items-center gap-6 text-center">
                <StatusScene kind={kind} className="w-full max-w-[22rem] overflow-hidden rounded-2xl border border-neutral-200 sm:max-w-[26rem] dark:border-neutral-800" />
                <div className="flex w-full min-w-0 flex-col items-center gap-3">
                    <p className="flex items-center gap-2 font-mono text-xs text-neutral-600 dark:text-neutral-400">
                        {kind === "error" ? <span aria-hidden className="size-1.5 rounded-full bg-boli-crimson dark:bg-boli-crimson-lift" /> : null}
                        {eyebrow ?? copy.eyebrow}
                    </p>
                    <h1 className="max-w-[22ch] text-[clamp(1.75rem,4vw,2.25rem)] leading-[1.05] text-neutral-900 dark:text-neutral-100" style={serif(390, 72, "-0.025em")}>
                        {title ?? copy.title}
                    </h1>
                    <p className="max-w-[46ch] text-sm leading-6 text-neutral-700 dark:text-neutral-300">{description ?? copy.description}</p>
                    {path ? (
                        <p className="flex max-w-full min-w-0 items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                            <span className="shrink-0">You asked for</span>
                            <code className="min-w-0 truncate rounded-full bg-neutral-100 px-2.5 py-1 font-mono text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">{path}</code>
                        </p>
                    ) : null}
                    {digest ? <p className="font-mono text-xs text-neutral-600 dark:text-neutral-400">Ref {digest}</p> : null}
                    {extra}
                    {actions ? <div className="mt-1 flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-center">{actions}</div> : null}
                </div>
            </div>
        </Root>
    )
}
