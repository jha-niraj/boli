import type { Metadata } from 'next'
import { safeReturnTo } from '@repo/auth/return-to'
import { authErrorMessage } from '@repo/auth/errors'
import { AdminAuthFrame } from './_components/admin-auth-frame'
import { AdminSignIn, type AdminNotice } from './_components/admin-signin'

export const metadata: Metadata = {
    title: 'Sign in',
    description: 'Sign in to Boli Admin, the console for the Boli team.',
    robots: { index: false, follow: false },
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function param(sp: Record<string, string | string[] | undefined>, key: string): string | null {
    const v = sp[key]
    const s = (Array.isArray(v) ? v[0] : v)?.trim()
    return s ? s : null
}

/** The admin landing IS the sign-in: one page, the valley on the left, the form on the right. */
export default async function AdminLandingPage({ searchParams }: { searchParams: SearchParams }) {
    const sp = await searchParams
    const error = param(sp, 'error')
    let notice: AdminNotice | null = null
    if (error) notice = { tone: 'error', text: authErrorMessage(error) }
    else if (param(sp, 'stale')) notice = { tone: 'neutral', text: 'Your session ended. Sign in again to carry on.' }
    else if (param(sp, 'denied')) notice = { tone: 'error', text: 'This account has no admin access. Ask a super admin for an invitation.' }

    return (
        <AdminAuthFrame>
            <AdminSignIn returnTo={safeReturnTo(param(sp, 'returnTo') ?? param(sp, 'callbackUrl'), '/home')} notice={notice} />
        </AdminAuthFrame>
    )
}
