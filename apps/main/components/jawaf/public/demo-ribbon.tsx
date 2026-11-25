import { ArrowRight } from "lucide-react"
import { BoliMark } from "@repo/brand/boli-mark"
import { WEB } from "@/lib/web-links"

/**
 * The slim ribbon on a demo bot (built by the Boli team from public information for a prospect). "Claim it" reaches the
 * Boli team through the site's Jawaf pilot form: the real hand-over is a one-time claim link an admin sends
 * (/claim/<token>, plan/admin/jawaf/admin-v1.md), so a visitor can never take a bot just by finding its page.
 */
export function claimHref(_slug: string): string {
    return WEB.contactAbout("Jawaf")
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
