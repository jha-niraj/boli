/**
 * Where a signed-in person lands (plan/main/jawaf/jawaf-v1.md: "After sign-in: the last product used"). A plain module
 * with no icons or React, because middleware.ts imports it (the edge bundle stays small).
 *
 * The shell writes LAST_PRODUCT_COOKIE whenever a live product's page is open (main-shell.tsx). `/` - and so every
 * sign-in, whose default returnTo is `/` - goes to that product's home; a browser with no cookie goes to /start
 * ("Choose where to start").
 */
export const LAST_PRODUCT_COOKIE = "boli_last_product"

/** The live products a person can land on, and their homes. Soon products are never a landing. */
export const LANDING_HOMES = {
    kura: "/kura",
    api: "/api",
    jawaf: "/jawaf",
} as const

export type LandingProductId = keyof typeof LANDING_HOMES

/** The "Choose where to start" page, for a browser with no last product. */
export const START_ROUTE = "/start"

export function isLandingProduct(value: string | null | undefined): value is LandingProductId {
    return !!value && Object.prototype.hasOwnProperty.call(LANDING_HOMES, value)
}

/** The landing for a cookie value: the last product's home, else /start. */
export function landingFor(cookieValue: string | null | undefined): string {
    return isLandingProduct(cookieValue) ? LANDING_HOMES[cookieValue] : START_ROUTE
}
