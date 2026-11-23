import { ArrowRight } from "lucide-react"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { Ornament } from "@/components/brand/ornament"
import { BOLI_CHAT, WELCOME_CREDITS } from "@/lib/boli"
import { ROUTES } from "@/lib/navigation"

/** Static on purpose: the headline is the LCP and paints with the HTML (no fade-in, no client JS). */
export function Hero() {
    return (
        <section className="relative overflow-hidden">
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_60%_at_15%_0%,var(--color-boli-crimson-soft),transparent_70%),radial-gradient(50%_60%_at_90%_10%,var(--color-boli-sky),transparent_70%),radial-gradient(60%_40%_at_50%_100%,var(--color-boli-blue-soft),transparent_70%)]"
            />
            <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 pb-20 pt-16 text-center sm:px-6 sm:pb-28 sm:pt-24">
                <Ornament className="text-boli-crimson-ink/50" />
                <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-boli-line bg-white/70 px-3 py-1 text-xs text-boli-text">
                    <span className="h-1.5 w-1.5 rounded-full bg-boli-crimson" aria-hidden />
                    {BOLI_CHAT.label} - open weights, {BOLI_CHAT.licence}
                </p>
                <h1 className="mt-6 max-w-4xl font-serif text-5xl leading-[1.02] tracking-tight text-boli-ink sm:text-7xl">
                    Open AI <em className="text-boli-crimson-ink">for Nepal</em>
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-7 text-boli-text sm:text-lg sm:leading-8">
                    Chat with an open model in English, Romanized Nepali or both.
                    <br className="hidden sm:block" /> Build on an OpenAI-compatible API, priced in rupees, with {WELCOME_CREDITS} free credits.
                </p>
                <div className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
                    <Button asChild className="h-11 w-full gap-2 bg-boli-crimson px-6 text-white hover:bg-boli-crimson-ink sm:w-auto">
                        <AppLink href={ROUTES.signUp}>
                            Sign up free <ArrowRight className="h-4 w-4" aria-hidden />
                        </AppLink>
                    </Button>
                    <Button asChild variant="outline" className="h-11 w-full border-boli-line bg-white px-6 text-boli-ink hover:bg-boli-sand sm:w-auto">
                        <AppLink href={ROUTES.doc("quickstart")}>Read the docs</AppLink>
                    </Button>
                </div>
            </div>
        </section>
    )
}
