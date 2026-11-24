import { AuthFormSkeleton } from '@repo/auth/ui'
import { AdminAuthFrame } from '../_components/admin-auth-frame'

export default function Loading() {
    return (
        <AdminAuthFrame>
            <AuthFormSkeleton fields={3} />
        </AdminAuthFrame>
    )
}
