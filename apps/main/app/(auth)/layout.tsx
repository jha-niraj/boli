import { AuthFrame } from '@repo/auth/ui'
import { AppLink } from '@repo/ui/components/app-link'
import { BoliLogo } from '@/components/brand/boli-logo'
import { AUTH_ROUTES } from '@/lib/auth-routes'
import { BRAND } from '@/lib/boli'
import { AuthPanel } from './_components/auth-panel'

/**
 * One frame for every auth page (Sarvam study 1): the pixel Himalaya with the product card on the left from `lg`, a
 * centred form on the right with the Boli mark and serif titles. On a phone: one column, the mark on top. It stays
 * mounted as the person moves between sign-in, sign-up and the rest. Each form carries its own switch link.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthFrame
            panel={<AuthPanel />}
            display="serif"
            className="bg-background"
            formMark={
                <AppLink href="/" aria-label={`${BRAND.name} home`} className="inline-flex rounded-xl">
                    <BoliLogo wordmark={false} className="text-2xl" />
                </AppLink>
            }
            legal={{ terms: AUTH_ROUTES.terms, privacy: AUTH_ROUTES.privacy }}
        >
            {children}
        </AuthFrame>
    )
}
