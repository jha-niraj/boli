import { ArrowRight } from "lucide-react"
import { BoliMark } from "@repo/brand/boli-mark"
import { AUTH_ROUTES } from "@/lib/auth-routes"

/**
 * The slim ribbon on a demo bot (built by the Boli team from public information for a prospect). "Claim it" goes to
 * sign-up with the claim intent; the claim flow itself (one-time code, transfer) is Wave 4 (plan task 12).
 */
export function claimHref(slug: string): string {
    return `${AUTH_ROUTES.signUp}?intent=claim&bot=${encodeURIComponent(slug)}`
}

export function DemoRibbon({ slug }: { slug: string }) {
    return (
        <div className="border-b border-boli-line bg-boli-sky-soft text-neutral-800 dark:border-neutral-800 dark:text-neutral-200">
            <div className="mx-auto flex w-full max-w-6xl min-w-0 items-center gap-2 px-4 py-2 text-xs sm:px-6">
                <BoliMark px={14} className="shrink-0" />
                <p className="min-w-0 flex-1 truncate sm:whitespace-normal">
                    <span className="hidden sm:inline">Demo built by Boli from public information - </span>
                    <span className="sm:hidden">Demo by Boli - </span>
                    Is this your business?
                </p>
                <a href={claimHref(slug)} className="inline-flex shrink-0 cursor-pointer items-center gap-1 font-semibold text-boli-sky-ink hover:underline">
                    Claim it <ArrowRight aria-hidden className="size-3.5" />
                </a>
            </div>
        </div>
    )
}
