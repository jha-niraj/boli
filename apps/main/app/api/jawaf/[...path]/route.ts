// The ONE Jawaf route (a dispatcher beats a route.ts per endpoint - Worker size). Signed-in only; every handler checks
// the session and the current workspace's Jawaf access itself.
//
//   POST /api/jawaf/ask                 playground question, streamed as NDJSON JawafFrame lines (types/jawaf.ts):
//                                       { botId, conversationId?, message } -> meta, text..., final, done
//   POST /api/jawaf/jobs/<jobId>/tick   run ONE slice (< ~25 s) of a reading job and return its JawafJobView. The
//                                       Knowledge page polls this every ~2 s while a job runs (a route, not a server
//                                       action: Next runs a client's actions one at a time). Under JOBS_RUNNER=workflow
//                                       it only reads the row (the Workflow advances it; lib/jawaf/jobs.ts).
//
//   POST /api/jawaf/admin/<eval|health|tick>  the admin console's bridge into the engine (server to server, Bearer
//                                       JAWAF_ADMIN_SECRET; lib/jawaf/admin-bridge.ts). No session.
//   GET  /api/jawaf/open?workspace=<id>&bot=<id>  admin "Open in Jawaf": switch to that workspace (the person must be a
//                                       member) and that bot, then go to /jawaf. Only cookies change - no data is written.
//
// Wave 3 adds the public channels (/j page, widget, API) here, calling the same lib/jawaf/ask.ts.
import { NextResponse } from 'next/server'
import { and, db, eq } from '@repo/db'
import { jawafBot, workspaceMember } from '@repo/db/schema'
import { WORKSPACE_COOKIE } from '@repo/boli/workspace-access'
import { AppError, errorResponse, isAppError } from '@repo/errors'
import { bridgeEval, bridgeHealth, bridgeTick, checkBridgeAuth } from '@/lib/jawaf/admin-bridge'
import { JAWAF_BOT_COOKIE } from '@/lib/jawaf/bot-cookie'
import { getSession } from '@/lib/session'
import { requireWorkspaceAccess, WORKSPACE_COOKIE_OPTIONS } from '@/lib/workspace'
import { askBot } from '@/lib/jawaf/ask'
import { loadBot } from '@/lib/jawaf/bots'
import { advanceForPoll, loadJob, toJobView } from '@/lib/jawaf/jobs'
import { jawafAskSchema, jawafIdSchema } from '@/schemas/jawaf'
import type { JawafFrame } from '@/types/jawaf'

export const dynamic = 'force-dynamic'

const encode = (f: JawafFrame) => `${JSON.stringify(f)}\n`

async function ask(req: Request): Promise<Response> {
    const s = await getSession()
    if (!s) throw new AppError('auth', 'Your session ended. Sign in again.')
    const parsed = jawafAskSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) throw new AppError('validation', parsed.error.issues[0]?.message ?? 'That question could not be read.')
    const ws = await requireWorkspaceAccess('jawaf', 'view')
    const bot = await loadBot(ws.id, parsed.data.botId)
    const body = parsed.data

    const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
            const enc = new TextEncoder()
            let open = true
            const emit = (f: JawafFrame) => {
                if (!open) return
                try { controller.enqueue(enc.encode(encode(f))) } catch { open = false }
            }
            try {
                const answer = await askBot({
                    bot,
                    question: body.message,
                    channel: 'playground',
                    conversationId: body.conversationId ?? null,
                    userId: s.user.id,
                    signal: req.signal,
                    onMeta: (m) => emit({ t: 'meta', ...m }),
                    onDelta: (d) => emit({ t: 'text', d }),
                })
                emit({ t: 'final', answer })
            } catch (err) {
                console.error('[jawaf] ask failed', err instanceof Error ? err.message : err)
                emit({ t: 'error', code: isAppError(err) && err.kind === 'validation' ? 'invalid' : 'unknown', message: isAppError(err) ? err.userMessage : 'Something went wrong. Try again.' })
            }
            emit({ t: 'done' })
            if (open) { try { controller.close() } catch { /* the client left */ } }
        },
    })
    return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' } })
}

async function tick(jobId: string): Promise<Response> {
    const s = await getSession()
    if (!s) throw new AppError('auth', 'Your session ended. Sign in again.')
    const id = jawafIdSchema.parse(jobId)
    const ws = await requireWorkspaceAccess('jawaf', 'view')
    const job = await loadJob(ws.id, id)
    const after = await advanceForPoll(job)
    return Response.json({ success: true, data: toJobView(after) }, { headers: { 'Cache-Control': 'no-store' } })
}

const NO_STORE = { 'Cache-Control': 'no-store' }

async function adminBridge(req: Request, what: string): Promise<Response> {
    checkBridgeAuth(req)
    const body: unknown = await req.json().catch(() => ({}))
    if (what === 'eval') return Response.json({ success: true, data: await bridgeEval(body) }, { headers: NO_STORE })
    if (what === 'health') return Response.json({ success: true, data: await bridgeHealth() }, { headers: NO_STORE })
    if (what === 'tick') return Response.json({ success: true, data: await bridgeTick(body) }, { headers: NO_STORE })
    return Response.json({ success: false, error: 'Not found', kind: 'notfound' }, { status: 404 })
}

/** Admin "Open in Jawaf": switch workspace + bot (cookies only), then /jawaf. Not a member -> /jawaf as it is. */
async function open(req: Request): Promise<Response> {
    const url = new URL(req.url)
    const s = await getSession()
    const target = new URL('/jawaf', url.origin)
    if (!s) {
        const signIn = new URL('/signin', url.origin)
        signIn.searchParams.set('returnTo', `${url.pathname}${url.search}`)
        return NextResponse.redirect(signIn, 303)
    }
    const ws = url.searchParams.get('workspace') ?? ''
    const botId = url.searchParams.get('bot') ?? ''
    const [member] = ws
        ? await db.select({ id: workspaceMember.id }).from(workspaceMember).where(and(eq(workspaceMember.workspaceId, ws), eq(workspaceMember.userId, s.user.id))).limit(1)
        : []
    const res = NextResponse.redirect(target, 303)
    res.headers.set('Cache-Control', 'no-store')
    if (member) {
        res.cookies.set(WORKSPACE_COOKIE, ws, WORKSPACE_COOKIE_OPTIONS)
        const [bot] = botId ? await db.select({ id: jawafBot.id }).from(jawafBot).where(and(eq(jawafBot.id, botId), eq(jawafBot.workspaceId, ws))).limit(1) : []
        if (bot) res.cookies.set(JAWAF_BOT_COOKIE, bot.id, { path: '/', maxAge: 31536000, sameSite: 'lax' })
    }
    return res
}

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }): Promise<Response> {
    const { path } = await params
    try {
        if (path.length === 1 && path[0] === 'open') return await open(req)
        return Response.json({ success: false, error: 'Not found', kind: 'notfound' }, { status: 404 })
    } catch (err) {
        return errorResponse(err, 'jawaf.route')
    }
}

export async function POST(req: Request, { params }: { params: Promise<{ path: string[] }> }): Promise<Response> {
    const { path } = await params
    try {
        if (path.length === 1 && path[0] === 'ask') return await ask(req)
        if (path.length === 3 && path[0] === 'jobs' && path[2] === 'tick') return await tick(path[1]!)
        if (path.length === 2 && path[0] === 'admin') return await adminBridge(req, path[1]!)
        return Response.json({ success: false, error: 'Not found', kind: 'notfound' }, { status: 404 })
    } catch (err) {
        return errorResponse(err, 'jawaf.route')
    }
}
