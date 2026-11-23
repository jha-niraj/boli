"use client"

import type { CheckoutStart } from "@repo/payments"

/**
 * Hands the browser to the gateway, the way that gateway starts:
 * - redirect (Khalti, Stripe): a top-level navigation;
 * - form (eSewa): a hidden form POSTed top-level (eSewa has no JSON initiate - the signed fields ARE the request);
 * - script (Razorpay checkout.js, Cashfree JS SDK): loaded from the gateway's CDN at runtime (a bundled copy is not
 *   supported by either), then opened; both send the buyer back to our return endpoint themselves.
 * Resolves when the hand-over started; rejects with a sentence when it could not.
 */

declare global {
    interface Window {
        Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, cb: () => void) => void }
        Cashfree?: (config: { mode: string }) => {
            checkout: (opts: { paymentSessionId: string; redirectTarget?: string }) => Promise<{ error?: { message?: string } } | void>
            subscriptionsCheckout: (opts: { subsSessionId: string; redirectTarget?: string }) => Promise<{ error?: { message?: string } } | void>
        }
    }
}

function loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[data-gateway="${src}"]`)) return resolve()
        const el = document.createElement("script")
        el.src = src
        el.async = true
        el.dataset.gateway = src
        el.onload = () => resolve()
        el.onerror = () => reject(new Error("The payment window could not be loaded. Check your connection and try again."))
        document.head.appendChild(el)
    })
}

export async function launchCheckout(start: CheckoutStart, opts: { onDismiss: () => void }): Promise<void> {
    if (start.type === "redirect") {
        window.location.assign(start.url)
        return
    }
    if (start.type === "form") {
        const form = document.createElement("form")
        form.method = "POST"
        form.action = start.action
        for (const [name, value] of Object.entries(start.fields)) {
            const field = document.createElement("input")
            field.type = "hidden"
            field.name = name
            field.value = value
            form.appendChild(field)
        }
        document.body.appendChild(form)
        form.submit()
        return
    }
    await loadScript(start.src)
    if (start.provider === "razorpay") {
        if (!window.Razorpay) throw new Error("The payment window could not be loaded. Try again.")
        const rzp = new window.Razorpay({ ...start.options, modal: { ondismiss: opts.onDismiss } })
        rzp.open()
        return
    }
    if (!window.Cashfree) throw new Error("The payment window could not be loaded. Try again.")
    const o = start.options
    const cf = window.Cashfree({ mode: String(o.mode) })
    const r = typeof o.subsSessionId === "string"
        ? await cf.subscriptionsCheckout({ subsSessionId: o.subsSessionId, redirectTarget: "_self" })
        : await cf.checkout({ paymentSessionId: String(o.paymentSessionId), redirectTarget: "_self" })
    if (r && r.error) throw new Error(r.error.message || "Cashfree could not open the payment page. Try again.")
}
