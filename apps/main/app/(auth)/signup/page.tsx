import type { Metadata } from 'next'
import { isGoogleConfigured } from '@repo/auth'
import { googleMode } from '@repo/auth/google'
import { safeReturnTo } from '@repo/auth/return-to'
import { AUTH_ROUTES } from '@/lib/auth-routes'
import { param, type SearchParams } from '../_lib/params'
import { SignUpForm } from './_components/signup-form'

export const metadata: Metadata = {
    title: 'Create an account',
    description: 'Create your Boli account.',
    robots: { index: false, follow: false },
}

export default async function SignUpPage({ searchParams }: { searchParams: SearchParams }) {
    const sp = await searchParams
    return (
        <SignUpForm
            google={googleMode(isGoogleConfigured())}
            returnTo={safeReturnTo(param(sp, 'returnTo'), AUTH_ROUTES.home)}
            initialEmail={param(sp, 'email') ?? ''}
        />
    )
}
