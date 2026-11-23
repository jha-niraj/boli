import { ArrowRight } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { BRAND } from "@/lib/boli"
import { ROUTES } from "@/lib/navigation"

export function Announcement() {
    return (
        <div className="bg-boli-ink text-white">
            <p className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center text-xs sm:text-sm">
                <span>{BRAND.announcement}</span>
                <AppLink href={ROUTES.signUp} className="inline-flex cursor-pointer items-center gap-1 font-medium underline-offset-4 hover:underline">
                    Try it now <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </AppLink>
            </p>
        </div>
    )
}
