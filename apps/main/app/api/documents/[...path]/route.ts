// The ONE documents route (a dispatcher plus a switch beats a route.ts per document - Worker size). Signed-in only.
//
//   GET /api/documents/users.pdf          sample @repo/pdf document: the account list (admins: every user;
//                                         everyone else: their own row). `?download=1` saves instead of opening.
//   GET /api/documents/files/<key...>     a private R2 object: checks the key's owner segment against the session,
//                                         then redirects to a 5-minute signed URL. This is what `storageHref()`
//                                         returns for a private bucket, so `<img src>` links never go stale.
//
// Add a document: a case in DOCUMENTS below that loads its rows (filtered by the signed-in user / tenant) and returns
// `pdfResponse(await renderDataTablePdf(...), pdfFilename(...))`.
import { db, desc, eq } from '@repo/db'
import { user } from '@repo/db/schema'
import { errorResponse, errForbidden, errNotFound } from '@repo/errors'
import { pdfFilename, pdfResponse, renderDataTablePdf } from '@repo/pdf'
import { getDownloadUrl, isStorageConfigured, ownerFromKey } from '@repo/storage'
import { getSession } from '@/lib/session'
import type { AppSession } from '@/types/session'

export const dynamic = 'force-dynamic'

type DocumentHandler = (session: AppSession, url: URL) => Promise<Response>

const formatDate = (d: Date) => d.toISOString().slice(0, 10)

const DOCUMENTS: Record<string, DocumentHandler> = {
    'users.pdf': async (session, url) => {
        const isAdmin = session.user.role === 'ADMIN'
        const base = db
            .select({ name: user.name, email: user.email, role: user.role, createdAt: user.createdAt, isActive: user.isActive })
            .from(user)
        const rows = isAdmin
            ? await base.orderBy(desc(user.createdAt)).limit(5000)
            : await base.where(eq(user.id, session.user.id)).limit(1)
        const bytes = await renderDataTablePdf({
            title: isAdmin ? 'Users' : 'Your account',
            columns: [{ header: 'Name' }, { header: 'Email' }, { header: 'Role' }, { header: 'Status' }, { header: 'Joined', align: 'right' }],
            rows: rows.map((r) => [r.name, r.email, r.role, r.isActive ? 'Active' : 'Inactive', formatDate(r.createdAt)]),
            meta: [['Scope', isAdmin ? 'All accounts, newest first' : 'Your own account']],
            note: isAdmin && rows.length === 5000 ? 'Showing the newest 5,000 accounts.' : null,
        })
        return pdfResponse(bytes, pdfFilename({ type: 'users' }), { download: url.searchParams.get('download') === '1' })
    },
}

async function privateFile(session: AppSession, segments: string[]): Promise<Response> {
    if (!isStorageConfigured()) throw errNotFound('File storage is not configured.')
    // Next hands catch-all segments over already decoded.
    const key = segments.join('/')
    if (!key || key.includes('..')) throw errNotFound()
    // Keys from generateKey(prefix, ownerId, name) carry the owner as the second segment. Widen this check (a tenant,
    // a shared folder, an admin) when the product needs it - never drop it.
    if (ownerFromKey(key) !== session.user.id && session.user.role !== 'ADMIN') throw errForbidden()
    const signed = await getDownloadUrl(key, 300)
    return new Response(null, { status: 302, headers: { location: signed, 'cache-control': 'private, max-age=240' } })
}

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }): Promise<Response> {
    try {
        const session = await getSession()
        if (!session) return Response.json({ success: false, error: 'Sign in to open this document.', kind: 'auth' }, { status: 401 })
        const { path } = await params
        const [first, ...rest] = path
        if (first === 'files') return await privateFile(session, rest)
        const handler = first && path.length === 1 ? DOCUMENTS[first] : undefined
        if (!handler) throw errNotFound('No such document.')
        return await handler(session, new URL(request.url))
    } catch (err) {
        return errorResponse(err)
    }
}
