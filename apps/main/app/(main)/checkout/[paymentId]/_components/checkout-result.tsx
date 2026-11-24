"use client"

import type { PaymentView } from "@repo/billing"
import { AppLink } from "@repo/ui/components/app-link"
import { Button } from "@repo/ui/components/ui/button"
import { Page } from "@repo/ui/components/ui/page"
import { PaymentResultCard } from "@/components/platform/payment-result"
import { ROUTES } from "@/lib/navigation"
import { RESULT_DESCRIPTION, RESULT_TITLE } from "./checkout-result-skeleton"

/**
 * The full-page payment result, where the gateways return (/checkout/<id>). The card itself is shared with the
 * payment sheet on Billing (`components/platform/payment-result.tsx`).
 */
export function CheckoutResult({ initial, mismatch, verifyNote }: { initial: PaymentView; mismatch: boolean; verifyNote: "signature" | "later" | null }) {
    return (
        <Page title={RESULT_TITLE} description={RESULT_DESCRIPTION} back={{ href: ROUTES.billing, label: "Billing" }} body="page">
            <PaymentResultCard
                framed
                initial={initial}
                mismatch={mismatch}
                verifyNote={verifyNote}
                primary={(view) => (
                    <Button asChild className="cursor-pointer">
                        <AppLink href={view === "success" || view === "verifying" ? ROUTES.billing : `${ROUTES.billing}?tab=plans`}>
                            {view === "success" ? "Back to billing" : view === "verifying" ? "Billing" : "Try again"}
                        </AppLink>
                    </Button>
                )}
            />
        </Page>
    )
}
