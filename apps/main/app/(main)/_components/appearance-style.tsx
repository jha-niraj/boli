import type { AppearancePrefs } from "@/lib/settings-values"

/**
 * The account's density and motion prefs as plain CSS, rendered by the server layout so the very first frame is right
 * (no flash of the comfortable size). Renders nothing for the defaults.
 *
 * - Compact: the root font-size drops to 15px, so every rem-based size (text, spacing, controls) shrinks with it.
 * - Reduce motion: animations and transitions stop, the same as the device's prefers-reduced-motion.
 */
const COMPACT = "html{font-size:15px}"
const STILL = "*,*::before,*::after{animation-duration:0.01ms!important;animation-iteration-count:1!important;transition-duration:0.01ms!important;scroll-behavior:auto!important}" +
    // Boli's loaders (components/loaders/loaders.css) rest on a frame that reads, not on their last keyframe (a faded mark).
    ".bl-thread,.bl-f1-path{stroke-dashoffset:0!important;opacity:1!important}.bl-thread-dot,.bl-f1-dot{transform:scale(1)!important;opacity:1!important}" +
    ".bl-f1-ring,.bl-say-dots{opacity:0!important}.bl-say-word,.bl-dot3,.bl-dot8,.bl-type,.bl-float,.bl-enter{opacity:1!important}"

export function AppearanceStyle({ prefs }: { prefs: AppearancePrefs }) {
    const css = `${prefs.density === "compact" ? COMPACT : ""}${prefs.reducedMotion ? STILL : ""}`
    if (!css) return null
    return <style data-app-appearance="" dangerouslySetInnerHTML={{ __html: css }} />
}
