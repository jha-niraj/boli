import { WEB } from './web-links'

/** Every auth route in main, in one place (page URLs have no hyphens). Terms and Privacy live on the public site. */
export const AUTH_ROUTES = {
    signIn: '/signin',
    signUp: '/signup',
    verifyEmail: '/verifyemail',
    forgotPassword: '/forgotpassword',
    resetPassword: '/resetpassword',
    /** Where a signed-in person lands by default: `/`, which middleware.ts sends to the last product (or /start). */
    home: '/',
    terms: WEB.terms,
    privacy: WEB.privacy,
} as const

/** The verification link's landing (better-auth appends `?error=` when the token is bad). */
export const VERIFIED_CALLBACK = `${AUTH_ROUTES.verifyEmail}?done=1`
