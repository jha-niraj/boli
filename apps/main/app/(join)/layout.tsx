import { AuthFrame } from "@repo/auth/ui"
import { AUTH_PANEL_CLASS, AuthArtBand, AuthArtPanel, AuthDhaka, AuthLogo } from "@repo/brand/auth-art"

/**
 * /join sits outside (main) and (onboarding): it is PUBLIC (middleware.ts), so someone without an account can read the
 * invitation before signing up. The same split frame as sign-in and /welcome (light only, the golden valley on the
 * left, the form under the logo, a Dhaka band at the bottom). Outside (main) also means a not-yet-onboarded invitee is
 * never bounced to /welcome before they accept.
 */
export default function JoinLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthFrame
            panel={<AuthArtPanel />}
            panelClassName={AUTH_PANEL_CLASS}
            mobilePanel={<AuthArtBand />}
            formTop={<AuthLogo />}
            formFooter={<AuthDhaka />}
            formClassName="max-w-md"
            display="serif"
            align="start"
            className="bg-background"
            legal={null}
        >
            {children}
        </AuthFrame>
    )
}
