/**
 * Home's "Get started" card can be hidden. The choice is remembered per person in a cookie whose value is the user id
 * (a second account on the same browser still sees its own card); it lasts a year. No table: it is a preference about
 * one card, and losing it only shows the card again.
 */
export const GET_STARTED_COOKIE = "boli_getstarted_hidden"
export const GET_STARTED_MAX_AGE = 60 * 60 * 24 * 365

/** Whether the cookie hides the card for this person. */
export function getStartedHidden(cookieValue: string | undefined, userId: string): boolean {
    return !!cookieValue && cookieValue.split(",").includes(userId)
}
