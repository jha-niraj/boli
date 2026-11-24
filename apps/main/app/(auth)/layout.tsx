import { AuthFrame } from '@repo/auth/ui'
import { AUTH_PANEL_CLASS, AuthArtBand, AuthArtPanel, AuthDhaka, AuthTop } from '@/components/brand/auth-art'
import { AUTH_ROUTES } from '@/lib/auth-routes'

/**
 * One frame for every auth page (A1, approved 2026-11-24): from `lg` the golden-hour valley on the LEFT with one line
 * over its sky, the form on the right under the logo with a slim Dhaka band along the bottom. On a phone the valley is
 * a short band on top and the form takes the screen. Always light (app/providers.tsx). It stays mounted as the person
 * moves between sign-in, sign-up and the rest; each form carries its own switch link.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthFrame
            panel={<AuthArtPanel />}
            panelClassName={AUTH_PANEL_CLASS}
            mobilePanel={<AuthArtBand />}
            formTop={<AuthTop />}
            formFooter={<AuthDhaka />}
            display="serif"
            align="start"
            className="bg-background"
            legal={{ terms: AUTH_ROUTES.terms, privacy: AUTH_ROUTES.privacy }}
        >
            {children}
        </AuthFrame>
    )
}
