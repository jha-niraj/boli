/**
 * Font stacks for /design. T1 (owner pick): Fraunces with the SOFT axis for display, Instrument Sans for everything
 * else - fontsource woff2 files loaded by app/design/layout.tsx only. Mono is the app's own next/font/local variable.
 */
export const FACE = {
    fraunces: '"Fraunces Variable", Georgia, serif',
    instrumentSans: '"Instrument Sans Variable", system-ui, sans-serif',
    mono: "var(--font-geist-mono), ui-monospace, monospace",
} as const
