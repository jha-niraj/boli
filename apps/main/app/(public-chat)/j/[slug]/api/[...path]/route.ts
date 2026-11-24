// The ONE public Jawaf route (a dispatcher beats a route.ts per endpoint - Worker size). No session: anyone with the
// link may ask. It lives UNDER /j/<slug> on purpose - the visitor cookie is scoped to that path, so the browser sends it
// here and nowhere else.
//
//   POST /j/<slug>/api/ask        { conversationId?, message, src } -> NDJSON JawafPublicFrame lines (meta, final, done)
//   POST /j/<slug>/api/contact    { conversationId?, fields, website (honeypot), src } -> { success, data: { saved } }
//   POST /j/<slug>/api/rate       { messageId, rating 1 | -1 | 0, reason? } -> { success }
//   POST /j/<slug>/api/speech     multipart `audio` (<= 30 s) -> { success, data: { text } } (Sarvam speech to text)
//   POST /j/<slug>/api/reset      Start over: clears the visitor cookie -> { success }
//   GET  /j/<slug>/api/qr.svg     the QR code for <app>/j/<slug>?src=qr (?download=1 saves it)
//   GET  /j/<slug>/api/qr.png     the same as a PNG (?scale=4..32)
//   GET  /j/<slug>/api/image/<key> an image of the bot's PUBLISHED look on a private bucket -> redirect to a signed URL
//
// Rate limits: lib/jawaf/public.ts PUBLIC_LIMITS. The bot must be live or a demo (draft bots 404).
import { AppError, errorResponse, isAppError } from '@repo/errors'
import { getDownloadUrl, isStorageConfigured } from '@repo/storage'
import { isSarvamConfigured, speechToText, STT_MAX_SECONDS } from '@repo/sarvamai'
import { askBot } from '@/lib/jawaf/ask'
import {
    checkAskLimits, checkSpeechLimits, clearVisitorCookie, ipKey, loadPublicBotRow, publicImageKeys, rateMessage, saveContact, visibleSources,
    visitorCookie, visitorFromRequest,
} from '@/lib/jawaf/public'
import { jawafQrPng, jawafQrSvg } from '@/components/jawaf/public/qr'
import { jawafPublicAskSchema, jawafPublicContactSchema, jawafPublicRateSchema } from '@/schemas/jawaf-public'
import type { JawafPublicFrame, JawafPublicMessage } from '@/types/jawaf-public'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ slug: string; path: string[] }> }

/** 30 s of opus is ~120 KB, of AAC ~500 KB; 2 MB leaves room without inviting abuse. */
const MAX_AUDIO_BYTES = 2 * 1024 * 1024

const NO_STORE = { 'Cache-Control': 'no-store' }

function secure(req: Request): boolean {
    return new URL(req.url).protocol === 'https:'
}

async function botOr404(slug: string) {
    const bot = await loadPublicBotRow(slug)
    if (!bot) throw new AppError('notfound', 'This page could not be found.')
    return bot
}

async function body(req: Request): Promise<unknown> {
    const text = await req.text()
    if (text.length > 20_000) throw new AppError('validation', 'That message is too long.')
    try {
        return JSON.parse(text) as unknown
    } catch {
        throw new AppError('validation', 'That request could not be read.')
    }
}

async function ask(req: Request, slug: string): Promise<Response> {
    const bot = await botOr404(slug)
    const parsed = jawafPublicAskSchema.safeParse(await body(req))
    if (!parsed.success) throw new AppError('validation', parsed.error.issues[0]?.message ?? 'That question could not be read.')
    const known = visitorFromRequest(req)
    const visitorId = known ?? crypto.randomUUID()
    await checkAskLimits(bot.id, known, await ipKey(req))

    const input = parsed.data
    const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
            const enc = new TextEncoder()
            let open = true
            const emit = (f: JawafPublicFrame) => {
                if (!open) return
                try { controller.enqueue(enc.encode(`${JSON.stringify(f)}\n`)) } catch { open = false }
            }
            try {
                const answer = await askBot({
                    bot,
                    question: input.message,
                    channel: input.src === 'qr' ? 'qr' : 'link',
                    conversationId: input.conversationId ?? null,
                    visitorId,
                    signal: req.signal,
                    onMeta: (m) => emit({ t: 'meta', conversationId: m.conversationId, messageId: m.messageId }),
                })
                const message: JawafPublicMessage = {
                    id: answer.messageId ?? crypto.randomUUID(),
                    role: 'assistant',
                    text: answer.text,
                    sources: answer.status === 'answered' ? visibleSources(bot, answer.sources) : [],
                    kind: answer.status,
                    script: answer.script,
                    rating: null,
                    createdAt: new Date().toISOString(),
                }
                emit({ t: 'final', conversationId: answer.conversationId ?? '', message })
            } catch (err) {
                console.error('[jawaf] public ask failed', err instanceof Error ? err.message : err)
                emit({
                    t: 'error',
                    code: isAppError(err) && err.kind === 'validation' ? 'invalid' : 'unknown',
                    message: isAppError(err) && err.kind === 'validation' ? err.userMessage : 'We could not answer just now. Try again in a moment.',
                })
            }
            emit({ t: 'done' })
            if (open) { try { controller.close() } catch { /* the visitor left */ } }
        },
    })
    const headers = new Headers({ 'Content-Type': 'application/x-ndjson; charset=utf-8', 'X-Accel-Buffering': 'no', ...NO_STORE })
    // A first question starts (or refreshes) the 30-day memory on this device.
    headers.append('Set-Cookie', visitorCookie(bot.slug, visitorId, secure(req)))
    return new Response(stream, { headers })
}

async function contact(req: Request, slug: string): Promise<Response> {
    const bot = await botOr404(slug)
    const parsed = jawafPublicContactSchema.safeParse(await body(req))
    if (!parsed.success) throw new AppError('validation', parsed.error.issues[0]?.message ?? 'Check the form and try again.')
    // The honeypot: a filled hidden field gets a normal success and nothing is stored, so a bot learns nothing.
    if (parsed.data.website?.trim()) return Response.json({ success: true, data: { saved: true } }, { headers: NO_STORE })
    await saveContact({
        bot,
        visitorId: visitorFromRequest(req),
        ip: await ipKey(req),
        conversationId: parsed.data.conversationId,
        fields: parsed.data.fields,
        channel: parsed.data.src,
    })
    return Response.json({ success: true, data: { saved: true } }, { headers: NO_STORE })
}

async function rate(req: Request, slug: string): Promise<Response> {
    const bot = await botOr404(slug)
    const parsed = jawafPublicRateSchema.safeParse(await body(req))
    if (!parsed.success) throw new AppError('validation', 'That rating could not be read.')
    await rateMessage({ bot, visitorId: visitorFromRequest(req), ip: await ipKey(req), ...parsed.data })
    return Response.json({ success: true, data: { saved: true } }, { headers: NO_STORE })
}

async function speech(req: Request, slug: string): Promise<Response> {
    await botOr404(slug)
    if (!isSarvamConfigured()) throw new AppError('network', 'Voice is not available right now. Type your question instead.')
    checkSpeechLimits(visitorFromRequest(req), await ipKey(req))
    const len = Number(req.headers.get('content-length') ?? 0)
    if (len > MAX_AUDIO_BYTES + 10_000) throw new AppError('validation', `Keep voice messages under ${STT_MAX_SECONDS} seconds.`)
    const form = await req.formData().catch(() => null)
    const audio = form?.get('audio')
    if (!audio || typeof audio === 'string') throw new AppError('validation', 'No audio was recorded. Hold the mic and speak.')
    if (audio.size === 0) throw new AppError('validation', 'No audio was recorded. Hold the mic and speak.')
    if (audio.size > MAX_AUDIO_BYTES) throw new AppError('validation', `Keep voice messages under ${STT_MAX_SECONDS} seconds.`)
    const type = (audio.type || 'audio/webm').split(';')[0]!.trim()
    if (!/^audio\/(webm|ogg|mp4|mpeg|wav|x-wav|aac|x-m4a|m4a)$/.test(type)) throw new AppError('validation', 'That recording format is not supported. Type your question instead.')
    // No language code: Sarvam detects it. Nepali is not on Sarvam's speech list, but Devanagari speech comes back in
    // Devanagari (heard as hi-IN) and English as English - the answer engine reads both (tested 2026-11-25, plan task 8).
    const { transcript } = await speechToText({ audio, mimeType: type, mode: 'transcribe', timeoutMs: 20_000 })
    if (!transcript.trim()) throw new AppError('validation', 'We could not hear any words. Try again a little closer to the mic.')
    return Response.json({ success: true, data: { text: transcript.trim().slice(0, 500) } }, { headers: NO_STORE })
}

function reset(req: Request, slug: string): Response {
    const headers = new Headers(NO_STORE)
    headers.append('Set-Cookie', clearVisitorCookie(slug, secure(req)))
    return Response.json({ success: true, data: { cleared: true } }, { headers })
}

async function qr(req: Request, slug: string, kind: 'svg' | 'png'): Promise<Response> {
    const bot = await botOr404(slug)
    const url = new URL(req.url)
    const download = url.searchParams.get('download') === '1'
    const name = `jawaf-${bot.slug}-qr.${kind}`
    const disposition = download ? `attachment; filename="${name}"` : `inline; filename="${name}"`
    const cache = 'public, max-age=3600'
    if (kind === 'svg') {
        return new Response(jawafQrSvg(bot.slug), { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Content-Disposition': disposition, 'Cache-Control': cache } })
    }
    const scale = Math.min(32, Math.max(4, Number(url.searchParams.get('scale')) || 16))
    const png = await jawafQrPng(bot.slug, scale)
    return new Response(png.slice().buffer as ArrayBuffer, { headers: { 'Content-Type': 'image/png', 'Content-Disposition': disposition, 'Cache-Control': cache } })
}

async function image(slug: string, segments: string[]): Promise<Response> {
    const bot = await botOr404(slug)
    const key = segments.join('/')
    if (!key || key.includes('..') || !publicImageKeys(bot).has(key)) throw new AppError('notfound', 'That image could not be found.')
    if (!isStorageConfigured()) throw new AppError('notfound', 'That image could not be found.')
    const signed = await getDownloadUrl(key, 600)
    return new Response(null, { status: 302, headers: { location: signed, 'cache-control': 'public, max-age=300' } })
}

export async function POST(req: Request, { params }: Ctx): Promise<Response> {
    const { slug, path } = await params
    try {
        const [first] = path
        if (path.length === 1) {
            if (first === 'ask') return await ask(req, slug)
            if (first === 'contact') return await contact(req, slug)
            if (first === 'rate') return await rate(req, slug)
            if (first === 'speech') return await speech(req, slug)
            if (first === 'reset') return reset(req, slug)
        }
        return Response.json({ success: false, error: 'Not found', kind: 'notfound' }, { status: 404 })
    } catch (err) {
        return errorResponse(err, 'jawaf.public')
    }
}

export async function GET(req: Request, { params }: Ctx): Promise<Response> {
    const { slug, path } = await params
    try {
        const [first, ...rest] = path
        if (path.length === 1 && first === 'qr.svg') return await qr(req, slug, 'svg')
        if (path.length === 1 && first === 'qr.png') return await qr(req, slug, 'png')
        if (first === 'image' && rest.length) return await image(slug, rest)
        return Response.json({ success: false, error: 'Not found', kind: 'notfound' }, { status: 404 })
    } catch (err) {
        return errorResponse(err, 'jawaf.public')
    }
}
