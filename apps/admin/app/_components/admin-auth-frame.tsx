import { AuthFrame } from "@repo/auth/ui"
import { ArtRoot } from "@repo/brand/art/art-root"
import { VALLEY_GOLD } from "@repo/brand/art/valley/palette"
import { ValleyHero } from "@repo/brand/art/valley/valley"
import { AUTH_PANEL_CLASS, AuthArtBand, AuthDhaka } from "@repo/brand/auth-art"
import { serif } from "@repo/brand/type"
import { BRAND } from "@repo/boli"
import { AppLink } from "@repo/ui/components/app-link"
import { AdminLockup } from "@/components/brand/admin-lockup"

/*
 * The console's one landing frame (sign-in at `/`, invitations at `/join`), the same split as apps/main's auth pages
 * (`apps/main/app/(auth)/layout.tsx`): from `lg` the golden-hour valley on the LEFT with one line over its sky, the form
 * on the right under the logo + Admin tag, a slim Dhaka band along the bottom. On a phone the valley is a short band on
 * top. Always light (app/providers.tsx). No Back link and no legal links: the console has no public site of its own.
 */

/** The left panel: @repo/brand's AuthArtPanel with the console's own line (that one speaks to new customers). */
function AdminArtPanel() {
    return (
        <ArtRoot className="relative h-full overflow-hidden rounded-[20px]" style={{ background: VALLEY_GOLD.sky0 }}>
            <ValleyHero variant="gold" crop="portrait" preserve="xMidYMax slice" className="absolute inset-0 block h-full w-full" />
            <p className="pointer-events-none absolute inset-x-0 top-14 px-8 text-center text-[32px] leading-tight text-boli-ink xl:top-16 xl:text-4xl" style={serif(380, 96, "-0.025em")}>
                Keep {BRAND.name} running,
                <br />
                from one place.
            </p>
        </ArtRoot>
    )
}

/** The top of the form column: the logo with the Admin tag, linking to this landing. */
function AdminAuthTop() {
    return (
        <AppLink href="/" aria-label={`${BRAND.name} Admin sign in`} className="inline-flex rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <AdminLockup size={26} />
        </AppLink>
    )
}

export function AdminAuthFrame({ children }: { children: React.ReactNode }) {
    return (
        <AuthFrame
            panel={<AdminArtPanel />}
            panelClassName={AUTH_PANEL_CLASS}
            mobilePanel={<AuthArtBand />}
            formTop={<AdminAuthTop />}
            formFooter={<AuthDhaka />}
            display="serif"
            align="start"
            className="bg-background"
            homeHref="/"
            legal={null}
        >
            {children}
        </AuthFrame>
    )
}
