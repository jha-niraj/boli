/**
 * The shared surfaces of the app shell, as constants so the rail, a right column and the phone bar cannot drift
 * apart (each panel writing its own background by hand drifted once - two shades of white side by side).
 *
 * The shell is FLUSH and SQUARE: no rounded frame, no hairline. Chrome separates from the page by a soft shadow
 * (owner, 2026-11-23: "the hairline was not looking good").
 */

/**
 * The rail and any full-height right column: the SAME ground as the page in both themes (owner, 2026-11-24: a rail one
 * step lighter than the page read as two blacks with a seam). Only the soft shadow below separates them - no border.
 * Dark mode: a black edge + dense shadow read as a dark stripe (owner, 2026-11-24), so dark uses a barely-there light
 * edge and a wide, faint shadow instead.
 */
export const SHELL_SURFACE = "bg-white dark:bg-[#121314]"

/** The soft shadow a left rail casts onto the page (to its right). */
export const SHELL_SHADOW_LEFT = "shadow-[1px_0_0_rgba(0,0,0,0.03),6px_0_24px_-12px_rgba(0,0,0,0.12)] dark:shadow-[1px_0_0_rgba(255,255,255,0.035),12px_0_36px_-18px_rgba(0,0,0,0.5)]"

/** The soft shadow a right column casts onto the page (to its left). */
export const SHELL_SHADOW_RIGHT = "shadow-[-1px_0_0_rgba(0,0,0,0.03),-6px_0_24px_-12px_rgba(0,0,0,0.12)] dark:shadow-[-1px_0_0_rgba(255,255,255,0.035),-12px_0_36px_-18px_rgba(0,0,0,0.5)]"

/** The phone bottom bar's shadow, cast upwards. */
export const SHELL_SHADOW_TOP = "shadow-[0_-1px_0_rgba(0,0,0,0.04),0_-6px_20px_-12px_rgba(0,0,0,0.14)] dark:shadow-[0_-1px_0_rgba(255,255,255,0.035),0_-12px_32px_-18px_rgba(0,0,0,0.5)]"

/** The page canvas behind every page. */
export const PAGE_GROUND = "bg-white dark:bg-[#121314]"

/**
 * The raised thin-shadow surface with no padding: sections sit on a very thin shadow instead of a hairline. Same
 * tone as `PANEL` in components/ui/section-panel.tsx, for frames that pad themselves (a table's ScrollArea, a list).
 */
export const SURFACE =
    "rounded-xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.04] dark:bg-neutral-900 dark:shadow-[0_1px_2px_rgba(0,0,0,0.5)] dark:ring-white/[0.06]"
