// The ONE payments route (a dispatcher beats a route.ts per gateway - Worker size). Every provider's URLs:
//
//   POST /api/payments/<provider>/webhook            signed server-to-server notices (stripe, razorpay, cashfree)
//   GET  /api/payments/<provider>/return/<paymentId> the buyer comes back (esewa ?data=, khalti ?pidx=, stripe
//   POST /api/payments/<provider>/return/<paymentId>   ?session_id=, cashfree ?order_id=; razorpay POSTs a form)
//   GET  /api/payments/<provider>/cancel/<paymentId> the buyer cancelled (eSewa failure_url, Stripe cancel_url)
//
// Our payment id rides in the PATH because eSewa appends `?data=` even to a URL that already has a query.
// A return is only a hint: confirmPayment asks the gateway server to server before anything is applied, and then the
// browser goes to /checkout/<paymentId>, which shows the result. Webhooks: the signature is checked over the RAW body,
// the event is stored once (payment_event, unique provider + event id), then applied - idempotently, because a webhook
// and a return racing on the same payment must apply it ONCE. A bad signature -> 401 (nothing stored), a handler
// failure -> 500 (the gateway redelivers; the stored row is retried), a duplicate -> 200.
//
// The old /api/webhooks/stripe route is folded in here: point Stripe at /api/payments/stripe/webhook.
import { applyWebhookNotices, confirmPayment, markCancelled } from '@repo/billing'
import { errorResponse } from '@repo/errors'
import { getProvider, isProviderId, markPaymentEvent, PaymentError, recordPaymentEvent, type WebhookResult } from '@repo/payments'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ provider: string; action: string[] }> }

const json = (status: number, body: Record<string, unknown>) => Response.json(body, { status })

/** Where the browser lands: the result page, never a URL built from the gateway's query. 303 turns a POST into a GET. */
function toResult(request: Request, paymentId: string, extra?: Record<string, string>): Response {
    const url = new URL(`/checkout/${encodeURIComponent(paymentId)}`, request.url)
    for (const [k, v] of Object.entries(extra ?? {})) url.searchParams.set(k, v)
    return Response.redirect(url.toString(), 303)
}

/** Query params plus, for a form POST (Razorpay's callback), the form fields. */
async function readParams(request: Request): Promise<Record<string, string>> {
    const out: Record<string, string> = {}
    new URL(request.url).searchParams.forEach((v, k) => { out[k] = v })
    if (request.method === 'POST') {
        const type = request.headers.get('content-type') ?? ''
        if (type.includes('application/x-www-form-urlencoded') || type.includes('multipart/form-data')) {
            const form = await request.formData().catch(() => null)
            form?.forEach((v, k) => { if (typeof v === 'string') out[k] = v })
        }
    }
    return out
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function handleReturn(request: Request, providerId: string, paymentId: string | undefined): Promise<Response> {
    if (!isProviderId(providerId)) return json(404, { success: false, error: 'Unknown payment provider' })
    const provider = getProvider(providerId)
    const params = await readParams(request)
    const hint = await provider.parseReturn(params).catch(() => null)
    const id = paymentId && UUID.test(paymentId) ? paymentId : hint?.paymentId && UUID.test(hint.paymentId) ? hint.paymentId : null
    if (!id) return Response.redirect(new URL('/billing', request.url).toString(), 303)
    if (hint?.cancelled) {
        await markCancelled(providerId, id).catch(() => null)
        return toResult(request, id)
    }
    try {
        // Inline: the buyer waits a second or two for the gateway's answer, then sees the result.
        await confirmPayment(providerId, id, hint)
        return toResult(request, id)
    } catch (err) {
        console.error(`[payments:${providerId}] return verify failed for ${id}:`, err instanceof Error ? err.message : err)
        // The result page says "we could not confirm it yet" and offers Check again (and the webhook may still land).
        return toResult(request, id, { verify: err instanceof PaymentError && err.code === 'signature' ? 'signature' : 'later' })
    }
}

async function handleCancel(request: Request, providerId: string, paymentId: string | undefined): Promise<Response> {
    if (!isProviderId(providerId) || !paymentId || !UUID.test(paymentId)) return Response.redirect(new URL('/billing', request.url).toString(), 303)
    await markCancelled(providerId, paymentId).catch(() => null)
    return toResult(request, paymentId)
}

async function handleWebhook(request: Request, providerId: string): Promise<Response> {
    if (!isProviderId(providerId)) return json(404, { success: false, error: 'Unknown payment provider' })
    const provider = getProvider(providerId)
    if (!provider.handleWebhook) return json(404, { success: false, error: `${provider.label} sends no webhooks` })
    if (!provider.isConfigured()) return json(503, { success: false, error: `${provider.label} is not configured` })

    let result: WebhookResult
    try {
        result = await provider.handleWebhook(request)
    } catch (err) {
        if (err instanceof PaymentError && (err.code === 'signature' || err.code === 'invalid')) {
            console.warn(`[payments:${providerId}] webhook rejected: ${err.message}`)
            return json(401, { success: false, error: err.message })
        }
        return errorResponse(err)
    }

    let stored: { id: string; duplicate: boolean }
    try {
        stored = await recordPaymentEvent({ provider: providerId, eventId: result.eventId, type: result.type, livemode: result.livemode, payload: result.payload })
    } catch (err) {
        return errorResponse(err)
    }
    if (stored.duplicate) return json(200, { received: true, duplicate: true })
    try {
        const status = result.notices.length ? await applyWebhookNotices(providerId, result.notices) : 'ignored'
        await markPaymentEvent(stored.id, status)
        return json(200, { received: true, handled: status === 'processed' })
    } catch (err) {
        await markPaymentEvent(stored.id, 'failed', err instanceof Error ? err.message : String(err)).catch(() => undefined)
        return errorResponse(err)
    }
}

async function dispatch(request: Request, ctx: Ctx): Promise<Response> {
    const { provider, action } = await ctx.params
    const [verb, id] = action
    if (verb === 'webhook' && request.method === 'POST') return handleWebhook(request, provider)
    if (verb === 'return') return handleReturn(request, provider, id)
    if (verb === 'cancel') return handleCancel(request, provider, id)
    return json(404, { success: false, error: 'Not found' })
}

export const GET = dispatch
export const POST = dispatch
