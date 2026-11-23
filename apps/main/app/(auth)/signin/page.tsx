import type { Metadata } from 'next'
import { isGoogleConfigured } from '@repo/auth'
import { googleMode } from '@repo/auth/google'
import { safeReturnTo } from '@repo/auth/return-to'
import { authErrorMessage } from '@repo/auth/errors'
import { AUTH_ROUTES } from '@/lib/auth-routes'
import { param, type SearchParams } from '../_lib/params'
import { SignInForm, type SignInNotice } from './_components/signin-form'

export const metadata: Metadata = {
    title: 'Log in',
    description: 'Log in to your Boli account.',
    robots: { index: false, follow: false },
}

export default async function SignInPage({ searchParams }: { searchParams: SearchParams }) {
    const sp = await searchParams
    const error = param(sp, 'error')

    // One notice at most, most important first.
    let notice: SignInNotice | null = null
    if (error) notice = { tone: 'error', text: authErrorMessage(error) }
    else if (param(sp, 'stale')) notice = { tone: 'neutral', text: 'Your session ended. Sign in again to carry on.' }
    else if (param(sp, 'reset')) notice = { tone: 'neutral', text: 'Password changed. Sign in with the new one.' }
    else if (param(sp, 'deleted')) notice = { tone: 'neutral', text: 'Your account was deleted.' }

    return (
        <SignInForm
            google={googleMode(isGoogleConfigured())}
            returnTo={safeReturnTo(param(sp, 'returnTo') ?? param(sp, 'callbackUrl'), AUTH_ROUTES.home)}
            initialMethod={param(sp, 'method') === 'code' ? 'code' : 'password'}
            initialEmail={param(sp, 'email') ?? ''}
            notice={notice}
        />
    )
}
