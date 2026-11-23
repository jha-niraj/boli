import { ArrowRight } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { Ornament } from "@/components/brand/ornament"
import { WELCOME_CREDITS } from "@/lib/boli"
import { ROUTES } from "@/lib/navigation"

export function CtaBand() {
    return (
        <section className="px-4 pb-20 sm:px-6 sm:pb-28">
            <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-boli-ink px-6 py-16 text-center text-white sm:py-20">
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_70%_at_0%_100%,color-mix(in_oklab,var(--color-boli-crimson)_45%,transparent),transparent_70%),radial-gradient(50%_70%_at_100%_0%,color-mix(in_oklab,var(--color-boli-blue)_60%,transparent),transparent_70%)]"
                />
                <div className="relative">
                    <Ornament className="mx-auto text-white/40" />
                    <h2 className="mx-auto mt-6 max-w-2xl font-serif text-4xl leading-tight tracking-tight sm:text-6xl">Build with AI that speaks Nepali</h2>
                    <p className="mx-auto mt-4 max-w-md text-base leading-7 text-white/75">Start with {WELCOME_CREDITS} free credits. Your first call is a minute away.</p>
                    <Button asChild className="mt-8 h-11 gap-2 bg-boli-crimson px-6 text-white hover:bg-boli-crimson-ink">
                        <AppLink href={ROUTES.signUp}>
                            Get API key <ArrowRight className="h-4 w-4" aria-hidden />
                        </AppLink>
                    </Button>
                </div>
            </div>
        </section>
    )
}
