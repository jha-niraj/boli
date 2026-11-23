/** Every auth route in main, in one place (page URLs have no hyphens). */
export const AUTH_ROUTES = {
    signIn: '/signin',
    signUp: '/signup',
    verifyEmail: '/verifyemail',
    forgotPassword: '/forgotpassword',
    resetPassword: '/resetpassword',
    /** Where a signed-in person lands by default. */
    home: '/kura',
    terms: '/terms',
    privacy: '/privacy',
} as const

/** The verification link's landing (better-auth appends `?error=` when the token is bad). */
export const VERIFIED_CALLBACK = `${AUTH_ROUTES.verifyEmail}?done=1`
