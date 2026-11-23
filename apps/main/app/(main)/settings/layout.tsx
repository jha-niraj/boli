import { SettingsRail, SettingsSelect } from "./_components/settings-nav"

/**
 * The Settings hub: a section rail on the left (desktop) or one Select on top (below lg), and the section's own `Page`
 * * beside it. Every section renders a `Page`; this layout never awaits data. (Billing and Usage moved to /billing, /usage.)
 *
 * Below lg the Select takes 3rem (2.25rem + the 0.75rem gap), so the column publishes `--app-col-h` that much shorter
 * and the section Page (which takes `--app-col-h` when set) still ends at the shell's bottom with a fixed header.
 */
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-[var(--app-page-h)] w-full min-w-0 flex-col gap-3 overflow-hidden lg:flex-row lg:gap-6">
            <SettingsRail />
            <SettingsSelect />
            <div className="flex min-h-0 min-w-0 flex-1 flex-col [--app-col-h:calc(var(--app-page-h)_-_3rem)] lg:[--app-col-h:var(--app-page-h)]">
                {children}
            </div>
        </div>
    )
}
