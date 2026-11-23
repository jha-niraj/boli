// @repo/legal - the documents, as code: versioned markdown with an effective date. Pure (no database), safe anywhere.
//
// Boli's terms and privacy policy (plan/main/platform/platform-v0.md, task D3). DRAFTS: `template: true` until a lawyer
// has reviewed them, and the pages show "Draft - to be reviewed by a lawyer before launch" while it is true.
//
// Versioning: bump `version` (an ISO date) ONLY for a material change - every signed-in user is then asked to accept
// again (`needsAcceptance`). Fix a typo without bumping.

export interface LegalContext {
    /** Product name as shown to users. */
    productName: string
    /** The product's public URL (no trailing slash). */
    siteUrl: string
    /** Where people write about privacy and terms. */
    contactEmail: string
    /** The legal entity that operates the product. */
    companyName?: string
    /** Platform facts the documents quote (Boli: from apps/main/lib/boli.ts), so the text never retypes a number. */
    platform?: {
        /** Free credits granted once on email verification. */
        welcomeCredits: number
        /** Requests per minute per account. */
        rateLimitPerMin: number
        /** Ways to pay, e.g. "eSewa or Khalti". */
        paymentMethods: string
    }
}

export const LEGAL_DOCUMENT_SLUGS = ['terms', 'privacy'] as const
export type LegalDocumentSlug = (typeof LEGAL_DOCUMENT_SLUGS)[number]

export interface LegalDocumentMeta {
    slug: LegalDocumentSlug
    title: string
    /** ISO date string - also the version a user accepts. */
    version: string
    /** When this version takes effect (ISO date). */
    effectiveDate: string
    /** One line for metadata and the acceptance prompt. */
    summary: string
    /** The app path the document lives at. */
    path: string
    /** True while the text is a draft that a lawyer has not reviewed. The pages show a notice while it is true. */
    template: boolean
}

export interface LegalDocument extends LegalDocumentMeta {
    /** Markdown: `## ` sections, paragraphs, `- ` bullets, `**bold**`, links. */
    markdown: string
}

const META: Record<LegalDocumentSlug, LegalDocumentMeta> = {
    terms: {
        slug: 'terms',
        title: 'Terms of Service',
        version: '2026-11-24',
        effectiveDate: '2026-11-24',
        summary: 'The rules for using Boli - accounts, credits and payments, acceptable use, API keys and AI output.',
        path: '/terms',
        template: true,
    },
    privacy: {
        slug: 'privacy',
        title: 'Privacy Policy',
        version: '2026-11-24',
        effectiveDate: '2026-11-24',
        summary: 'What Boli collects, why, how long we keep it, and your choices. API calls keep metadata only.',
        path: '/privacy',
        template: true,
    },
}

function operator(ctx: LegalContext): string {
    return ctx.companyName ? `${ctx.companyName} ("we", "us", "our")` : `the operators of ${ctx.productName} ("we", "us", "our")`
}

function welcome(ctx: LegalContext): string {
    return ctx.platform ? `${ctx.platform.welcomeCredits} free credits` : 'free credits'
}

function payWith(ctx: LegalContext): string {
    return ctx.platform ? ctx.platform.paymentMethods : 'the payment methods shown at checkout'
}

function rateLimit(ctx: LegalContext): string {
    return ctx.platform ? `${ctx.platform.rateLimitPerMin} requests per minute per account` : 'the limits published in the docs'
}

const BODY: Record<LegalDocumentSlug, (ctx: LegalContext) => string> = {
    terms: (ctx) => `
These terms are an agreement between you and ${operator(ctx)}, the operator of ${ctx.productName} at ${ctx.siteUrl}. ${ctx.productName} runs open AI models and offers them two ways: a chat in the browser (Kura) and an API you call from your own software. By creating an account, or by using the service or an API key, you accept these terms.

## 1. Who can use ${ctx.productName}

- You must be at least 16 years old, and old enough to enter a contract where you live.
- If you use ${ctx.productName} for a company or organisation, you confirm you may accept these terms for it, and "you" includes it.
- You must give accurate details when you sign up and keep your email address current. We send receipts and important notices there.

## 2. Your account

- One person per account. Do not share your password.
- You are responsible for everything done through your account and its API keys.
- Tell us at ${ctx.contactEmail} straight away if you think someone else has used your account or a key.

## 3. Credits and payments

- ${ctx.productName} is pay as you go. You buy **credits** and spend them on use. **One credit is worth one Nepali rupee (NPR 1).** Prices are in NPR only.
- New accounts receive ${welcome(ctx)}, once, when the email address is verified. Free credits have no cash value.
- Each request to a model costs credits for the tokens it reads (input) and writes (output), at the per-million-token prices published on our pricing page and in the docs. Tokens the model spends "thinking" are counted as output. Kura and the API cost the same.
- You can add credits at any time and pay with ${payWith(ctx)}. The payment provider processes your payment; we do not see or store your wallet or card details.
- **Credits never expire.** They are not transferable between accounts and cannot be exchanged for cash.
- **Refunds.** Used credits are not refunded. If you were charged twice, or credits you paid for never arrived, write to us within 30 days and we will put it right. Unused purchased credits may be refunded at our discretion, or where the law requires it.
- When your balance reaches zero, API requests are refused (HTTP 402) and Kura asks you to add credits. A request already running is allowed to finish, and its cost may take your balance slightly below zero; the next top-up covers it.
- We may change prices. A change applies to requests made after it is published, never to credits you already hold.

## 4. API keys

- You create API keys in your account. A key is shown **once**, when you create it. We store only a fingerprint of it, so we cannot show it again; if you lose one, revoke it and create another.
- Keep keys secret. Do not put them in public code, in an app people can download, or in a web page. Anyone with your key can spend your credits.
- You are responsible for all use made with your keys until you revoke them. Revoking a key takes effect immediately.

## 5. Acceptable use

You must not use ${ctx.productName}, its models or their output to:

- break the law of Nepal or of the place you are in, or help anyone else do so;
- create or spread content that sexualises minors, incites violence or hatred against people for who they are, harasses or threatens a person, or invades someone's privacy;
- deceive people: impersonate a real person or organisation, run scams or phishing, or pass AI output off as human where that misleads people to their harm;
- write malware or attack computer systems;
- make decisions with legal or similarly significant effects on people (credit, hiring, housing, medical or legal advice) without a qualified human reviewing them;
- abuse the service: get around rate limits or credit checks, share or resell accounts or keys, probe or overload our systems, scrape the service, or use it to train a competing model without our written permission.

We apply a rate limit of ${rateLimit(ctx)}, shared by your keys and Kura. Requests over the limit are refused (HTTP 429) and may be retried after the time we return.

We may suspend a key or an account that breaks this section, and where we reasonably can we will tell you why.

## 6. Your content and AI output

- **Your input** (prompts and messages) and **the output** the model returns for you are yours, as far as the law allows. We do not claim ownership of either.
- You give us the permission we need to process your input and return the output, and, for Kura, to store your conversations so you can see them again. The Privacy Policy explains what we keep.
- You are responsible for your input: you must have the right to send it to us.

## 7. AI output can be wrong

The models are small open models. They make mistakes: wrong facts, invented details, grammar errors, words from another language. **Check output before you rely on it**, and do not use it as a substitute for professional medical, legal, financial or safety advice. The same input can give different output, and other users can get similar output to yours.

## 8. Availability and changes

We work to keep ${ctx.productName} available but do not promise it will be uninterrupted or error-free. Models can be unavailable (HTTP 503), replaced by better versions under the same model name, or retired with notice in the docs. We may change features at any time.

## 9. Ending your account

You can delete your account at any time from your profile. Deleting it revokes your keys, erases your data as the Privacy Policy describes, and forfeits any credits left. We may suspend or close an account that seriously or repeatedly breaks these terms, or where the law requires it.

## 10. Disclaimers and liability

${ctx.productName} is provided "as is" and "as available". To the extent the law allows, we are not liable for indirect, incidental or consequential losses, lost profits or lost data, and our total liability for any claim is limited to the amount you paid us in the 12 months before it. Nothing in these terms limits liability that cannot be limited by law.

## 11. Law and disputes

These terms are governed by the laws of Nepal. Before going to court, write to us at ${ctx.contactEmail} and give us 30 days to resolve the issue. Disputes that remain go to the competent courts of Kathmandu, Nepal.

## 12. Changes to these terms

We may update these terms. For a material change we will tell you by email or in the app, and ask you to accept the new version before you continue. The date at the top shows the current version.

## 13. Contact

Questions about these terms: ${ctx.contactEmail}.
`,
    privacy: (ctx) => `
This policy explains what ${operator(ctx)} collects when you use ${ctx.productName}, why, how long we keep it, and the choices you have. The short version: **we store your Kura conversations for you, but for API calls we keep metadata only - never your prompts or the answers.** We do not sell personal data and we do not show ads.

## 1. What we collect

**Account details**

- Your name, email address and password (stored only as a one-way hash, never in readable form).
- If you sign in with Google: your name, email address and profile picture from Google.
- Your answers to the optional onboarding questions (what you plan to build, the languages your users write in, your role and team size).

**Kura conversations**

- The messages you send in Kura, the model's replies and your chat settings (system prompt, temperature and similar). We store these so you can see and continue your conversations.

**API calls - metadata only**

For each API request we record: the time, the API key used (its name and first characters, not the key), the model, the number of input, output and thinking tokens, the cost in credits, how long it took, and whether it succeeded or which error it returned. **We do not store the content of API requests or responses.** The content passes through our servers and the model, and is discarded once the response is sent.

**Payments**

- Your credit purchases and balance history. The payment provider (eSewa or Khalti) processes the payment itself; we receive a confirmation and a reference, not your wallet password or card details.

**Messages you send us**

- What you write in the contact form or the feedback form, with your name and email, so we can reply.

**Security and technical data**

- Sign-in times, IP address, browser and device type, kept with your sessions to protect your account and to enforce rate limits.

## 2. Why we use it

- To run the service: sign you in, answer your requests, show your history, usage and balance.
- To bill you correctly and keep the records the law requires.
- To keep the service safe: stop abuse, enforce limits, investigate problems.
- To reply when you contact us.
- To improve ${ctx.productName}, using aggregated numbers (for example, how many tokens are used per day) that do not identify you.

We do **not** use your Kura conversations or API content to train models unless you explicitly opt in to a future programme that asks you first.

## 3. Who we share it with

Only the providers that run the service for us, each bound to protect the data and use it only for us:

- hosting and database providers, where the service and its data run;
- the servers that run the open models, which process your input to produce the output and do not keep it;
- email delivery, for sign-in codes, receipts and notices;
- payment providers (eSewa, Khalti), for purchases.

We disclose data to authorities only when Nepali law requires it, and we will tell you when we are allowed to. We do not sell personal data.

## 4. How long we keep it

- **Account details:** while your account exists.
- **Kura conversations:** until you delete them, or your account.
- **API metadata:** while your account exists, so your usage history stays complete.
- **Payment records:** for as long as tax and accounting law requires, even after the account is deleted.
- **Contact messages:** up to 2 years after the conversation ends.
- **Security logs:** up to 90 days.

## 5. Deleting your account

You can delete your account from your profile at any time. We then erase your profile, sessions, API keys, Kura conversations, usage metadata and uploaded files. We keep a minimal record that the erasure happened and any payment records the law requires. Remaining credits are forfeited.

## 6. Your choices and rights

- See and change your details on your profile.
- Delete any Kura conversation, or your whole account.
- Ask us for a copy of your data, to correct it, or to delete it, at ${ctx.contactEmail}. We answer within 30 days.

## 7. Cookies

We use only the cookies the service needs: one to keep you signed in, and a few to remember settings such as the theme and whether the sidebar is open. We do not use advertising or cross-site tracking cookies.

## 8. Security

Passwords are hashed, API keys are stored only as fingerprints, and connections are encrypted (HTTPS). No system is perfectly secure; if a breach affects your data, we will tell you without undue delay.

## 9. Children

${ctx.productName} is not for children under 16. If you believe a child has given us data, write to us and we will delete it.

## 10. Changes

We may update this policy. For a material change we will tell you by email or in the app and ask you to accept the new version. The date at the top shows the current version.

## 11. Contact

Privacy questions and requests: ${ctx.contactEmail}.
`,
}

/** Every document's metadata (current versions), no text. */
export function listLegalDocuments(): LegalDocumentMeta[] {
    return LEGAL_DOCUMENT_SLUGS.map((s) => META[s])
}

/** The current version string of a document. */
export function currentVersion(slug: LegalDocumentSlug): string {
    return META[slug].version
}

export function isLegalDocumentSlug(value: string): value is LegalDocumentSlug {
    return (LEGAL_DOCUMENT_SLUGS as readonly string[]).includes(value)
}

/** One document, filled in with the product's details. */
export function getLegalDocument(slug: LegalDocumentSlug, ctx: LegalContext): LegalDocument {
    return { ...META[slug], markdown: BODY[slug](ctx).trim() }
}
