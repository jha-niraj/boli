/** The /design tabs. A plain module (not "use client") so the server page can validate `?tab=` with it. */
export const DESIGN_TABS = [
    { value: "final", label: "Final" },
    { value: "art", label: "Art" },
    { value: "screens", label: "Screens" },
] as const

export type DesignTab = (typeof DESIGN_TABS)[number]["value"]

export function isDesignTab(v: string | undefined): v is DesignTab {
    return DESIGN_TABS.some((t) => t.value === v)
}
