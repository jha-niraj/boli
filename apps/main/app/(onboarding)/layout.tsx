import { redirect } from "next/navigation"
import { AuthFrame } from "@repo/auth/ui"
import { AUTH_PANEL_CLASS, AuthArtBand, AuthArtPanel, AuthDhaka, AuthLogo } from "@/components/brand/auth-art"
import { getSession } from "@/lib/session"
import { ROUTES } from "@/lib/navigation"

/**
 * The first-run flow sits outside (main): no rail, no tab bar - the same split frame as sign-in (A1: the golden valley
 * on the left, the steps on the right under the logo, a Dhaka band at the bottom; on a phone the valley is a short band
 * on top). A slightly wider column than the auth forms for the chips and the role grid. Outside the group also means
 * the (main) layout's "not onboarded -> /welcome" redirect can never loop. The middleware already requires the session
 * cookie here; this checks the session itself.
 */
export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
    const session = await getSession()
    if (!session) redirect(`${ROUTES.signIn}?stale=1`)
    return (
        <AuthFrame
            panel={<AuthArtPanel />}
            panelClassName={AUTH_PANEL_CLASS}
            mobilePanel={<AuthArtBand />}
            formTop={<AuthLogo />}
            formFooter={<AuthDhaka />}
            formClassName="max-w-lg"
            display="serif"
            align="start"
            className="bg-background"
            legal={null}
        >
            {children}
        </AuthFrame>
    )
}
