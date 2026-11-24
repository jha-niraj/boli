import { AuthFrame } from "./auth-frame"
import { HomeFrame } from "./home-frame"
import { KuraFrame } from "./kura-frame"
import { sans, serif } from "./t1"
import { LandingWireframe } from "./wireframe"

/** The Screens tab: whole pages built from the Final system and the Art - WF1 landing, H1 home, K1 v2 Kura, A1 auth. */
export function ScreensSection() {
    return (
        <div className="art-root grid gap-0" style={sans()}>
            <header className="grid gap-5 pb-14">
                <p className="text-xs text-boli-muted">Screens - 24 Nov 2026</p>
                <h2 className="max-w-3xl text-[48px] leading-[1.02] text-boli-ink sm:text-[64px]" style={serif(340, 144, "-0.04em")}>
                    The system, in place
                </h2>
                <p className="max-w-2xl text-[15px] leading-7 text-boli-text">
                    The landing with the real art, Home, Kura with its new empty state, and the auth screens with the golden valley. Approved layouts; nothing goes into the app
                    until this page is final.
                </p>
            </header>
            <div className="grid gap-24">
                <LandingWireframe n="01" />
                <HomeFrame n="02" />
                <KuraFrame n="03" />
                <AuthFrame n="04" />
            </div>
        </div>
    )
}
