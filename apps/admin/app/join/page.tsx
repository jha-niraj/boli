import type { Metadata } from 'next'
import { AdminAuthFrame } from '../_components/admin-auth-frame'
import { getInvitationByToken } from '@/actions/admin.action'
import { JoinForm } from './_components/join-form'

export const metadata: Metadata = {
    title: 'Accept invitation',
    description: 'Set your password to join Boli Admin.',
    robots: { index: false, follow: false },
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

/** The invitation is read on the server (never in an effect); the form only sets the password. */
export default async function JoinPage({ searchParams }: { searchParams: SearchParams }) {
    const sp = await searchParams
    const raw = sp.token
    const token = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? ''
    const invite = token ? await getInvitationByToken(token) : null

    return (
        <AdminAuthFrame>
            <JoinForm
                token={token}
                invitation={invite?.success && invite.data ? invite.data : null}
                error={!token ? 'This link has no invitation in it. Open the link from your email again.' : invite && !invite.success ? (invite.error ?? 'This invitation is not valid.') : null}
            />
        </AdminAuthFrame>
    )
}
