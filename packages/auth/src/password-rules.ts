/**
 * The password rules (owner, 2026-11-24): the sign-up / reset / change-password checklist AND the server enforce the
 * same list, so a request that skips the form cannot set a weaker password. Framework-free: used by the auth-kit UI and
 * by the better-auth `before` hook in server.ts.
 */
export const PASSWORD_RULES: readonly { key: string; label: string; test: (pw: string) => boolean }[] = [
    { key: 'length', label: '8 characters', test: (p) => p.length >= 8 && p.length <= 128 },
    { key: 'number', label: 'At least 1 number', test: (p) => /[0-9]/.test(p) },
    { key: 'case', label: 'Upper and lower case', test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
]

export function passwordMeetsRules(pw: string): boolean {
    return PASSWORD_RULES.every((r) => r.test(pw))
}

/** The sentence a rejected password gets, naming what is missing. */
export function passwordRuleMessage(pw: string): string | null {
    const missing = PASSWORD_RULES.filter((r) => !r.test(pw)).map((r) => r.label.toLowerCase())
    return missing.length ? `Your password needs: ${missing.join(', ')}.` : null
}
