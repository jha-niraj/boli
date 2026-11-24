// The ONE Jawaf route (a dispatcher beats a route.ts per endpoint - Worker size). Signed-in only; every handler checks
// the session and the current workspace's Jawaf access itself.
//
//   POST /api/jawaf/ask                 playground question, streamed as NDJSON JawafFrame lines (types/jawaf.ts):
//                                       { botId, conversationId?, message } -> meta, text..., final, done
//   POST /api/jawaf/jobs/<jobId>/tick   run ONE slice (< ~25 s) of a reading job and return its JawafJobView. The
//                                       Knowledge page polls this every ~2 s while a job runs (lib/jawaf/jobs.ts says
//                                       why this is a route and not a server action).
//
// Wave 3 adds the public channels (/j page, widget, API) here, calling the same lib/jawaf/ask.ts.
import { AppError, errorResponse, isAppError } from '@repo/errors'
import { getSession } from '@/lib/session'
import { requireWorkspaceAccess } from '@/lib/workspace'
import { askBot } from '@/lib/jawaf/ask'
import { loadBot } from '@/lib/jawaf/bots'
import { loadJob, runSlice, toJobView } from '@/lib/jawaf/jobs'
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
    const after = job.status === 'queued' || job.status === 'running' ? await runSlice(job.id) : job
    return Response.json({ success: true, data: toJobView(after) }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: Request, { params }: { params: Promise<{ path: string[] }> }): Promise<Response> {
    const { path } = await params
    try {
        if (path.length === 1 && path[0] === 'ask') return await ask(req)
        if (path.length === 3 && path[0] === 'jobs' && path[2] === 'tick') return await tick(path[1]!)
        return Response.json({ success: false, error: 'Not found', kind: 'notfound' }, { status: 404 })
    } catch (err) {
        return errorResponse(err, 'jawaf.route')
    }
}
