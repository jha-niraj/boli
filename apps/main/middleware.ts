import { NextResponse, type NextRequest } from 'next/server'
import { isSignedIn, matchesRoute, sessionCookieNames, signInRedirectUrl, signedInRedirectUrl } from '@repo/auth/middleware'
import { LAST_PRODUCT_COOKIE, landingFor } from './lib/landing'

/**
 * Cookie-only (packages/auth/src/middleware.ts): never the database. Stays `middleware.ts` - OpenNext rejects Next 16's
 * Node `proxy.ts`. Everything is protected except the public routes below and `/api/*` (each route checks its own).
 */
const SIGN_IN = '/signin'

/** Signed-in visitors are sent on to their landing (or their returnTo). */
const AUTH_ONLY = ['/signin', '/signup', '/forgotpassword', '/resetpassword']
/**
 * Open to everyone, signed in or not. `/verifyemail` stays reachable while signed in (the link lands there). `/join`
 * shows a workspace invitation before sign-in (it reads only; accepting needs the session). `/j/<slug>` is a business's
 * public Jawaf chat page (no login; its routes under /j/<slug>/api check the bot themselves). `/claim/<token>` shows a
 * demo bot's claim link before sign-in (claiming needs the session). The public site (landing,
 * about, contact, docs, legal) lives in apps/web on its own origin.
 */
const PUBLIC = ['/verifyemail', '/join', '/j', '/claim']

export function middleware(request: NextRequest) {
    const { pathname, searchParams } = request.nextUrl
    const signedIn = isSignedIn(request)
    // The last product used (cookie set by the shell), else "Choose where to start" (lib/landing.ts).
    const home = landingFor(request.cookies.get(LAST_PRODUCT_COOKIE)?.value)

    // The app has no landing of its own (apps/web is the site): `/` goes to the last product, or to sign-in. Sign-in's
    // default returnTo is `/`, so this is also where a fresh sign-in lands.
    if (pathname === '/') return NextResponse.redirect(new URL(signedIn ? home : SIGN_IN, request.url))

    if (matchesRoute(pathname, AUTH_ONLY)) {
        if (!signedIn) return NextResponse.next()
        // `?stale=1`: the page found the cookie dead (expired, revoked elsewhere). Expire it here, or the redirect to
        // the landing below would loop with the page's redirect back to sign-in.
        if (searchParams.has('stale')) return expireSessionCookies(NextResponse.next())
        return NextResponse.redirect(signedInRedirectUrl(request, home))
    }

    if (matchesRoute(pathname, PUBLIC)) return NextResponse.next()

    if (!signedIn) return NextResponse.redirect(signInRedirectUrl(request, SIGN_IN))
    return NextResponse.next()
}

function expireSessionCookies(res: NextResponse): NextResponse {
    const [plain, secure] = sessionCookieNames()
    res.cookies.set(plain, '', { path: '/', maxAge: 0 })
    res.cookies.set(secure, '', { path: '/', maxAge: 0, secure: true })
    return res
}

export const config = {
    // Not /api (every route checks its own session), not /v1 (the public API; rewritten to /api/v1 AFTER middleware runs,
    // and it checks its own API key), not Next's assets, not files with an extension.
    matcher: ['/((?!api/|v1/|_next/static|_next/image|.*\\.[a-zA-Z0-9]+$).*)'],
}
