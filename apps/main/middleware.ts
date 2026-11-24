import { NextResponse, type NextRequest } from 'next/server'
import { isSignedIn, matchesRoute, sessionCookieNames, signInRedirectUrl, signedInRedirectUrl } from '@repo/auth/middleware'

/**
 * Cookie-only (packages/auth/src/middleware.ts): never the database. Stays `middleware.ts` - OpenNext rejects Next 16's
 * Node `proxy.ts`. Everything is protected except the public routes below and `/api/*` (each route checks its own).
 */
const SIGN_IN = '/signin'
const HOME = '/kura'

/** Signed-in visitors are sent on to HOME (or their returnTo). */
const AUTH_ONLY = ['/signin', '/signup', '/forgotpassword', '/resetpassword']
/**
 * Open to everyone, signed in or not. `/verifyemail` stays reachable while signed in (the link lands there). The public
 * site (landing, about, contact, docs, legal) lives in apps/web on its own origin.
 */
const PUBLIC = ['/verifyemail']

export function middleware(request: NextRequest) {
    const { pathname, searchParams } = request.nextUrl
    const signedIn = isSignedIn(request)

    // The app has no landing of its own (apps/web is the site): `/` goes to Kura, or to sign-in.
    if (pathname === '/') return NextResponse.redirect(new URL(signedIn ? HOME : SIGN_IN, request.url))

    if (matchesRoute(pathname, AUTH_ONLY)) {
        if (!signedIn) return NextResponse.next()
        // `?stale=1`: the page found the cookie dead (expired, revoked elsewhere). Expire it here, or the redirect to
        // HOME below would loop with the page's redirect back to sign-in.
        if (searchParams.has('stale')) return expireSessionCookies(NextResponse.next())
        return NextResponse.redirect(signedInRedirectUrl(request, HOME))
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
